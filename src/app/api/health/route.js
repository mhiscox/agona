export const runtime = "nodejs";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const t0 = Date.now();
  const res = await fetch(`${base}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "Health check: one-sentence what is Agona?" })
  }).then(r => r.json()).catch(e => ({ error: String(e) }));
  return new Response(JSON.stringify({
    ok: !!res?.ok,
    elapsed_ms: Date.now() - t0,
    winner: res?.winner || null,
    providers: res?.results?.map(p => ({ id: p.id, ok: p.ok, ms: p.latency_ms })) || [],
  }), { headers: { "Content-Type": "application/json" }});
}