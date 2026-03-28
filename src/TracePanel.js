import React, { useEffect, useRef } from "react";

export default function TracePanel({
  traceLog, result, simCurrent, acceptStates, startState, states, transitions, convertLog,
}) {
  const traceRef = useRef(null);

  useEffect(() => {
    if (traceRef.current) traceRef.current.scrollTop = traceRef.current.scrollHeight;
  }, [traceLog]);

  const alphabet = new Set();
  Object.values(transitions).forEach((t) => Object.keys(t).forEach((s) => alphabet.add(s)));

  return (
    <div className="sidebar-right">
      {/* Active States */}
      <div className="panel">
        <div className="panel-title">Active States</div>
        <div className="active-states">
          {simCurrent.length > 0 ? simCurrent.map((s) => (
            <span key={s} className={`tag ${acceptStates.includes(s) ? "accept" : s === startState ? "start" : "active"}`}>
              {s}
            </span>
          )) : <span className="hint">∅ dead state</span>}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`result-box ${result}`}>
          {result === "accepted" ? "✓ Accepted" : "✗ Rejected"}
          <div className="result-sub">
            {result === "accepted"
              ? `Reached accept state: ${simCurrent.filter((s) => acceptStates.includes(s)).join(", ")}`
              : simCurrent.length === 0
                ? "Dead state — no valid transitions"
                : "Did not reach an accept state"}
          </div>
        </div>
      )}

      {/* Trace */}
      <div className="panel" style={{ flex: 1 }}>
        <div className="panel-title">Step Trace</div>
        <div className="trace-scroll" ref={traceRef}>
          {traceLog.length === 0 ? (
            <span className="hint">Run or step to see trace</span>
          ) : traceLog.map((entry, i) => (
            <div key={i} className={`trace-entry ${entry.ok ? "ok" : "fail"}`}>
              <span className="trace-op">δ(</span>
              <span className="trace-state">{entry.from}</span>
              <span className="trace-op">,</span>
              <span className="trace-sym">{entry.sym}</span>
              <span className="trace-op">)</span>
              <span className="trace-arrow">→</span>
              <span className="trace-state">{entry.to}</span>
            </div>
          ))}
        </div>
      </div>

      {/* NFA→DFA Log */}
      <div className="panel">
        <div className="panel-title">NFA→DFA Log</div>
        <div className="convert-log">
          {convertLog.length === 0 ? (
            <span className="hint">No conversion run yet</span>
          ) : convertLog.map((line, i) => (
            <div key={i} className={`log-line ${line.includes("[ACCEPT]") ? "log-accept" : ""}`}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
