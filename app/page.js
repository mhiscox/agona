export default function Home() {
  const sample = "/api/query?prompt=" + encodeURIComponent(
    "In one sentence, what does Agona do?"
  );

  return (
    <main style={{
      maxWidth:720,
      margin:"40px auto",
      padding:"20px",
      fontFamily:"system-ui",
      lineHeight:1.6,
      backgroundColor:"#ffffff",
      color:"#1a1a1a",
      minHeight:"100vh"
    }}>
      <h1 style={{fontSize:"clamp(32px, 8vw, 42px)",marginBottom:8,fontWeight:700,color:"#000"}}>Agona</h1>
      <p style={{fontSize:"clamp(16px, 4vw, 20px)",marginBottom:32,color:"#333"}}>
        A real-time LLM bidding marketplace where multiple foundation models compete to answer your API calls.
      </p>

      <div style={{background:"#f5f5f5",padding:24,borderRadius:12,marginBottom:32,color:"#1a1a1a"}}>
        <h2 style={{fontSize:"clamp(20px, 5vw, 24px)",marginTop:0,marginBottom:16,color:"#000"}}>How it works</h2>
        <ol style={{margin:0,paddingLeft:20,color:"#333"}}>
          <li style={{marginBottom:12}}>You send a single API request with your prompt</li>
          <li style={{marginBottom:12}}>Agona sends it to multiple LLM providers simultaneously (OpenAI, Cloudflare Workers AI, etc.)</li>
          <li style={{marginBottom:12}}>Each provider responds with their answer, price, and latency</li>
          <li style={{marginBottom:12}}>Agona picks the best response based on <strong>price, latency, and quality</strong></li>
          <li>You get the winning answer and see how much you saved vs. other options</li>
        </ol>
      </div>

      <div style={{marginBottom:32,color:"#1a1a1a"}}>
        <h2 style={{fontSize:"clamp(20px, 5vw, 24px)",marginBottom:16,color:"#000"}}>Why use Agona?</h2>
        <ul style={{margin:0,paddingLeft:20,color:"#333"}}>
          <li style={{marginBottom:8}}><strong>Save money:</strong> Automatically picks the cheapest provider that meets quality standards</li>
          <li style={{marginBottom:8}}><strong>Faster responses:</strong> Uses the fastest available model when quality is comparable</li>
          <li style={{marginBottom:8}}><strong>Better quality:</strong> Compares responses and selects the best one</li>
          <li><strong>One API:</strong> No need to manage multiple provider accounts or compare prices manually</li>
        </ul>
      </div>

      <div style={{borderTop:"1px solid #ddd",paddingTop:32,marginTop:32,color:"#1a1a1a"}}>
        <h3 style={{fontSize:"clamp(18px, 4vw, 20px)",marginBottom:16,color:"#000"}}>Try it now</h3>
        <ul style={{marginBottom:24,color:"#333"}}>
          <li style={{marginBottom:8}}>
            <a href="/api/health" style={{color:"#0066cc",textDecoration:"none"}}>/api/health</a> — Check service status
          </li>
          <li style={{marginBottom:8}}>
            <a href={sample} style={{color:"#0066cc",textDecoration:"none"}}>/api/query?prompt=…</a> — Try a live query (click to see JSON response)
          </li>
        </ul>

        <h3 style={{fontSize:"clamp(18px, 4vw, 20px)",marginBottom:16,color:"#000"}}>API Example</h3>
        <pre style={{whiteSpace:"pre-wrap",background:"#111",color:"#eee",padding:16,borderRadius:8,overflow:"auto",fontSize:"clamp(12px, 3vw, 14px)"}}>
{`curl -s -X POST https://www.agona.ai/api/query \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"In one sentence, what does Agona do?"}' | jq .`}
        </pre>
        <p style={{fontSize:14,color:"#666",marginTop:8}}>
          Or use GET: <a href={sample} style={{color:"#0066cc"}}>https://www.agona.ai{sample}</a>
        </p>
      </div>

      <p style={{marginTop:32,fontSize:14,color:"#666",fontStyle:"italic"}}>
        Built this weekend. More models and bidding logic coming next.
      </p>
    </main>
  );
}
