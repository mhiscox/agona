"use client";
import { useState } from "react";

export default function Test() {
  const [prompt, setPrompt] = useState("In one sentence, what does agona do?");
  const [json, setJson] = useState(null);
  const [loading, setLoading] = useState(false);

  async function send(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const j = await r.json();
      setJson(j);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h2>agona — marketplace test</h2>
      <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <button disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Running..." : "Send"}
        </button>
      </form>

      {json && (
        <>
          <h3 style={{ marginTop: 24 }}>Winner</h3>
          <pre style={{ background: "#f6f8fa", padding: 12 }}>
{JSON.stringify({ winner: json.winner, latency_ms: json.latency_ms, model_id: json.model_id, answer: json.answer }, null, 2)}
          </pre>

          <h3>All providers</h3>
          <table cellPadding="6" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">Provider</th>
                <th align="left">Model</th>
                <th align="right">Latency (ms)</th>
                <th align="left">OK</th>
                <th align="left">Score</th>
              </tr>
            </thead>
            <tbody>
              {json.results?.map((r, i) => (
                <tr key={i} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td>{r.id}</td>
                  <td>{r.model_id}</td>
                  <td align="right">{r.latency_ms}</td>
                  <td>{String(r.ok)}</td>
                  <td>{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}