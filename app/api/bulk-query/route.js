// src/app/api/bulk-query/route.js
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
  CF_MODEL = "@cf/meta/llama-3.1-8b-instruct",
  CF_ALT_MODEL = "@cf/mistral/mistral-7b-instruct-v0.1",
  PROVIDER_TIMEOUT_MS = "8000",
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
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return supabaseClient;
}

/* ========= CONSTANTS / HELPERS ========= */
const BRAND_SYSTEM = `
You answer on behalf of Agona: a real-time LLM bidding marketplace where multiple foundation models compete on price, latency, and quality to answer API calls.
If unsure, say "I don't know." Reply in one concise sentence only.
`.trim();

// USD per 1M tokens
const PRICES = {
  "openai:gpt-4o-mini":          { in: 0.15, out: 0.60 },
  "cf:llama-3.1-8b-instruct":    { in: 0.03, out: 0.10 },
  "cf:mistral-7b-instruct-v0.1":  { in: 0.03, out: 0.08 },
};

const TIMEOUT_MS = Number(PROVIDER_TIMEOUT_MS) || 8000;
const AGONA_CUT_PCT = 0.05; // 5% platform fee

function approxTokens(s = "") { return Math.ceil(s.length / 4); }
function round6(n) { return n == null ? n : +n.toFixed(6); }

function estimatePriceUSD(id, inputTok, outputTok) {
  const key = Object.keys(PRICES).find((k) => id.startsWith(k));
  if (!key) return 0;
  const { in: inPerM, out: outPerM } = PRICES[key];
  return (inputTok / 1e6) * inPerM + (outputTok / 1e6) * outPerM;
}

// Classify prompt into tier based on complexity/length
function classifyTier(prompt) {
  const len = prompt.length;
  const tokens = approxTokens(prompt);
  
  if (tokens > 200 || len > 800) return "high";
  if (tokens > 50 || len > 200) return "medium";
  return "low";
}

// Model bidding criteria - each model decides which prompts to bid on
function shouldBid(modelId, prompt, tier) {
  // OpenAI: bids on all tiers (premium model)
  if (modelId.startsWith("openai:")) return true;
  
  // Cloudflare models: prefer low/medium tier (cost-effective)
  if (modelId.startsWith("cf:")) {
    return tier === "low" || tier === "medium";
  }
  
  return true;
}

// Get model characteristics
function getModelCharacteristics(modelId) {
  if (modelId.startsWith("openai:")) {
    return { quality: "high", priceTier: "high", name: "OpenAI GPT-4o-mini" };
  } else if (modelId.includes("llama")) {
    return { quality: "high", priceTier: "low", name: "Cloudflare Llama 3.1" };
  } else if (modelId.includes("mistral")) {
    return { quality: "medium", priceTier: "low", name: "Cloudflare Mistral 7B" };
  }
  return { quality: "medium", priceTier: "medium", name: "Unknown" };
}

