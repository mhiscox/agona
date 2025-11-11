'use client';

import { useState } from 'react';

export default function LiveDemo() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState('In one sentence, what does agona do?');

  const runDemo = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

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

  const sortedResults = results?.results 
    ? [...results.results].sort((a, b) => (b.score || 0) - (a.score || 0))
    : [];

  return (
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
      
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
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
        <button
          onClick={runDemo}
          disabled={loading || !prompt.trim()}
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
          marginBottom: 16
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 24, color: '#666' }}>
          <p>Sending request to 3 models simultaneously...</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>⏳ Waiting for responses...</p>
        </div>
      )}

      {results && !loading && (
        <div>
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
            <p style={{ margin: 0, color: '#333' }}>{results.answer || 'No answer'}</p>
            {results.latency_ms && (
              <p style={{ margin: '8px 0 0 0', fontSize: 14, color: '#666' }}>
                ⚡ {results.latency_ms}ms | 💰 ${results.savings_usd?.toFixed(6) || '0.000000'} saved
              </p>
            )}
          </div>

          <h3 style={{ fontSize: 18, marginBottom: 12, color: '#000' }}>Ranking & Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedResults.map((result, index) => {
              const isWinner = result.id === results.winner;
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
              
              return (
                <div
                  key={result.id}
                  style={{
                    background: isWinner ? '#fff' : '#f5f5f5',
                    padding: 16,
                    borderRadius: 8,
                    border: isWinner ? '2px solid #4caf50' : '1px solid #ddd',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{medal}</span>
                    <strong style={{ color: '#000' }}>{result.id}</strong>
                    {isWinner && <span style={{ fontSize: 12, color: '#4caf50', fontWeight: 'bold' }}>WINNER</span>}
                  </div>
                  
                  <div style={{ fontSize: 14, color: '#666' }}>
                    {result.ok ? (
                      <>
                        <div>Answer: {result.answer || 'N/A'}</div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                          {result.latency_ms !== undefined && (
                            <span>⚡ {result.latency_ms}ms</span>
                          )}
                          {result.price_usd !== undefined && (
                            <span>💰 ${result.price_usd.toFixed(6)}</span>
                          )}
                          <span>⭐ Score: {result.score?.toFixed(1) || '0'}</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: '#c00' }}>
                        ❌ Failed: {result.error || 'No response'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {results.savings_usd > 0 && (
            <div style={{
              marginTop: 16,
              padding: 12,
              background: '#e3f2fd',
              borderRadius: 8,
              fontSize: 14,
              color: '#1976d2'
            }}>
              💵 Saved ${results.savings_usd.toFixed(6)} vs next best option
              {results.savings_pct && ` (${results.savings_pct.toFixed(1)}% savings)`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

