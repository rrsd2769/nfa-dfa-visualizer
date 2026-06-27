#  NFA / DFA Visualizer

An interactive browser-based tool for building, simulating, and converting finite automata. Design NFA or DFA graphs through a point-and-click interface, step through input strings with live visual feedback, and convert any NFA to an equivalent DFA using the subset construction algorithm : all in real time.

**Live Demo → [nfa-dfa-visualizer-sigma.vercel.app](https://nfa-dfa-visualizer-sigma.vercel.app)**

---

## Features

- **Dual-mode automaton editor** : switch between NFA and DFA mode at any time
- **Interactive graph canvas** : drag nodes to rearrange; self-loops and curved reverse edges render automatically
- **ε-transition support** : define epsilon transitions in NFA mode; ε-closure is computed automatically during simulation
- **Step-by-step simulation** : advance one symbol at a time or run the full input at a configurable speed
- **Live step trace** : right panel logs every δ(state, symbol) → next-state transition as it happens
- **NFA → DFA conversion** : one-click subset construction with a full conversion log showing every powerset state and its transitions
- **Transition table** : always-visible δ table in the sidebar updates live as you add or remove transitions
- **Import / Export** : save your automaton as JSON and reload it in a future session
- **Input string tokenizer** : each character of the input string is highlighted as the simulation progresses

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 (Create React App) |
| Language | JavaScript (ES2020+) |
| Rendering | SVG (custom, no graph library) |
| Styling | Plain CSS with CSS custom properties |
| Fonts | JetBrains Mono, DM Sans (Google Fonts) |
| Deployment | Vercel |
| Node target | 20.x |

No external graph or animation libraries are used. All state graph rendering, edge routing, and simulation logic is written from scratch.

---

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm

### Installation

```bash
git clone https://github.com/rrsd2769/nfa-dfa-visualizer.git
cd nfa-dfa-visualizer
npm install
```

### Run locally

```bash
npm start
```

Opens at `http://localhost:3000`. The app hot-reloads on file changes.

### Production build

```bash
npm run build
```

Output goes to the `build/` directory, ready to serve from any static host.

---

## Project Structure

```
src/
├── App.js          # Root component : owns all state, wires simulation & conversion
├── Controls.js     # Top bar : mode toggle, speed slider, Run / Step / Reset / Convert buttons
├── Sidebar.js      # Left panel : state manager, transition editor, input string, transition table, import/export
├── Graph.js        # Centre canvas : SVG graph with draggable nodes and animated edges
├── TracePanel.js   # Right panel : active states display, accept/reject result, step trace, NFA→DFA log
├── simulator.js    # Pure logic : epsilonClosure, stepSimulation, nfaToDFA (subset construction)
├── styles.css      # All component styles via CSS custom properties
└── index.css       # Google Fonts import and body reset
```

---

## Architecture

### State management (`App.js`)

All automaton and simulation state lives in a single top-level component and is passed down as props. There is no external state library.

The core automaton is represented as:

```js
states        // string[]           — ordered list of state names
startState    // string             — name of the start state
acceptStates  // string[]           — subset of states that are accepting
transitions   // { [from]: { [symbol]: string[] } }  — adjacency map
```

Transitions are stored as arrays of targets per symbol, so the same structure works for both DFA (exactly one target) and NFA (zero or more targets, including ε).

Simulation state is separate:

```js
simCurrent    // string[]   — current active states (array to support NFA parallel execution)
simIndex      // number     — index into the input string
activeEdges   // Set<string> — edges firing in the current step, for highlighting
visitedEdges  // Set<string> — edges fired so far, for persistent trail
traceLog      // object[]   — accumulated δ(from, sym) → to records
```

### Graph rendering (`Graph.js`)

Nodes are positioned in a circle on first render and can be freely dragged. Positions are stored in local state (`useNodePositions`) and updated via SVG-coordinate mouse events.

Edges are built by grouping all transitions that share the same `(from, to)` pair into a single path, with their symbols joined (e.g. `a,b`). Two geometric cases:

- **Self-loop** : cubic Bézier anchored above the node
- **Straight / curved edge** : quadratic Bézier; curves away from the baseline if a reverse edge exists in the same graph, so antiparallel transitions don't overlap

Active edges glow blue; visited (already-traversed) edges glow green. Transitions are achieved with CSS `transition` on `stroke` and `stroke-width`.

### Simulation engine (`simulator.js`)

#### `epsilonClosure(stateSet, transitions)`

Iterative DFS over all ε-transitions reachable from the given set. Used both during simulation (before and after each symbol step in NFA mode) and during NFA-to-DFA conversion.

```
ε-closure({q0}) — returns all states reachable from q0 via zero or more ε-moves
```

#### `stepSimulation(currentStates, transitions, symbol)`

Given the current active states and a symbol, returns:
- `next` — union of all δ(s, symbol) targets across every active state
- `edges` — list of `"from→to"` edge keys that fired, used for graph highlighting

#### `nfaToDFA(states, startState, acceptStates, transitions)`

Standard powerset (subset) construction:

1. Start state = ε-closure({original start state})
2. For each unprocessed DFA state (a set of NFA states), and for each alphabet symbol (ε excluded):
   - Compute `move(current_set, symbol)` — union of all NFA transitions
   - Compute ε-closure of the result
   - That closure becomes a new DFA state (if not already seen)
3. A DFA state is accepting if any of its constituent NFA states is accepting
4. States are named using set notation: `{q0,q1}`, `∅` for the dead state

The function also produces a human-readable `log` array (logged to the right panel) showing each state and each `δ(state, symbol) = result` line as the algorithm runs.

---

## How to Use

### Building an automaton

- Type a state name in the States panel and press **Add** (or Enter)
- Click **★** on any state tag to toggle it as an accept state
- Use the **Start** dropdown to set the start state
- Use the **+ Add Transition** button to create transitions; edit the from-state, symbol, and to-state inline
- In **NFA mode**, type `ε` as the symbol to add an epsilon transition

### Simulating

1. Type an input string in the **Input String** panel
2. Press **▶ Run** to animate the full simulation at the selected speed, or **⏭ Step** to advance one symbol at a time
3. Watch the active node and edges highlight in real time
4. The right panel shows the current active states and a running trace of every transition taken
5. On completion, a result box shows **✓ Accepted** or **✗ Rejected** with the reason

### NFA → DFA conversion

1. Switch to **NFA** mode and build your NFA (including ε-transitions if needed)
2. Press **NFA→DFA** in the top bar
3. The automaton is replaced in-place with the equivalent DFA produced by subset construction
4. The **NFA→DFA Log** in the right panel shows every step of the powerset expansion

### Import / Export

- **Export JSON** downloads `automaton.json` containing `{ mode, states, startState, acceptStates, transitions, alphabet }`
- **Import JSON** accepts that same format; paste into the textarea and click **Load**

---

## JSON Format

```json
{
  "mode": "NFA",
  "states": ["q0", "q1", "q2"],
  "startState": "q0",
  "acceptStates": ["q2"],
  "transitions": {
    "q0": { "a": ["q0", "q1"] },
    "q1": { "b": ["q2"] }
  },
  "alphabet": ["a", "b"]
}
```

For epsilon transitions, use `"ε"` as the symbol key.

---

## Default Example

The app loads with a simple DFA pre-built:

- States: `q0`, `q1`, `q2`
- Start: `q0`, Accept: `q2`
- Transitions: `q0 –a→ q1`, `q1 –b→ q2`
- Accepts strings matching the pattern `ab`

---

## Deployment

The app is deployed on Vercel. Any push to `master` triggers a new production deployment automatically via Vercel's GitHub integration.

To deploy your own fork:

1. Import the repository into [vercel.com](https://vercel.com)
2. Vercel detects Create React App automatically — no configuration needed
3. Set Node.js version to **20.x** in Project Settings → General if not auto-detected

---

## License

MIT