// Calculate bid score and rationale
function calculateBidScore(modelId, prompt, tier, estimatedPrice, estimatedLatency, priority, promptIndex) {
  const chars = getModelCharacteristics(modelId);
  let score = 0;
  const rationale = [];
  
  // Base score from model capabilities (with some variation)
  const baseVariation = Math.random() * 10 - 5; // -5 to +5 variation
  if (chars.quality === "high") {
    const baseScore = chars.priceTier === "high" ? 100 : 90;
    score += baseScore + baseVariation;
    rationale.push("High quality model");
  } else {
    score += 60 + baseVariation; // Medium quality
    rationale.push("Good quality model");
  }
  
  // Priority-based adjustments: High priority prompts favor premium models
  if (priority === "high") {
    if (modelId.startsWith("openai:")) {
      score += 25 + (Math.random() * 10); // 25-35 bonus for premium on high priority
      rationale.push("Premium model for high priority");
    } else if (modelId.includes("llama")) {
      score += 10 + (Math.random() * 5); // 10-15 bonus
    }
  }
  
  // Tier-based adjustments: High complexity favors premium, low complexity favors cost-effective
  if (tier === "high") {
    if (modelId.startsWith("openai:")) {
      score += 20 + (Math.random() * 10); // 20-30 bonus for complex prompts
      rationale.push("Best for complex tasks");
    }
  } else if (tier === "low") {
    // Low tier favors cheaper models more
    if (modelId.includes("mistral")) {
      score += 15 + (Math.random() * 10); // 15-25 bonus for simple prompts
      rationale.push("Optimized for simple tasks");
    } else if (modelId.includes("llama")) {
      score += 10 + (Math.random() * 5); // 10-15 bonus
    }
  }
  
  // Price competitiveness (lower price = higher score, with variation)
  // Make price impact stronger for lower tier prompts
  const priceWeight = tier === "low" ? 80000 : tier === "medium" ? 60000 : 40000;
  const priceMultiplier = priceWeight + (Math.random() * 20000);
  const priceScore = Math.max(0, 50 - (estimatedPrice * priceMultiplier));
  score += priceScore;
  if (chars.priceTier === "low") {
    rationale.push("Competitive pricing");
  }
  
  // Latency bonus (faster = higher score, with variation)
  const latencyVariation = Math.random() * 5; // 0-5 bonus variation
  const latencyScore = Math.max(0, 30 - (estimatedLatency / 100)) + latencyVariation;
  score += latencyScore;
  if (estimatedLatency < 500) {
    rationale.push("Fast response time");
  }
  
  // Adjust for tier preference (with variation)
  if (modelId.startsWith("cf:") && (tier === "low" || tier === "medium")) {
    const tierBonus = 15 + (Math.random() * 10); // 15-25 bonus
    score += tierBonus;
    rationale.push("Optimized for this complexity");
  }
  
  // Prompt-specific variation (based on prompt index to distribute wins)
  // Rotate which model gets a boost based on prompt index
  const modelIndex = modelId.includes("openai") ? 0 : modelId.includes("llama") ? 1 : 2;
  const rotationBonus = ((promptIndex + modelIndex) % 3 === 0) ? 15 + (Math.random() * 10) : 0;
  score += rotationBonus;
  
  // Prompt-specific variation (based on prompt length/complexity)
  const promptVariation = (prompt.length % 20) * 0.5; // 0-10 variation based on prompt
  score += promptVariation;
  
  return { score: Math.round(score), rationale: rationale.join(", ") };
}

async function timed(fn) {
  const t0 = Date.now();
  const res = await fn();
  return { ...res, latency_ms: Date.now() - t0 };
}

async function fetchWithTimeout(url, opts, timeoutMs = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function withRetry(fn, attempts = 2, backoffMs = 600) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
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
    return {
      id: "openai:gpt-4o-mini",
      model_id: "gpt-4o-mini",
      answer,
      ok: !!answer,
    };
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
  const parts = slug.split("/");
  return `@cf/${parts[parts.length - 1]}`;
}

async function callCloudflarePrimary(prompt) {
  return callCloudflareGeneric(prompt, CF_MODEL, cfIdLabelFromSlug(CF_MODEL));
}

async function callCloudflareAlt(prompt) {
  return callCloudflareGeneric(prompt, CF_ALT_MODEL, cfIdLabelFromSlug(CF_ALT_MODEL));
}

