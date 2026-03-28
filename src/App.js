import React, { useState, useCallback, useRef } from "react";
import Graph from "./Graph";
import Controls from "./Controls";
import Sidebar from "./Sidebar";
import TracePanel from "./TracePanel";
import { stepSimulation, epsilonClosure, nfaToDFA } from "./simulator";
import "./styles.css";

const DEFAULT_STATES = ["q0", "q1", "q2"];
const DEFAULT_ACCEPT = ["q2"];
const DEFAULT_START = "q0";
const DEFAULT_TRANSITIONS = { q0: { a: ["q1"] }, q1: { b: ["q2"] } };

export default function App() {
  const [mode, setMode] = useState("DFA"); // "DFA" | "NFA"
  const [states, setStates] = useState(DEFAULT_STATES);
  const [acceptStates, setAcceptStates] = useState(DEFAULT_ACCEPT);
  const [startState, setStartState] = useState(DEFAULT_START);
  const [transitions, setTransitions] = useState(DEFAULT_TRANSITIONS);

  const [inputStr, setInputStr] = useState("ab");
  const [simIndex, setSimIndex] = useState(0);
  const [simCurrent, setSimCurrent] = useState([DEFAULT_START]);
  const [activeEdges, setActiveEdges] = useState(new Set());
  const [visitedEdges, setVisitedEdges] = useState(new Set());
  const [traceLog, setTraceLog] = useState([]);
  const [result, setResult] = useState(null); // null | "accepted" | "rejected"
  const [simStatus, setSimStatus] = useState("idle"); // idle | running | done
  const [convertLog, setConvertLog] = useState([]);
  const [speed, setSpeed] = useState(700);

  const simRef = useRef({ index: 0, current: [DEFAULT_START], running: false, interval: null });

  // ---- State Management ----
  const addState = useCallback((name) => {
    if (!name || states.includes(name)) return false;
    setStates((prev) => [...prev, name]);
    return true;
  }, [states]);

  const removeState = useCallback((s) => {
    setStates((prev) => prev.filter((x) => x !== s));
    setAcceptStates((prev) => prev.filter((x) => x !== s));
    setStartState((prev) => (prev === s ? states.filter((x) => x !== s)[0] || "" : prev));
    setTransitions((prev) => {
      const next = { ...prev };
      delete next[s];
      Object.keys(next).forEach((from) => {
        Object.keys(next[from]).forEach((sym) => {
          next[from][sym] = next[from][sym].filter((t) => t !== s);
          if (!next[from][sym].length) delete next[from][sym];
        });
        if (!Object.keys(next[from]).length) delete next[from];
      });
      return next;
    });
  }, [states]);

  const toggleAccept = useCallback((s) => {
    setAcceptStates((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }, []);

  const addTransition = useCallback((from, sym, to) => {
    setTransitions((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[from]) next[from] = {};
      if (!next[from][sym]) next[from][sym] = [];
      if (!next[from][sym].includes(to)) next[from][sym].push(to);
      return next;
    });
  }, []);

  const removeTransition = useCallback((from, sym, to) => {
    setTransitions((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next[from]?.[sym]) {
        next[from][sym] = next[from][sym].filter((t) => t !== to);
        if (!next[from][sym].length) delete next[from][sym];
        if (!Object.keys(next[from]).length) delete next[from];
      }
      return next;
    });
  }, []);

  const updateTransition = useCallback((oldFrom, oldSym, oldTo, newFrom, newSym, newTo) => {
    setTransitions((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      // Remove old
      if (next[oldFrom]?.[oldSym]) {
        next[oldFrom][oldSym] = next[oldFrom][oldSym].filter((t) => t !== oldTo);
        if (!next[oldFrom][oldSym].length) delete next[oldFrom][oldSym];
        if (!Object.keys(next[oldFrom]).length) delete next[oldFrom];
      }
      // Add new
      if (!next[newFrom]) next[newFrom] = {};
      if (!next[newFrom][newSym]) next[newFrom][newSym] = [];
      if (!next[newFrom][newSym].includes(newTo)) next[newFrom][newSym].push(newTo);
      return next;
    });
  }, []);

  // ---- Simulation ----
  const doStep = useCallback((idx, curr, trans, str, accept, m) => {
    if (idx >= str.length) return null;
    const sym = str[idx];
    const currentWithEps = m === "NFA" ? epsilonClosure(curr, trans) : curr;
    const { next, edges } = stepSimulation(currentWithEps, trans, sym);
    const nextWithEps = m === "NFA" ? epsilonClosure(next, trans) : next;
    return { sym, from: currentWithEps, to: nextWithEps, edges, ok: nextWithEps.length > 0 };
  }, []);

  const step = useCallback(() => {
    const r = doStep(simIndex, simCurrent, transitions, inputStr, acceptStates, mode);
    if (!r) { finalize(simCurrent); return; }
    const newEdges = new Set(r.edges);
    setActiveEdges(newEdges);
    setVisitedEdges((prev) => { const n = new Set(prev); r.edges.forEach((e) => n.add(e)); return n; });
    setSimCurrent(r.to);
    setSimIndex((i) => i + 1);
    setTraceLog((prev) => [...prev, { from: r.from.join(","), sym: r.sym, to: r.to.length ? r.to.join(",") : "∅", ok: r.ok }]);
    if (simIndex + 1 >= inputStr.length) setTimeout(() => finalize(r.to), 300);
  }, [simIndex, simCurrent, transitions, inputStr, acceptStates, mode]);

  const finalize = useCallback((curr) => {
    const accepted = curr.some((s) => acceptStates.includes(s));
    setResult(accepted ? "accepted" : "rejected");
    setSimStatus("done");
    setActiveEdges(new Set());
  }, [acceptStates]);

  const run = useCallback(() => {
    reset(false);
    setSimStatus("running");
    let idx = 0;
    let curr = [startState];
    const visitedSet = new Set();

    const interval = setInterval(() => {
      const r = doStep(idx, curr, transitions, inputStr, acceptStates, mode);
      if (!r || idx >= inputStr.length) {
        clearInterval(interval);
        setActiveEdges(new Set());
        const accepted = curr.some((s) => acceptStates.includes(s));
        setResult(accepted ? "accepted" : "rejected");
        setSimStatus("done");
        return;
      }
      r.edges.forEach((e) => visitedSet.add(e));
      setActiveEdges(new Set(r.edges));
      setVisitedEdges(new Set(visitedSet));
      setSimCurrent(r.to);
      setSimIndex(idx + 1);
      setTraceLog((prev) => [...prev, { from: r.from.join(","), sym: r.sym, to: r.to.length ? r.to.join(",") : "∅", ok: r.ok }]);
      curr = r.to;
      idx++;
    }, speed);
  }, [startState, transitions, inputStr, acceptStates, mode, speed, doStep]);

  const reset = useCallback((full = true) => {
    setSimIndex(0);
    setSimCurrent([startState]);
    setActiveEdges(new Set());
    setVisitedEdges(new Set());
    if (full) { setTraceLog([]); setResult(null); }
    setSimStatus("idle");
  }, [startState]);

  // ---- NFA→DFA ----
  const handleConvert = useCallback(() => {
    const { newStates, newStart, newAccept, newTransitions, log } = nfaToDFA(
      states, startState, acceptStates, transitions
    );
    setStates(newStates);
    setStartState(newStart);
    setAcceptStates(newAccept);
    setTransitions(newTransitions);
    setConvertLog(log);
    setMode("DFA");
    reset(true);
  }, [states, startState, acceptStates, transitions, reset]);

  // ---- Import/Export ----
  const exportJSON = useCallback(() => {
    const alph = new Set();
    Object.values(transitions).forEach((t) => Object.keys(t).forEach((s) => alph.add(s)));
    const data = { mode, states, startState, acceptStates, transitions, alphabet: Array.from(alph) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "automaton.json"; a.click();
  }, [mode, states, startState, acceptStates, transitions]);

  const importJSON = useCallback((jsonStr) => {
    try {
      const d = JSON.parse(jsonStr);
      setStates(d.states || []); setAcceptStates(d.acceptStates || []);
      setStartState(d.startState || ""); setTransitions(d.transitions || {});
      if (d.mode) setMode(d.mode);
      reset(true);
      return true;
    } catch { return false; }
  }, [reset]);

  return (
    <div className="app-layout">
      <Controls
        mode={mode} setMode={setMode} speed={speed} setSpeed={setSpeed}
        simStatus={simStatus} onRun={run} onStep={step} onReset={() => reset(true)}
        onConvert={handleConvert}
      />
      <div className="main-content">
        <Sidebar
          states={states} acceptStates={acceptStates} startState={startState}
          transitions={transitions} inputStr={inputStr} simIndex={simIndex}
          mode={mode}
          onAddState={addState} onRemoveState={removeState}
          onToggleAccept={toggleAccept} onSetStart={setStartState}
          onAddTransition={addTransition} onRemoveTransition={removeTransition}
          onUpdateTransition={updateTransition}
          onInputChange={setInputStr}
          onExport={exportJSON} onImport={importJSON}
        />
        <Graph
          states={states} transitions={transitions} acceptStates={acceptStates}
          startState={startState} activeStates={simCurrent}
          activeEdges={activeEdges} visitedEdges={visitedEdges}
        />
        <TracePanel
          traceLog={traceLog} result={result} simCurrent={simCurrent}
          acceptStates={acceptStates} startState={startState}
          states={states} transitions={transitions} convertLog={convertLog}
        />
      </div>
    </div>
  );
}
