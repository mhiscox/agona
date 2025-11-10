// src/app/api/query/route.js
export const runtime = "nodejs";

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

/* ========= ENV ========= */
const {
  OPENAI_API_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  CF_ACCOUNT_ID,
  CF_API_TOKEN,
  CF_MODEL = "@cf/meta/llama-3.1-8b-instruct",            // primary CF model
  CF_ALT_MODEL = "@cf/mistral/mistral-7b-instruct-v0.1",           // alt CF model
  PROVIDER_TIMEOUT_MS = "8000",                             // per-provider timeout (ms)
} = process.env;

/* ========= CLIENTS ========= */
let openaiClient;
function getOpenAIClient() {
  if (openaiClient !== undefined) return openaiClient;
  if (!OPENAI_API_KEY) {
    openaiClient = null;
    return openaiClient;
  }
  openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
  return openaiClient;
}

let supabaseClient;
function getSupabaseClient() {
  if (supabaseClient !== undefined) return supabaseClient;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = null;
    return supabaseClient;
  }
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseClient;
}

/* ========= CONSTANTS / HELPERS ========= */
const BRAND_SYSTEM = `
You answer on behalf of Agona: a real-time LLM bidding marketplace where multiple foundation models compete on price, latency, and quality to answer API calls.
If unsure, say "I don't know." Reply in one concise sentence only.
`.trim();

// USD per 1M tokens (rough). Tune as you learn real rates.
const PRICES = {
  "openai:gpt-4o-mini":          { in: 0.15, out: 0.60 },
  "cf:llama-3.1-8b-instruct":    { in: 0.03, out: 0.10 }, // non-zero CF rates
  "cf:mistral-7b-instruct-v0.1":      { in: 0.03, out: 0.08 },
};

const TIMEOUT_MS = Number(PROVIDER_TIMEOUT_MS) || 8000;

function approxTokens(s = "") { return Math.ceil(s.length / 4); }
function round6(n) { return n == null ? n : +n.toFixed(6); }
function per1k(n) { return n == null ? null : +Number(n * 1000).toFixed(6); }

function estimatePriceUSD(id, inputTok, outputTok) {
  const key = Object.keys(PRICES).find((k) => id.startsWith(k));
  if (!key) return 0;
  const { in: inPerM, out: outPerM } = PRICES[key];
  return (inputTok / 1e6) * inPerM + (outputTok / 1e6) * outPerM;
}

async function timed(fn) {
  const t0 = Date.now();
  const res = await fn();
  return { ...res, latency_ms: Date.now() - t0 };
}

function onBrand(text = "") {
  const s = text.toLowerCase();
  const must = s.includes("llm") || s.includes("language model") || s.includes("model");
  const hits = ["price", "latency", "quality", "cost", "speed"].filter((k) => s.includes(k)).length;
  return must && hits >= 2;
}

function score(p) {
  let s = 0;
  if (p.ok) s += 1;
  if ((p.answer || "").length > 30) s += 1;
  if ((p.latency_ms ?? 9e9) < 3000) s += 0.5;
  if (typeof p.price_usd === "number" && p.price_usd <= 0.0002) s += 0.5; // prefer cheaper
  return s;
}

function pickWinner(cands) {
  const arr = [...cands].sort((a, b) => b.score - a.score);
  const topScore = arr[0]?.score ?? -1;
  let top = arr.filter((c) => c.score === topScore);
  if (top.length === 1) return top[0];
  // tie-break 1: lowest price
  const priced = top.filter((c) => typeof c.price_usd === "number");
  if (priced.length) {
    priced.sort((a, b) => a.price_usd - b.price_usd);
    const best = priced.filter((c) => c.price_usd === priced[0].price_usd);
    if (best.length === 1) return best[0];
    top = best;
  }
  // tie-break 2: lowest latency
  top.sort((a, b) => (a.latency_ms ?? 9e9) - (b.latency_ms ?? 9e9));
  return top[0];
}

/* === Fetch with timeout & single retry helper === */
async function fetchWithTimeout(url, opts, timeoutMs = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error("Timeout")), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function withRetry(fn, attempts = 2, backoffMs = 600) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

/* ========= PROVIDERS ========= */
async function callOpenAI(prompt) {
  const client = getOpenAIClient();
  if (!client) {
    return {
      id: "openai:gpt-4o-mini",
      model_id: "gpt-4o-mini",
      answer: "",
      ok: false,
      latency_ms: 0,
      error: "Missing OPENAI_API_KEY",
    };
  }
  return timed(async () => {
    const resp = await withRetry(
      () =>
        client.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0,
          messages: [
            { role: "system", content: BRAND_SYSTEM },
            { role: "user", content: prompt },
          ],
        }),
      2,
      400
    );
    const answer = resp?.choices?.[0]?.message?.content || "";
    return { id: "openai:gpt-4o-mini", model_id: resp?.model, answer, ok: !!answer };
  });
}