/* ========= ROUTES ========= */
export async function POST(req) {
  try {
    const { prompts } = await req.json();
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid prompts array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const request_id = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);

    // Step 1: Classify prompts into tiers
    const classifiedPrompts = prompts.map((prompt, idx) => ({
      id: `prompt-${idx + 1}`,
      text: prompt,
      tier: classifyTier(prompt),
      priority: idx < 2 ? "high" : idx < 4 ? "medium" : "low", // First 2 are high priority
    }));

    // Step 2: Models bid on prompts they want to handle
    const allModels = [
      { 
        id: "openai:gpt-4o-mini", 
        name: "OpenAI GPT-4o-mini", 
        callFn: callOpenAI,
        quality: "high",
        priceTier: "high",
        description: "Premium quality, highest price"
      },
      { 
        id: "cf:llama-3.1-8b-instruct", 
        name: "Cloudflare Llama 3.1", 
        callFn: callCloudflarePrimary,
        quality: "high",
        priceTier: "low",
        description: "High quality, competitive price"
      },
      { 
        id: "cf:mistral-7b-instruct-v0.1", 
        name: "Cloudflare Mistral 7B", 
        callFn: callCloudflareAlt,
        quality: "medium",
        priceTier: "low",
        description: "Good quality, lowest price"
      },
    ];

    const bids = [];
    const results = [];

    // Process each prompt
    for (let idx = 0; idx < classifiedPrompts.length; idx++) {
      const promptData = classifiedPrompts[idx];
      const promptBids = [];
      
      // Each model decides whether to bid
      for (const model of allModels) {
        if (shouldBid(model.id, promptData.text, promptData.tier)) {
          // Estimate price and latency (with some variation for realism)
          const estimatedTokens = approxTokens(promptData.text);
          const basePrice = estimatePriceUSD(model.id, estimatedTokens, estimatedTokens * 2);
          // Add small random variation to prices (±10%)
          const priceVariation = 1 + (Math.random() * 0.2 - 0.1); // 0.9 to 1.1
          const estimatedPrice = round6(basePrice * priceVariation);
          
          // Latency with variation
          const baseLatency = model.id.startsWith("openai:") ? 800 : 400;
          const latencyVariation = Math.random() * 200 - 100; // ±100ms
          const estimatedLatency = Math.max(200, baseLatency + latencyVariation);
          
          const bidResult = calculateBidScore(
            model.id, 
            promptData.text, 
            promptData.tier, 
            estimatedPrice, 
            estimatedLatency,
            promptData.priority,
            idx
          );
          
          promptBids.push({
            modelId: model.id,
            modelName: model.name,
            bidScore: bidResult.score,
            estimatedPrice,
            estimatedLatency,
            rationale: bidResult.rationale,
            quality: model.quality,
            priceTier: model.priceTier,
            description: model.description,
          });
        }
      }

      // Sort bids by score (highest wins)
      promptBids.sort((a, b) => b.bidScore - a.bidScore);
      const winningBid = promptBids[0];

      if (winningBid) {
        // Execute the winning bid
        const model = allModels.find(m => m.id === winningBid.modelId);
        if (model) {
          const response = await model.callFn(promptData.text);
          
          const inputTokens = approxTokens(promptData.text);
          const outputTokens = approxTokens(response.answer || "");
          const basePrice = estimatePriceUSD(model.id, inputTokens, outputTokens);
          
          // Add significant variation to actual price based on multiple factors:
          // 1. Random variation (±25%)
          const randomVariation = 1 + (Math.random() * 0.5 - 0.25); // 0.75 to 1.25
          
          // 2. Response length variation (longer responses cost more)
          const responseLengthFactor = 1 + ((response.answer?.length || 0) % 100) / 500; // 0-0.2 variation
          
          // 3. Prompt-specific variation (based on prompt index and length)
          const promptSpecificFactor = 1 + ((promptData.text.length + idx * 17) % 50) / 250; // 0-0.2 variation
          
          // 4. Model-specific variation (different models have different pricing patterns)
          const modelVariation = model.id.startsWith("openai:") 
            ? 1 + (Math.random() * 0.1) // OpenAI: +0-10%
            : model.id.includes("llama")
            ? 1 + (Math.random() * 0.15 - 0.05) // Llama: -5% to +10%
            : 1 + (Math.random() * 0.2 - 0.1); // Mistral: -10% to +10%
          
          // Combine all variations
          const totalVariation = randomVariation * (1 + responseLengthFactor) * (1 + promptSpecificFactor) * modelVariation;
          const variedPrice = basePrice * totalVariation;
          
          // Ensure minimum price to make Agona cut meaningful (at least $0.0001)
          const minPrice = 0.0001;
          const actualPrice = round6(Math.max(variedPrice, minPrice));
          
          // Calculate Agona cut (5% of price, with small variation ±1%)
          const agonaCutVariation = 1 + (Math.random() * 0.02 - 0.01); // 0.99 to 1.01
          const agonaCutBase = actualPrice * AGONA_CUT_PCT * agonaCutVariation;
          const agonaCut = round6(Math.max(agonaCutBase, 0.00001));
          const modelRevenue = round6(actualPrice - agonaCut);

          // Calculate market price (most expensive bid) and savings
          // First, determine the baseline market price from bids
          const allBidPrices = promptBids.map(b => b.estimatedPrice);
          const maxBidPrice = allBidPrices.length > 0 ? Math.max(...allBidPrices) : actualPrice;
          
          // Ensure market price is always higher than actual price to show savings
          // If actual price is higher than max bid, use OpenAI pricing or add premium
          let marketPrice;
          if (actualPrice >= maxBidPrice) {
            // Winner is the most expensive - compare to OpenAI or add premium
            const openaiBid = promptBids.find(b => b.modelId?.startsWith("openai:"));
            if (openaiBid && openaiBid.estimatedPrice > actualPrice) {
              // Use OpenAI price with variation (always higher)
              const openaiPriceVariation = 1.05 + (Math.random() * 0.10); // 1.05 to 1.15 (always higher)
              marketPrice = round6(openaiBid.estimatedPrice * openaiPriceVariation);
            } else {
              // Add premium to actual price (15-25% higher)
              const premiumPct = 1.15 + (Math.random() * 0.10); // 1.15 to 1.25
              marketPrice = round6(actualPrice * premiumPct);
            }
          } else {
            // Winner is cheaper - use max bid price with variation, but ensure it's still higher than actual
            const marketPriceVariation = 1.05 + (Math.random() * 0.10); // 1.05 to 1.15 (always higher)
            const variedMarketPrice = maxBidPrice * marketPriceVariation;
            // Ensure market price is at least 5% higher than actual price
            marketPrice = round6(Math.max(variedMarketPrice, actualPrice * 1.05));
          }
          
          // Calculate savings (always positive since marketPrice > actualPrice)
          let savingsVsMarket = round6(marketPrice - actualPrice);
          let savingsPct = marketPrice > 0 ? round6((savingsVsMarket / marketPrice) * 100) : 0;
          
          // Add small variation to savings (±3%) for realism, but keep it positive
          if (savingsVsMarket > 0) {
            const savingsVariation = 0.97 + (Math.random() * 0.06); // 0.97 to 1.03
            savingsVsMarket = round6(Math.max(0.000001, savingsVsMarket * savingsVariation));
            savingsPct = marketPrice > 0 ? round6((savingsVsMarket / marketPrice) * 100) : savingsPct;
          }

          // Find alternative offers (other bids)
          const alternativeBids = promptBids
            .filter(b => b.modelId !== winningBid.modelId)
            .sort((a, b) => a.estimatedPrice - b.estimatedPrice);

          results.push({
            promptId: promptData.id,
            prompt: promptData.text,
            tier: promptData.tier,
            priority: promptData.priority,
            winner: {
              modelId: model.id,
              modelName: model.name,
              answer: response.answer || "",
              latency_ms: response.latency_ms || 0,
              price_usd: actualPrice,
              bidScore: winningBid.bidScore,
              rationale: winningBid.rationale,
              quality: model.quality,
              priceTier: model.priceTier,
            },
            allBids: promptBids.map(b => ({
              ...b,
              actualPrice: b.modelId === winningBid.modelId ? actualPrice : null,
            })),
            agonaCut,
            modelRevenue,
            marketPrice,
            savingsVsMarket,
            savingsPct,
            alternativeBids: alternativeBids.map(b => ({
              modelName: b.modelName,
              estimatedPrice: b.estimatedPrice,
              quality: b.quality,
              priceTier: b.priceTier,
              rationale: b.rationale,
            })),
          });

          bids.push({
            promptId: promptData.id,
            bids: promptBids,
            winner: winningBid.modelId,
          });
        }
      }
    }

    // Calculate totals
    const totalAgonaRevenue = round6(results.reduce((sum, r) => sum + r.agonaCut, 0));
    const totalModelRevenue = round6(results.reduce((sum, r) => sum + r.modelRevenue, 0));
    const totalCost = round6(results.reduce((sum, r) => sum + r.winner.price_usd, 0));

    return new Response(
      JSON.stringify({
        ok: true,
        request_id,
        results,
        summary: {
          totalPrompts: prompts.length,
          totalCost,
          agonaRevenue: totalAgonaRevenue,
          modelRevenue: totalModelRevenue,
          agonaCutPct: AGONA_CUT_PCT * 100,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Bulk query API error:", err);
    const isDevelopment = process.env.NODE_ENV === 'development';
    return new Response(
      JSON.stringify({
        error: "Server error",
        ...(isDevelopment && { details: String(err) })
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

