// src/app/api/env/route.js

export const runtime = "nodejs";

export async function GET() {
  const has = (k) => Boolean(process.env[k] && process.env[k].trim().length);
  return new Response(
    JSON.stringify({
      cwd: process.cwd(),
      has_OPENAI_API_KEY: has("OPENAI_API_KEY"),
      has_SUPABASE_URL: has("SUPABASE_URL"),
      has_SUPABASE_SERVICE_ROLE_KEY: has("SUPABASE_SERVICE_ROLE_KEY"),
      has_HUGGINGFACE_API_KEY: has("HUGGINGFACE_API_KEY"),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}