async function callCloudflareGeneric(prompt, modelSlug, idLabel) {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return {
      id: idLabel.replace("@cf/", "cf:"),
      model_id: modelSlug,
      answer: "",
      ok: false,
      latency_ms: 0,
      error: "Missing CF_ACCOUNT_ID or CF_API_TOKEN",
    };
  }
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${modelSlug}`;
  return timed(async () => {
    try {
      const res = await withRetry(
        () =>
          fetchWithTimeout(
            endpoint,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${CF_API_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messages: [
                  { role: "system", content: BRAND_SYSTEM },
                  { role: "user", content: prompt },
                ],
                input: prompt,
              }),
            },
            TIMEOUT_MS
          ),
        2,
        500
      );

      const json = await res.json();
      if (!json?.success) {
        return {
          id: idLabel.replace("@cf/", "cf:"),
          model_id: modelSlug,
          answer: "",
          ok: false,
          latency_ms: 0,
          error: json?.errors?.[0]?.message || "Cloudflare API error",
        };
      }
      const text = json?.result?.response || json?.result?.output || "";
      return {
        id: idLabel.replace("@cf/", "cf:"),
        model_id: modelSlug,
        answer: text,
        ok: !!text,
      };
    } catch (e) {
      return {
        id: idLabel.replace("@cf/", "cf:"),
        model_id: modelSlug,
        answer: "",
        ok: false,
        latency_ms: 0,
        error: String(e),
      };
    }
  });
}

function cfIdLabelFromSlug(slug) {
  // "@cf/meta/llama-3.1-8b-instruct" -> "cf:llama-3.1-8b-instruct"
  const parts = slug.split("/");
  return `@cf/${parts.slice(2).join("/")}`;
}

async function callCloudflarePrimary(prompt) {
  return callCloudflareGeneric(prompt, CF_MODEL, cfIdLabelFromSlug(CF_MODEL));
}

async function callCloudflareAlt(prompt) {
  return callCloudflareGeneric(prompt, CF_ALT_MODEL, cfIdLabelFromSlug(CF_ALT_MODEL));
}

/* ========= ROUTES ========= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get("prompt") || "In one sentence, what does Agona do?";
    
    // Reuse POST logic by creating a mock request
    const mockReq = new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    
    return await POST(mockReq);
  } catch (err) {
    console.error("GET handler error:", err);
    const isDevelopment = process.env.NODE_ENV === 'development';
    return new Response(
      JSON.stringify({ 
        error: "Server error", 
        ...(isDevelopment && { details: String(err) })
      }), 
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const request_id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));

    // Fan-out: OpenAI + CF primary + CF alt
    const settled = await Promise.allSettled([
      callOpenAI(prompt),
      callCloudflarePrimary(prompt),
      callCloudflareAlt(prompt),
    ]);

    const candidates = settled.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : { ok: false, id: "error", answer: "", model_id: "n/a", latency_ms: 0, error: String(r.reason) }
    );

    // price estimate, brand filter, scoring
    for (const c of candidates) {
      c.price_usd = round6(estimatePriceUSD(c.id, approxTokens(prompt), approxTokens(c.answer)));
      if (!onBrand(c.answer)) c.ok = false;
      c.score = score(c);
    }

    const winner = pickWinner(candidates);

    // Savings vs next-best (Option B)
    const okCands = candidates.filter((c) => c.ok && typeof c.price_usd === "number");
    const others = okCands.filter((c) => c.id !== winner.id);
    const baseline = others.length ? Math.min(...others.map((c) => c.price_usd)) : winner.price_usd;
    const savings_usd = round6(Math.max(0, (baseline ?? 0) - (winner.price_usd ?? 0)));
    const savings_pct = baseline > 0 ? +((savings_usd / baseline) * 100).toFixed(2) : null;
    const savings_per_1k_tokens_usd = per1k(savings_usd);

      // Log full telemetry
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.from("query_log").insert([{
            request_id,
            prompt,
            answer: winner?.answer || "",
            model_id: winner?.model_id || null,
            latency_ms: winner?.latency_ms || null,
            providers: candidates,
            winner: winner?.id || null,
            savings_usd,
            savings_pct,
            savings_per_1k_tokens_usd,
          }]);
        } catch (logErr) {
          console.error("Supabase logging failed:", logErr);
        }
      }

    return new Response(
      JSON.stringify({
        ok: true,
        request_id,
        winner: winner?.id || null,
        model_id: winner?.model_id || null,
        latency_ms: winner?.latency_ms || null,
        results: candidates,
        answer: winner?.answer || "",
        savings_usd,
        savings_pct,
        savings_per_1k_tokens_usd,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("API error:", err);
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    return new Response(
      JSON.stringify({ 
        error: "Server error", 
        ...(isDevelopment && { details: String(err) })
      }), 
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}