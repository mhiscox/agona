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

  // Bulk marketplace demo state
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkError, setBulkError] = useState(null);
  const [auctionStage, setAuctionStage] = useState('idle'); // 'idle', 'classifying', 'bidding', 'processing'
  const [activeBids, setActiveBids] = useState([]);

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

  // Sample bulk prompts from customers (shown upfront)
  const samplePrompts = [
    "What are the key benefits of using a microservices architecture?",
    "Summarize this meeting: discussed Q4 goals, hiring plans, and product roadmap.",
    "Write a professional email to request a refund for order #12345",
    "Explain quantum computing in simple terms",
    "Translate 'Hello, how are you?' to Spanish",
  ];

  const runBulkDemo = async () => {
    setBulkLoading(true);
    setBulkError(null);
    setBulkResults(null);
    setAuctionStage('classifying');
    setActiveBids([]);

    // Simulate auction stages with delays (longer for YC partners to see)
    // Stage 1: Classifying (2 seconds)
    setTimeout(() => {
      setAuctionStage('bidding');
      // Simulate bids coming in over a longer period
      const models = ['OpenAI GPT-4o-mini', 'Cloudflare Llama 3.1', 'Cloudflare Mistral 7B'];
      models.forEach((model, idx) => {
        setTimeout(() => {
          setActiveBids(prev => [...prev, { model, price: (0.0001 + Math.random() * 0.0002).toFixed(6), score: 150 + Math.floor(Math.random() * 50) }]);
        }, idx * 1500); // Slower: 1.5s between bids for visibility
      });
    }, 2000); // Start bidding after 2s (classifying stage)

    // Keep bidding stage visible longer (8+ seconds total)
    // 2s (classifying) + 4.5s (3 bids at 1.5s intervals) + 2s buffer = 8.5s
    setTimeout(() => {
      setAuctionStage('processing');
    }, 10000); // Switch to processing after 10 seconds total

    try {
      const response = await fetch('/api/bulk-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: samplePrompts }),
      });
      const data = await response.json();

      if (data.error) {
        setBulkError(data.error);
        setAuctionStage('idle');
      } else {
        setBulkResults(data);
        setAuctionStage('idle');
      }
    } catch (err) {
      setBulkError('Failed to fetch results. Make sure environment variables are configured.');
      setAuctionStage('idle');
    } finally {
      setBulkLoading(false);
      setActiveBids([]);
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

      {/* Bulk Marketplace Demo */}
      <div style={{
        background: '#f9f9f9',
        padding: 24,
        borderRadius: 12,
        marginBottom: 32,
        border: '1px solid #e0e0e0'
      }}>
        <h2 style={{ fontSize: 'clamp(20px, 5vw, 24px)', marginTop: 0, marginBottom: 8, color: '#000' }}>
          Marketplace Demo: Bulk Prompts with Bidding
        </h2>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
          This demo shows how Agona works in production: API consumers send bulk prompts, Agona classifies them into tiers, 
          models bid on prompts they want to handle, and Agona takes a 5% platform fee from each successful match.
        </p>

        {/* Show prompts upfront */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12, color: '#000', fontWeight: 600 }}>
            📋 Bulk Prompts from API Consumers:
          </h3>
          <div style={{ 
            background: '#fff', 
            padding: 16, 
            borderRadius: 8, 
            border: '1px solid #ddd',
            marginBottom: 16
          }}>
            {samplePrompts.map((prompt, idx) => (
              <div 
                key={idx}
                style={{
                  padding: '10px',
                  marginBottom: idx < samplePrompts.length - 1 ? 8 : 0,
                  borderBottom: idx < samplePrompts.length - 1 ? '1px solid #eee' : 'none',
                  fontSize: 14,
                  color: '#333'
                }}
              >
                <span style={{ color: '#666', marginRight: 8, fontWeight: 600 }}>#{idx + 1}</span>
                {prompt}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={runBulkDemo}
          disabled={bulkLoading}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            backgroundColor: bulkLoading ? '#ccc' : '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: bulkLoading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            marginBottom: 16,
            width: '100%'
          }}
        >
          {bulkLoading ? 'Processing bulk prompts...' : '🚀 Run Marketplace Demo'}
        </button>

        {bulkError && (
          <div style={{
            padding: 12,
            background: '#fee',
            color: '#c00',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14
          }}>
            {bulkError}
          </div>
        )}

        {bulkLoading && (
          <div style={{ 
            background: '#fff', 
            padding: 24, 
            borderRadius: 8, 
            border: '2px solid #0066cc',
            marginTop: 16
          }}>
            {/* Auction Header */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: 24,
              padding: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 8,
              color: '#fff'
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🏛️ Live Marketplace Auction</div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>
                {auctionStage === 'classifying' && '📊 Analyzing 5 prompts...'}
                {auctionStage === 'bidding' && '💰 Models are bidding...'}
                {auctionStage === 'processing' && '⚡ Processing winning bids...'}
              </div>
            </div>

            {/* Prompts Being Auctioned */}
            {auctionStage !== 'idle' && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#000' }}>
                  📋 Prompts on the Block:
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: 8 
                }}>
                  {samplePrompts.map((prompt, idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: '10px',
                        background: '#f5f5f5',
                        borderRadius: 6,
                        fontSize: 12,
                        border: '1px solid #ddd',
                        animation: auctionStage === 'bidding' ? 'pulse 1.5s infinite' : 'none'
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>#{idx + 1}</div>
                      <div style={{ color: '#666' }}>{prompt.substring(0, 40)}...</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Bidding Feed */}
            {auctionStage === 'bidding' && (
              <div style={{ 
                background: '#f9f9f9', 
                padding: 16, 
                borderRadius: 8,
                marginBottom: 16,
                border: '2px solid #7b1fa2'
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#000' }}>
                  💰 Live Bidding Activity:
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {activeBids.length === 0 ? (
                    <div style={{ color: '#666', fontSize: 12, fontStyle: 'italic' }}>
                      Waiting for bids...
                    </div>
                  ) : (
                    activeBids.map((bid, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: '10px',
                          marginBottom: 8,
                          background: '#fff',
                          borderRadius: 6,
                          border: '1px solid #ddd',
                          animation: 'slideIn 0.3s ease-out',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#000' }}>
                            🎯 {bid.model}
                          </div>
                          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                            Bid Score: <strong>{bid.score}</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#2e7d32', fontFamily: 'monospace' }}>
                            ${bid.price}
                          </div>
                          <div style={{ fontSize: 10, color: '#666' }}>per request</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Visual Flow */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                {/* Step 1: Prompts */}
                <div style={{ textAlign: 'center', flex: '1 1 120px' }}>
                  <div style={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: '50%', 
                    background: auctionStage === 'classifying' ? '#e3f2fd' : '#f5f5f5',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                    border: auctionStage === 'classifying' ? '3px solid #1976d2' : '2px solid #ccc',
                    fontSize: 24,
                    transition: 'all 0.3s'
                  }}>
                    📋
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#000' }}>Prompts</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>5 requests</div>
                </div>

                {/* Arrow */}
                <div style={{ fontSize: 24, color: '#0066cc', flex: '0 0 auto' }}>→</div>

                {/* Step 2: Agona Processing */}
                <div style={{ textAlign: 'center', flex: '1 1 120px' }}>
                  <div style={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: '50%', 
                    background: auctionStage === 'classifying' ? '#fff3e0' : '#f5f5f5',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                    border: auctionStage === 'classifying' ? '3px solid #f57c00' : '2px solid #ccc',
                    fontSize: 24,
                    animation: auctionStage === 'classifying' ? 'pulse 2s infinite' : 'none',
                    transition: 'all 0.3s'
                  }}>
                    ⚙️
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#000' }}>Agona</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                    {auctionStage === 'classifying' ? 'Classifying...' : 'Complete'}
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ fontSize: 24, color: '#0066cc', flex: '0 0 auto' }}>→</div>

                {/* Step 3: Bidding */}
                <div style={{ textAlign: 'center', flex: '1 1 120px' }}>
                  <div style={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: '50%', 
                    background: auctionStage === 'bidding' ? '#f3e5f5' : auctionStage === 'processing' ? '#e8f5e9' : '#f5f5f5',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                    border: auctionStage === 'bidding' ? '3px solid #7b1fa2' : auctionStage === 'processing' ? '3px solid #4caf50' : '2px solid #ccc',
                    fontSize: 24,
                    animation: auctionStage === 'bidding' ? 'pulse 1.5s infinite' : 'none',
                    transition: 'all 0.3s'
                  }}>
                    {auctionStage === 'processing' ? '✅' : '💰'}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#000' }}>Bidding</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                    {auctionStage === 'bidding' ? `${activeBids.length}/3 models` : auctionStage === 'processing' ? 'Winners selected' : 'Waiting...'}
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ fontSize: 24, color: '#0066cc', flex: '0 0 auto' }}>→</div>

                {/* Step 4: Results */}
                <div style={{ textAlign: 'center', flex: '1 1 120px' }}>
                  <div style={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: '50%', 
                    background: auctionStage === 'processing' ? '#e8f5e9' : '#f5f5f5',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto 8px',
                    border: auctionStage === 'processing' ? '3px solid #388e3c' : '2px solid #ccc',
                    fontSize: 24,
                    animation: auctionStage === 'processing' ? 'pulse 2s infinite' : 'none',
                    transition: 'all 0.3s',
                    opacity: auctionStage === 'processing' ? 1 : 0.5
                  }}>
                    ✅
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#000' }}>Results</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                    {auctionStage === 'processing' ? 'Processing...' : 'Pending'}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            <div style={{ 
              background: '#f5f5f5', 
              padding: 16, 
              borderRadius: 8,
              fontSize: 13,
              color: '#333'
            }}>
              {auctionStage === 'classifying' && (
                <>
                  <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>📊</span>
                    <span>Classifying prompts into tiers (Low/Medium/High complexity)...</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🔍</span>
                    <span>Analyzing prompt characteristics and requirements...</span>
                  </div>
                </>
              )}
              {auctionStage === 'bidding' && (
                <>
                  <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>💰</span>
                    <span>Models calculating bids based on price, latency, and capabilities...</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>⚡</span>
                    <span>Comparing bids and selecting winners...</span>
                  </div>
                </>
              )}
              {auctionStage === 'processing' && (
                <>
                  <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>✅</span>
                    <span>Winners selected! Processing responses...</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>📈</span>
                    <span>Calculating savings and generating final results...</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {bulkResults && !bulkLoading && (
          <div>
            {/* Summary Card */}
            <div style={{
              background: '#e3f2fd',
              padding: 16,
              borderRadius: 8,
              marginBottom: 16,
              border: '1px solid #90caf9'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, color: '#000' }}>Marketplace Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, fontSize: 14 }}>
                <div>
                  <div style={{ color: '#666', fontSize: 12 }}>Total Prompts</div>
                  <div style={{ color: '#000', fontWeight: 600, fontSize: 20 }}>{bulkResults.summary.totalPrompts}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 12 }}>Total Cost</div>
                  <div style={{ color: '#000', fontWeight: 600, fontSize: 20 }}>${bulkResults.summary.totalCost.toFixed(6)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 12 }}>Agona Revenue</div>
                  <div style={{ color: '#2e7d32', fontWeight: 600, fontSize: 20 }}>${bulkResults.summary.agonaRevenue.toFixed(6)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: 12 }}>Model Revenue</div>
                  <div style={{ color: '#1976d2', fontWeight: 600, fontSize: 20 }}>${bulkResults.summary.modelRevenue.toFixed(6)}</div>
                </div>
              </div>
            </div>

            {/* Model Characteristics Info */}
            <div style={{ 
              background: '#f0f7ff', 
              padding: 16, 
              borderRadius: 8, 
              marginBottom: 16,
              border: '1px solid #b3d9ff'
            }}>
              <h4 style={{ marginTop: 0, marginBottom: 12, fontSize: 14, fontWeight: 600, color: '#000' }}>
                Model Characteristics:
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#000', marginBottom: 4 }}>OpenAI GPT-4o-mini</div>
                  <div style={{ color: '#666' }}>Quality: <span style={{ color: '#2e7d32', fontWeight: 600 }}>High</span></div>
                  <div style={{ color: '#666' }}>Price: <span style={{ color: '#d32f2f', fontWeight: 600 }}>High</span></div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#000', marginBottom: 4 }}>Cloudflare Llama 3.1</div>
                  <div style={{ color: '#666' }}>Quality: <span style={{ color: '#2e7d32', fontWeight: 600 }}>High</span></div>
                  <div style={{ color: '#666' }}>Price: <span style={{ color: '#2e7d32', fontWeight: 600 }}>Low</span></div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#000', marginBottom: 4 }}>Cloudflare Mistral 7B</div>
                  <div style={{ color: '#666' }}>Quality: <span style={{ color: '#f57c00', fontWeight: 600 }}>Medium</span></div>
                  <div style={{ color: '#666' }}>Price: <span style={{ color: '#2e7d32', fontWeight: 600 }}>Low</span></div>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div style={{ marginBottom: 16, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#000' }}>Prompt</th>
                    <th style={{ textAlign: 'center', padding: '10px', fontWeight: 600, color: '#000' }}>Tier</th>
                    <th style={{ textAlign: 'left', padding: '10px', fontWeight: 600, color: '#000' }}>Winner</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontWeight: 600, color: '#000', fontFamily: 'monospace' }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontWeight: 600, color: '#000', fontFamily: 'monospace' }}>Market Price</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontWeight: 600, color: '#000', fontFamily: 'monospace' }}>Savings</th>
                    <th style={{ textAlign: 'right', padding: '10px', fontWeight: 600, color: '#000', fontFamily: 'monospace' }}>Agona Cut</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResults.results.map((result, idx) => {
                    const tierColors = { low: '#c8e6c9', medium: '#fff9c4', high: '#ffccbc' };
                    const tierLabels = { low: 'Low', medium: 'Medium', high: 'High' };
                    const qualityColors = { high: '#2e7d32', medium: '#f57c00', low: '#d32f2f' };
                    const qualityLabels = { high: 'High', medium: 'Medium', low: 'Low' };
                    return (
                      <tr key={result.promptId} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px', color: '#333', maxWidth: '200px' }}>
                          <div style={{ fontWeight: 500, marginBottom: 4 }}>{result.prompt}</div>
                          <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                            {result.winner.answer.substring(0, 60)}...
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            backgroundColor: tierColors[result.tier],
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#333',
                            display: 'inline-block',
                            marginBottom: 4
                          }}>
                            {tierLabels[result.tier]}
                          </span>
                          {result.tierReason && (
                            <div style={{ fontSize: 9, color: '#666', marginTop: 4, fontStyle: 'italic', maxWidth: '120px' }}>
                              {result.tierReason}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px', color: '#000' }}>
                          <div style={{ fontWeight: 500, marginBottom: 4 }}>{result.winner.modelName}</div>
                          <div style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>
                            Quality: <span style={{ color: qualityColors[result.winner.quality], fontWeight: 600 }}>
                              {qualityLabels[result.winner.quality]}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: '#666', fontStyle: 'italic' }}>
                            {result.winner.rationale}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px', fontFamily: 'monospace', color: '#000', fontWeight: 600 }}>
                          ${result.winner.price_usd.toFixed(6)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px', fontFamily: 'monospace', color: '#666' }}>
                          ${result.marketPrice.toFixed(6)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px', fontFamily: 'monospace', color: '#2e7d32', fontWeight: 600 }}>
                          ${result.savingsVsMarket.toFixed(6)}
                          <div style={{ fontSize: 10, color: '#666' }}>
                            ({result.savingsPct.toFixed(1)}%)
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', padding: '10px', fontFamily: 'monospace', color: '#2e7d32', fontWeight: 600 }}>
                          ${result.agonaCut.toFixed(6)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bidding Details */}
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#0066cc', marginBottom: 8 }}>
                View Detailed Bidding Process & Alternative Offers
              </summary>
              <div style={{ marginTop: 12, fontSize: 12, background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
                {bulkResults.results.map((result) => {
                  const qualityColors = { high: '#2e7d32', medium: '#f57c00', low: '#d32f2f' };
                  const qualityLabels = { high: 'High', medium: 'Medium', low: 'Low' };
                  return (
                        <div key={result.promptId} style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #ddd' }}>
                          <div style={{ fontWeight: 600, marginBottom: 8, color: '#000', fontSize: 14 }}>
                            {result.prompt}
                          </div>
                          {result.tierReason && (
                            <div style={{ 
                              marginBottom: 12, 
                              padding: '8px 12px', 
                              background: '#f0f7ff', 
                              borderRadius: 6, 
                              fontSize: 11, 
                              color: '#666',
                              borderLeft: '3px solid #0066cc'
                            }}>
                              <strong style={{ color: '#000' }}>Tier Classification:</strong> {result.tier} — {result.tierReason}
                            </div>
                          )}
                      
                      {/* Winner Card */}
                      <div style={{
                        background: '#e8f5e9',
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 12,
                        border: '2px solid #4caf50'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#000', fontSize: 13 }}>
                              🏆 Winner: {result.winner.modelName}
                            </div>
                            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                              Quality: <span style={{ color: qualityColors[result.winner.quality], fontWeight: 600 }}>
                                {qualityLabels[result.winner.quality]}
                              </span> | 
                              Price: <span style={{ fontWeight: 600 }}>${result.winner.price_usd.toFixed(6)}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: '#666' }}>Bid Score</div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: '#2e7d32' }}>{result.winner.bidScore}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#333', fontStyle: 'italic', marginTop: 4 }}>
                          Why chosen: {result.winner.rationale}
                        </div>
                        {result.savingsVsMarket > 0 && (
                          <div style={{ marginTop: 8, padding: 8, background: '#fff', borderRadius: 4, fontSize: 11 }}>
                            <div style={{ fontWeight: 600, color: '#000', marginBottom: 4 }}>💰 Savings vs Market:</div>
                            <div style={{ color: '#2e7d32', fontWeight: 600 }}>
                              Saved ${result.savingsVsMarket.toFixed(6)} ({result.savingsPct.toFixed(1)}%) compared to market price of ${result.marketPrice.toFixed(6)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Alternative Offers */}
                      {result.alternativeBids && result.alternativeBids.length > 0 && (
                        <div>
                          <div style={{ fontWeight: 600, color: '#000', marginBottom: 8, fontSize: 13 }}>
                            Other Offers Received:
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {result.alternativeBids.map((bid, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '10px',
                                  borderRadius: 6,
                                  backgroundColor: '#fff',
                                  border: '1px solid #ddd',
                                  fontSize: 11,
                                  flex: '1 1 200px'
                                }}
                              >
                                <div style={{ fontWeight: 600, color: '#000', marginBottom: 4 }}>{bid.modelName}</div>
                                <div style={{ color: '#666', fontSize: 10, marginBottom: 2 }}>
                                  Quality: <span style={{ color: qualityColors[bid.quality], fontWeight: 600 }}>
                                    {qualityLabels[bid.quality]}
                                  </span>
                                </div>
                                <div style={{ color: '#666', fontSize: 10, marginBottom: 2 }}>
                                  Price: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${bid.estimatedPrice.toFixed(6)}</span>
                                </div>
                                <div style={{ color: '#666', fontSize: 10, fontStyle: 'italic', marginTop: 4 }}>
                                  {bid.rationale}
                                </div>
                                {bid.estimatedPrice > result.winner.price_usd && (
                                  <div style={{ marginTop: 6, padding: 4, background: '#fff3cd', borderRadius: 4, fontSize: 10, color: '#856404' }}>
                                    +${(bid.estimatedPrice - result.winner.price_usd).toFixed(6)} more expensive
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
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
