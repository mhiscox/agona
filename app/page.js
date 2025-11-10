export default function Home() {
  const sample = "/api/query?prompt=" + encodeURIComponent(
    "In one sentence, what does Agona do?"
  );

  return (
    <main style={{maxWidth:720,margin:"60px auto",padding:"0 20px",fontFamily:"system-ui"}}>
      <h1>Agona</h1>
      <p>LLMs compete in real time to answer your API calls on price, latency, and quality.</p>

      <h3>Live demo</h3>
      <ul>
        <li><a href="/api/health">/api/health</a></li>
        <li><a href={sample}>/api/query?prompt=…</a></li>
      </ul>

      <h3>cURL</h3>
      <pre style={{whiteSpace:"pre-wrap",background:"#111",color:"#eee",padding:"12px",borderRadius:8}}>
{`curl -s -X POST https://www.agona.ai/api/query \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"In one sentence, what does Agona do?"}' | jq .`}
      </pre>

      <p style={{marginTop:24,fontSize:14,opacity:.7}}>
        Built this weekend. More models and bidding logic coming next.
      </p>
    </main>
  );
}
