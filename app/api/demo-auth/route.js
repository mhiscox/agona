export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { password } = await req.json();
    const correctPassword = process.env.DEMO_PASSWORD;

    // If no password is set, allow access (for development)
    if (!correctPassword) {
      return new Response(
        JSON.stringify({ authenticated: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify password
    if (password === correctPassword) {
      return new Response(
        JSON.stringify({ authenticated: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ authenticated: false, error: "Incorrect password" }),
      { 
        status: 401,
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ authenticated: false, error: "Authentication failed" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}

