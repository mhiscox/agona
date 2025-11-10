// src/app/api/query/route.js
export const runtime = "nodejs";

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIdentifier } from "../utils/rateLimit";

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

function onBrand(text = "", prompt = "") {
  // Only apply brand filter if prompt is asking about Agona/LLMs
  const promptLower = prompt.toLowerCase();
  const isAgonaPrompt = promptLower.includes("agona") || 
                        promptLower.includes("what does") || 
                        promptLower.includes("llm") ||
                        promptLower.includes("language model");
  
  if (!isAgonaPrompt) {
    // For non-Agona prompts, accept any non-empty response
    return text.trim().length > 0;
  }
  
  // For Agona prompts, check if answer is on-brand
  const s = text.toLowerCase();
  const must = s.includes("llm") || s.includes("language model") || s.includes("model");
  const hits = ["price", "latency", "quality", "cost", "speed"].filter((k) => s.includes(k)).length;
  return must && hits >= 2;
}

function score(p) {
  let s = 0;
  
  // Base score for successful response
  if (p.ok) {
    s += 10;
    
    // Answer quality: longer answers get more points (up to +5)
    const answerLen = (p.answer || "").length;
    s += Math.min(5, answerLen / 20); // +0.5 per 10 chars, max +5
    
    // Latency score: faster is better (up to +3)
    // 0ms = +3, 1000ms = +2, 2000ms = +1, 3000ms+ = +0
    const latency = p.latency_ms ?? 9e9;
    if (latency < 3000) {
      s += Math.max(0, 3 - (latency / 1000)); // Linear decay from 3 to 0
    }
    
    // Price score: cheaper is better (up to +2)
    // $0 = +2, $0.0001 = +1.5, $0.0002 = +1, $0.0005+ = +0
    if (typeof p.price_usd === "number" && p.price_usd > 0) {
      if (p.price_usd <= 0.0002) {
        s += 2 - (p.price_usd / 0.0001); // Linear from 2 to 1
      } else if (p.price_usd <= 0.0005) {
        s += Math.max(0, 1 - ((p.price_usd - 0.0002) / 0.0003)); // Linear from 1 to 0
      }
    }
  }
  
  return Math.round(s * 100) / 100; // Round to 2 decimals for display
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
    // Rate limiting
    const clientId = getClientIdentifier(req);
    const rateLimitResult = rateLimit(
      clientId,
      Number(process.env.RATE_LIMIT_MAX_REQUESTS || 10), // Default: 10 requests
      Number(process.env.RATE_LIMIT_WINDOW_MS || 60000) // Default: 1 minute
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded",
          message: `Too many requests. Limit: ${rateLimitResult.limit} per ${rateLimitResult.reset - Date.now()}ms`,
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
            "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Optional: API key authentication
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    const requiredApiKey = process.env.API_KEY;
    
    if (requiredApiKey && apiKey !== requiredApiKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Invalid or missing API key" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate prompt length to prevent abuse
    const MAX_PROMPT_LENGTH = Number(process.env.MAX_PROMPT_LENGTH || 5000); // Default: 5000 chars
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return new Response(
        JSON.stringify({ 
          error: "Prompt too long", 
          message: `Prompt must be ${MAX_PROMPT_LENGTH} characters or less`,
          length: prompt.length,
          maxLength: MAX_PROMPT_LENGTH
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Cost control: Estimate max cost before processing
    const estimatedMaxCost = estimatePriceUSD(
      "openai:gpt-4o-mini", 
      approxTokens(prompt), 
      approxTokens("") * 10 // Estimate 10x input for output
    );
    const MAX_COST_PER_REQUEST = Number(process.env.MAX_COST_PER_REQUEST || 0.01); // Default: $0.01
    
    if (estimatedMaxCost > MAX_COST_PER_REQUEST) {
      return new Response(
        JSON.stringify({ 
          error: "Request too expensive",
          message: `Estimated cost ($${estimatedMaxCost.toFixed(6)}) exceeds maximum ($${MAX_COST_PER_REQUEST.toFixed(6)})`,
          estimatedCost: estimatedMaxCost,
          maxCost: MAX_COST_PER_REQUEST
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
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
      if (!onBrand(c.answer, prompt)) c.ok = false;
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