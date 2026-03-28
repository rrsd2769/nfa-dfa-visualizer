import React, { useState, useRef, useEffect, useCallback } from "react";

const NODE_R = 28;

function useNodePositions(states) {
  const [positions, setPositions] = useState({});

  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      // Remove stale
      Object.keys(next).forEach((s) => {
        if (!states.includes(s)) delete next[s];
      });
      // Lay out new
      const newStates = states.filter((s) => !next[s]);
      if (!newStates.length) return next;
      const cx = 400, cy = 280, r = Math.min(280, 60 + states.length * 40);
      newStates.forEach((s) => {
        const i = states.indexOf(s);
        const angle = (2 * Math.PI * i) / states.length - Math.PI / 2;
        next[s] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      });
      return next;
    });
  }, [states]);

  return [positions, setPositions];
}

function getEdgePath(from, to, positions, transitions) {
  const f = positions[from], t = positions[to];
  if (!f || !t) return "";

  if (from === to) {
    // Self-loop
    const x = f.x, y = f.y;
    return `M${x - 10},${y - NODE_R} C${x - 50},${y - NODE_R - 60} ${x + 50},${y - NODE_R - 60} ${x + 10},${y - NODE_R}`;
  }

  const dx = t.x - f.x, dy = t.y - f.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / dist, uy = dy / dist;

  // Curve if reverse edge exists
  const hasReverse = Object.values(transitions[to] || {}).some((arr) => arr.includes(from));
  const curveAmt = hasReverse ? 40 : 0;
  const nx = -uy, ny = ux;
  const qx = (f.x + t.x) / 2 + nx * curveAmt;
  const qy = (f.y + t.y) / 2 + ny * curveAmt;

  const sx = f.x + ux * NODE_R, sy = f.y + uy * NODE_R;
  const ex = t.x - ux * (NODE_R + 6), ey = t.y - uy * (NODE_R + 6);

  return `M${sx},${sy} Q${qx},${qy} ${ex},${ey}`;
}

function getMidpoint(from, to, positions, transitions) {
  const f = positions[from], t = positions[to];
  if (!f || !t) return { x: 0, y: 0 };
  if (from === to) return { x: f.x, y: f.y - NODE_R - 38 };
  const hasReverse = Object.values(transitions[to] || {}).some((arr) => arr.includes(from));
  const curveAmt = hasReverse ? 40 : 0;
  const dx = t.x - f.x, dy = t.y - f.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / dist, ny = dx / dist;
  return { x: (f.x + t.x) / 2 + nx * curveAmt, y: (f.y + t.y) / 2 + ny * curveAmt };
}

