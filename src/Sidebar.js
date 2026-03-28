import React, { useState } from "react";

export default function Sidebar({
  states, acceptStates, startState, transitions, inputStr, simIndex, mode,
  onAddState, onRemoveState, onToggleAccept, onSetStart,
  onAddTransition, onRemoveTransition, onUpdateTransition,
  onInputChange, onExport, onImport,
}) {
  const [newStateName, setNewStateName] = useState("");
  const [stateError, setStateError] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState(false);

  // Build flat list of transitions for display
  const transRows = [];
  states.forEach((from) => {
    if (!transitions[from]) return;
    Object.entries(transitions[from]).forEach(([sym, targets]) => {
      targets.forEach((to) => transRows.push({ from, sym, to }));
    });
  });

  const handleAddState = () => {
    if (!onAddState(newStateName.trim())) {
      setStateError(true);
      setTimeout(() => setStateError(false), 1000);
    } else {
      setNewStateName("");
    }
  };

  const handleAddTrans = () => {
    if (states.length >= 1) {
      onAddTransition(states[0], "a", states[0]);
    }
  };

  const handleImport = () => {
    const ok = onImport(importText);
    if (ok) { setShowImport(false); setImportText(""); setImportError(false); }
    else setImportError(true);
  };

  const str = inputStr || "";

  // Collect alphabet
  const alphabet = new Set();
  Object.values(transitions).forEach((t) => Object.keys(t).forEach((s) => alphabet.add(s)));

  return (
    <div className="sidebar-left">
      {/* States */}
      <div className="panel">
        <div className="panel-title">States</div>
        <div className="input-row">
          <input className={`inp ${stateError ? "inp-error" : ""}`}
            value={newStateName} placeholder="New state (e.g. q3)"
            onChange={(e) => setNewStateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddState()} />
          <button className="btn sm" onClick={handleAddState}>Add</button>
        </div>

        <div className="tags-wrap">
          {states.map((s) => (
            <span key={s} className={`tag ${acceptStates.includes(s) ? "accept" : s === startState ? "start" : ""}`}>
              {s}
              <button className="tag-btn" onClick={() => onToggleAccept(s)} title="Toggle accept">★</button>
              <button className="tag-btn" onClick={() => onRemoveState(s)} title="Delete">✕</button>
            </span>
          ))}
        </div>

        <div className="input-row" style={{ marginTop: 8 }}>
          <label className="inp-label">Start:</label>
          <select className="inp" value={startState} onChange={(e) => onSetStart(e.target.value)}>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Transitions */}
      <div className="panel">
        <div className="panel-title">Transitions</div>
        {transRows.map((r, i) => (
          <div key={i} className="trans-row">
            <select className="inp sm-inp" value={r.from}
              onChange={(e) => onUpdateTransition(r.from, r.sym, r.to, e.target.value, r.sym, r.to)}>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input className="inp sm-inp mono" value={r.sym} placeholder="a/ε"
              onChange={(e) => onUpdateTransition(r.from, r.sym, r.to, r.from, e.target.value, r.to)} />
            <select className="inp sm-inp" value={r.to}
              onChange={(e) => onUpdateTransition(r.from, r.sym, r.to, r.from, r.sym, e.target.value)}>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn sm danger" onClick={() => onRemoveTransition(r.from, r.sym, r.to)}>✕</button>
          </div>
        ))}
        <button className="btn sm full-width" style={{ marginTop: 6 }} onClick={handleAddTrans}>
          + Add Transition
        </button>
        {mode === "NFA" && (
          <div className="hint">Use ε for epsilon transitions</div>
        )}
      </div>

      {/* Input */}
      <div className="panel">
        <div className="panel-title">Input String</div>
        <input className="inp mono" value={inputStr}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="e.g. aab" />
        <div className="step-tokens">
          {str.split("").map((c, i) => (
            <span key={i} className={`step-tok ${i < simIndex ? "done" : i === simIndex ? "current" : ""}`}>
              {c}
            </span>
          ))}
        </div>
        <div className="hint">Step: {simIndex}/{str.length}</div>
      </div>

      {/* Transition Table */}
      <div className="panel">
        <div className="panel-title">Transition Table</div>
        <div className="table-wrap">
          {alphabet.size > 0 ? (
            <table className="trans-table">
              <thead>
                <tr>
                  <th>State</th>
                  {Array.from(alphabet).sort().map((a) => <th key={a}>{a}</th>)}
                </tr>
              </thead>
              <tbody>
                {states.map((s) => (
                  <tr key={s}>
                    <td className="mono">
                      {acceptStates.includes(s) && <span style={{ color: "#fbbf24" }}>★</span>}
                      {s === startState && <span style={{ color: "#22c55e" }}>→</span>}
                      {" "}{s}
                    </td>
                    {Array.from(alphabet).sort().map((a) => (
                      <td key={a} className="mono">
                        {(transitions[s]?.[a] || []).join(",") || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <span className="hint">No transitions defined</span>
          )}
        </div>
      </div>

      {/* Import/Export */}
      <div className="panel">
        <div className="panel-title">Import / Export</div>
        <div className="btn-row">
          <button className="btn sm" style={{ flex: 1 }} onClick={onExport}>Export JSON</button>
          <button className="btn sm" style={{ flex: 1 }} onClick={() => setShowImport(!showImport)}>
            Import JSON
          </button>
        </div>
        {showImport && (
          <div style={{ marginTop: 8 }}>
            <textarea className={`inp mono ${importError ? "inp-error" : ""}`}
              rows={5} value={importText} placeholder="Paste JSON..."
              onChange={(e) => { setImportText(e.target.value); setImportError(false); }} />
            <button className="btn sm primary full-width" style={{ marginTop: 6 }} onClick={handleImport}>
              Load
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
