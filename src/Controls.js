import React from "react";

export default function Controls({
  mode, setMode, speed, setSpeed,
  simStatus, onRun, onStep, onReset, onConvert,
}) {
  const statusColor = { idle: "#64748b", running: "#38bdf8", done: simStatus === "done" ? "#22c55e" : "#64748b" };
  const statusLabel = simStatus.toUpperCase();

  return (
    <div className="topbar">
      <h1 className="topbar-title">⊕ Automata Lab</h1>

      <span className="badge mode-badge">{mode}</span>
      <span className="badge status-badge" style={{ color: statusColor[simStatus] }}>{statusLabel}</span>

      <div className="topbar-spacer" />

      {/* Mode toggle */}
      <div className="tab-group">
        <button className={`tab ${mode === "DFA" ? "active" : ""}`} onClick={() => setMode("DFA")}>DFA</button>
        <button className={`tab ${mode === "NFA" ? "active" : ""}`} onClick={() => setMode("NFA")}>NFA</button>
      </div>

      {/* Speed */}
      <div className="speed-group">
        <span className="speed-label">Speed</span>
        <input type="range" min="200" max="1500" value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value))}
          style={{ accentColor: "#38bdf8" }} />
      </div>

      {/* Sim buttons */}
      <button className="ctrl-btn" onClick={onRun} disabled={simStatus === "running"}>
        ▶ Run
      </button>
      <button className="ctrl-btn" onClick={onStep} disabled={simStatus === "running"}>
        ⏭ Step
      </button>
      <button className="ctrl-btn" onClick={onReset}>
        ↺ Reset
      </button>
      <button className="ctrl-btn primary" onClick={onConvert} title="Convert NFA to DFA">
        NFA→DFA
      </button>
    </div>
  );
}