export default function Graph({
  states, transitions, acceptStates, startState,
  activeStates, activeEdges, visitedEdges,
}) {
  const svgRef = useRef(null);
  const [positions, setPositions] = useNodePositions(states);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Build edge map: group transitions by (from, to)
  const edgeMap = {};
  states.forEach((from) => {
    if (!transitions[from]) return;
    Object.entries(transitions[from]).forEach(([sym, targets]) => {
      targets.forEach((to) => {
        const key = `${from}→${to}`;
        if (!edgeMap[key]) edgeMap[key] = { from, to, syms: [] };
        edgeMap[key].syms.push(sym);
      });
    });
  });

  const onMouseDown = useCallback((e, state) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const sx = svg.viewBox.baseVal.width / rect.width;
    const sy = svg.viewBox.baseVal.height / rect.height;
    const pos = positions[state];
    setDragging(state);
    setDragOffset({ x: (e.clientX - rect.left) * sx - pos.x, y: (e.clientY - rect.top) * sy - pos.y });
  }, [positions]);

  const onMouseMove = useCallback((e) => {
    if (!dragging) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const sx = svg.viewBox.baseVal.width / rect.width;
    const sy = svg.viewBox.baseVal.height / rect.height;
    setPositions((prev) => ({
      ...prev,
      [dragging]: {
        x: (e.clientX - rect.left) * sx - dragOffset.x,
        y: (e.clientY - rect.top) * sy - dragOffset.y,
      },
    }));
  }, [dragging, dragOffset, setPositions]);

  const onMouseUp = useCallback(() => setDragging(null), []);

  return (
    <div className="canvas-area">
      <svg
        ref={svgRef}
        viewBox="0 0 800 560"
        style={{ width: "100%", height: "100%" }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        <defs>
          <marker id="arr-default" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M1 1L9 5L1 9" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker id="arr-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M1 1L9 5L1 9" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker id="arr-visited" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M1 1L9 5L1 9" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Edges */}
        <g>
          {Object.entries(edgeMap).map(([key, { from, to, syms }]) => {
            const isActive = activeEdges.has(key);
            const isVisited = visitedEdges.has(key);
            const color = isActive ? "#38bdf8" : isVisited ? "#22c55e" : "#374151";
            const marker = isActive ? "url(#arr-active)" : isVisited ? "url(#arr-visited)" : "url(#arr-default)";
            const sw = isActive ? 2.5 : isVisited ? 1.5 : 1;
            const mid = getMidpoint(from, to, positions, transitions);
            const path = getEdgePath(from, to, positions, transitions);
            return (
              <g key={key}>
                <path
                  d={path} fill="none" stroke={color} strokeWidth={sw}
                  markerEnd={marker}
                  filter={isActive ? "url(#glow-blue)" : "none"}
                  style={{ transition: "stroke .3s, stroke-width .3s" }}
                />
                <text
                  x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="central"
                  fill={isActive ? "#7dd3fc" : isVisited ? "#86efac" : "#64748b"}
                  fontSize="11" fontFamily="'JetBrains Mono', monospace"
                >
                  {syms.join(",")}
                </text>
              </g>
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {/* Start arrow */}
          {positions[startState] && (
            <line
              x1={positions[startState].x - NODE_R - 30}
              y1={positions[startState].y}
              x2={positions[startState].x - NODE_R - 2}
              y2={positions[startState].y}
              stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arr-visited)"
            />
          )}

          {states.map((s) => {
            const p = positions[s];
            if (!p) return null;
            const isActive = activeStates.includes(s);
            const isAccept = acceptStates.includes(s);
            const fill = isActive ? "#0d2a1a" : "#111827";
            const stroke = isActive ? "#22c55e" : isAccept ? "#f59e0b" : "#334155";
            const textColor = isActive ? "#86efac" : "#cbd5e1";

            return (
              <g key={s} style={{ cursor: "grab" }}
                onMouseDown={(e) => onMouseDown(e, s)}>
                {/* Glow ring */}
                {isActive && (
                  <circle cx={p.x} cy={p.y} r={NODE_R + 10}
                    fill="none" stroke="#38bdf8" strokeWidth="2"
                    opacity="0.4" filter="url(#glow-blue)" />
                )}
                {/* Accept double ring */}
                {isAccept && (
                  <circle cx={p.x} cy={p.y} r={NODE_R + 5}
                    fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.8" />
                )}
                {/* Main circle */}
                <circle cx={p.x} cy={p.y} r={NODE_R}
                  fill={fill} stroke={stroke} strokeWidth={isActive ? 2 : 1.5}
                  style={{ transition: "fill .3s, stroke .3s" }} />
                {/* Label */}
                <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                  fill={textColor} fontSize="13" fontWeight="500"
                  fontFamily="'JetBrains Mono', monospace"
                  style={{ pointerEvents: "none", transition: "fill .3s" }}>
                  {s}
                </text>
                {/* Accept star */}
                {isAccept && (
                  <text x={p.x + 20} y={p.y - 20} fill="#fbbf24" fontSize="10"
                    style={{ pointerEvents: "none" }}>★</text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="canvas-hint">Drag nodes • Right-click to toggle accept • Double-click to delete</div>
    </div>
  );
}
