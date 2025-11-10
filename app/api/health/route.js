export async function GET() {
  return new Response(
    JSON.stringify({ ok: true, service: "health", t: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } }
  );
}