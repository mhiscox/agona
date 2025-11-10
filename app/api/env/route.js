export async function GET() {
  const safe = {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasSupabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasCloudflare: !!process.env.CF_ACCOUNT_ID && !!process.env.CF_API_TOKEN,
  };
  return new Response(JSON.stringify({ ok: true, env: safe }), {
    headers: { "Content-Type": "application/json" },
  });
}