// app/api/ping/route.js
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(
    JSON.stringify({ ok: true, route: "ping", t: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } }
  );
}