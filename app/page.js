'use client';

import { useState } from 'react';

export default function Home() {
  const sample = "/api/query?prompt=" + encodeURIComponent(
    "In one sentence, what does Agona do?"
  );

  // Demo state
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [summarizeText, setSummarizeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const promptChips = [
    'What does Agona do?',
    'Draft a 2-sentence refund email',
    'Summarize this text'
  ];

  const getCurrentPrompt = () => {
    if (selectedPrompt === 'Summarize this text') {
      return `Summarize this text: ${summarizeText}`;
    }
    if (selectedPrompt) {
      return selectedPrompt;
    }
    return customPrompt;
  };

  const runDemo = async () => {
    const prompt = getCurrentPrompt();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setCopied(false);

    try {
      const response = await fetch(`/api/query?prompt=${encodeURIComponent(prompt)}`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err) {
      setError('Failed to fetch results. Make sure environment variables are configured.');
    } finally {
      setLoading(false);
    }
  };

  const copyCurl = () => {
    const prompt = getCurrentPrompt();
    const escapedPrompt = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const curlCommand = `curl -s -X POST https://www.agona.ai/api/query \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"${escapedPrompt}"}' | jq .`;
    
    navigator.clipboard.writeText(curlCommand).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sortedResults = results?.results 
    ? [...results.results].sort((a, b) => (b.score || 0) - (a.score || 0))
    : [];

  // Find fastest provider (only when results exist)
  const fastestResult = results?.results?.reduce((fastest, current) => {
    if (!current.ok || !current.latency_ms) return fastest;
    if (!fastest || current.latency_ms < fastest.latency_ms) return current;
    return fastest;
  }, null) || null;

  const winnerResult = results?.results?.find(r => r.id === results?.winner) || null;
  const isWinnerFastest = fastestResult?.id === results?.winner;
  const deltaMs = winnerResult && fastestResult && !isWinnerFastest 
    ? fastestResult.latency_ms - winnerResult.latency_ms 
    : null;

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
          <li style={{marginBottom:12}}>You send one API request with your prompt.</li>
          <li style={{marginBottom:12}}>Agona fans it out to multiple LLM providers in real time (e.g. OpenAI, Cloudflare Workers AI, Anthropic, etc).</li>
          <li style={{marginBottom:12}}>Each model returns its answer, price, and latency.</li>
          <li style={{marginBottom:12}}>Agona ranks the responses by quality, speed, and cost.</li>
          <li style={{marginBottom:12}}>You get the best-performing answer — and see what you saved compared to other models.</li>
        </ol>
        <p style={{marginTop:16,marginBottom:0,color:"#666",fontStyle:"italic",fontSize:14}}>
          (Think "load balancer meets price auction" for AI models.)
        </p>
      </div>

      <div style={{marginBottom:32,color:"#1a1a1a"}}>
        <h2 style={{fontSize:"clamp(20px, 5vw, 24px)",marginBottom:16,color:"#000"}}>Why use Agona</h2>
        <ul style={{margin:0,paddingLeft:20,color:"#333"}}>
          <li style={{marginBottom:8}}><strong>Cheaper:</strong> Automatically routes to the lowest-cost model that meets quality thresholds.</li>
          <li style={{marginBottom:8}}><strong>Faster:</strong> Chooses the quickest model when quality is comparable.</li>
          <li style={{marginBottom:8}}><strong>Smarter:</strong> Scores responses to pick the best balance of price, latency, and accuracy.</li>
          <li style={{marginBottom:8}}><strong>Simpler:</strong> One API — no need to manage accounts or monitor multiple providers.</li>
          <li><strong>Transparent:</strong> Every query shows what each model charged, how fast it was, and why one won.</li>
        </ul>
      </div>

      {/* Live Demo */}
      <div style={{
        background: '#f9f9f9',
        padding: 24,
        borderRadius: 12,
        marginBottom: 32,
        border: '1px solid #e0e0e0'
      }}>
        <h2 style={{ fontSize: 'clamp(20px, 5vw, 24px)', marginTop: 0, marginBottom: 16, color: '#000' }}>
          Live Demo: See Models Compete
        </h2>
        
        {/* Prompt chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {promptChips.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setSelectedPrompt(chip);
                setCustomPrompt('');
                if (chip !== 'Summarize this text') {
                  setSummarizeText('');
                }
              }}
              style={{
                padding: '6px 12px',
                fontSize: 14,
                backgroundColor: selectedPrompt === chip ? '#0066cc' : '#fff',
                color: selectedPrompt === chip ? '#fff' : '#333',
                border: '1px solid #ddd',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: selectedPrompt === chip ? 600 : 400
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div style={{ marginBottom: 16 }}>
          {selectedPrompt === 'Summarize this text' ? (
            <textarea
              value={summarizeText}
              onChange={(e) => setSummarizeText(e.target.value)}
              placeholder="Paste text to summarize..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: 16,
                border: '1px solid #ddd',
                borderRadius: 8,
                marginBottom: 12,
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          ) : (
            <input
              type="text"
              value={selectedPrompt || customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                setSelectedPrompt(null);
              }}
              placeholder="Enter your prompt..."
              style={{
                width: '100%',
                padding: '12px',
                fontSize: 16,
                border: '1px solid #ddd',
                borderRadius: 8,
                marginBottom: 12,
                boxSizing: 'border-box'
              }}
            />
          )}
          <button
            onClick={runDemo}
            disabled={loading || !getCurrentPrompt().trim()}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              backgroundColor: loading ? '#ccc' : '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              width: '100%'
            }}
          >
            {loading ? 'Running...' : 'Run Demo'}
          </button>
        </div>

        {error && (
          <div style={{
            padding: 12,
            background: '#fee',
            color: '#c00',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 24, color: '#666', fontSize: 14 }}>
            <p>Sending request to 3 models simultaneously...</p>
            <p style={{ marginTop: 8 }}>⏳ Waiting for responses...</p>
          </div>
        )}

        {results && !loading && (
          <div>
            {/* Winner card */}
            <div style={{
              background: '#e8f5e9',
              padding: 16,
              borderRadius: 8,
              marginBottom: 16,
              border: '2px solid #4caf50'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>🏆</span>
                <strong style={{ fontSize: 18 }}>Winner: {results.winner || 'N/A'}</strong>
              </div>
              <p style={{ margin: 0, color: '#333', fontSize: 14 }}>{results.answer || 'No answer'}</p>
              
                  {/* Decision explanation */}
                  {results.savings_pct !== null && results.savings_pct > 0 && (
                    <div style={{ margin: '8px 0 0 0' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: 12, color: '#666' }}>
                        Won on price (−{results.savings_pct.toFixed(1)}%) with comparable quality.
                        {!isWinnerFastest && fastestResult && deltaMs && (
                          ` Fastest was ${fastestResult.id} by ${deltaMs}ms.`
                        )}
                      </p>
                      {results.savings_per_1m_tokens_usd && results.savings_per_1m_tokens_usd > 0 && (
                        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
                          💰 Estimated savings: ${results.savings_per_1m_tokens_usd.toFixed(2)} per 1M tokens
                        </p>
                      )}
                    </div>
                  )}
                  {results.savings_pct === null || results.savings_pct === 0 ? (
                    <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#666' }}>
                      Won based on best overall score (quality, latency, and price).
                      {!isWinnerFastest && fastestResult && deltaMs && (
                        ` Fastest was ${fastestResult.id} by ${deltaMs}ms.`
                      )}
                    </p>
                  ) : null}
            </div>

            {/* Results table */}
            <div style={{ marginBottom: 16, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <th style={{ textAlign: 'left', padding: '8px', fontWeight: 600, color: '#000' }}>Provider</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600, color: '#000', fontFamily: 'monospace' }}>Latency (ms)</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600, color: '#000', fontFamily: 'monospace' }}>Price ($)</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600, color: '#000', fontFamily: 'monospace' }}>Score</th>
                    <th style={{ textAlign: 'left', padding: '8px', fontWeight: 600, color: '#000' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((result) => {
                    const isWinner = result.id === results.winner;
                    return (
                      <tr 
                        key={result.id}
                        style={{
                          borderBottom: '1px solid #eee',
                          backgroundColor: isWinner ? '#f0f8f0' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '8px', color: '#000' }}>
                          {result.id}
                          {isWinner && <span style={{ marginLeft: 4, color: '#4caf50', fontWeight: 600 }}>✓</span>}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', fontFamily: 'monospace', color: '#666' }}>
                          {result.latency_ms !== undefined ? result.latency_ms : '—'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', fontFamily: 'monospace', color: '#666' }}>
                          {result.price_usd !== undefined ? result.price_usd.toFixed(6) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', fontFamily: 'monospace', color: '#666' }}>
                          {result.score !== undefined ? result.score.toFixed(1) : '—'}
                        </td>
                        <td style={{ padding: '8px', fontSize: 12, color: '#666' }}>
                          {result.ok ? 'ok' : `skipped: ${result.error || 'no response'}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ marginTop: 8, fontSize: 10, color: '#999', fontStyle: 'italic' }}>
                Prices are estimated per 1K tokens; latency measured server-side.
              </p>
            </div>

            {/* Copy curl button */}
            <button
              onClick={copyCurl}
              style={{
                padding: '8px 16px',
                fontSize: 12,
                backgroundColor: copied ? '#4caf50' : '#666',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              {copied ? '✓ Copied!' : 'Copy curl'}
            </button>
          </div>
        )}
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
