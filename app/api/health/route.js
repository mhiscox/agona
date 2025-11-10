export async function GET() {
  return new Response(JSON.stringify({ ok: true, route: "app/api/health" }), {
    headers: { "Content-Type": "application/json" },
  });
}