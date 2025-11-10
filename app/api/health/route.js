export async function GET() {
  return Response.json({ ok: true, route: "app/api/health" });
}