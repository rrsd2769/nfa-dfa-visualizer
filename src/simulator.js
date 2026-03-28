/**
 * Compute epsilon closure for a set of states.
 * Returns all states reachable via ε-transitions from the given set.
 */
export function epsilonClosure(stateSet, transitions) {
  const closure = new Set(stateSet);
  const stack = [...stateSet];
  while (stack.length) {
    const s = stack.pop();
    const epsTrans = transitions[s]?.["ε"] || [];
    epsTrans.forEach((t) => {
      if (!closure.has(t)) {
        closure.add(t);
        stack.push(t);
      }
    });
  }
  return Array.from(closure);
}

/**
 * Perform one simulation step.
 * Returns { next: string[], edges: string[] }
 */
export function stepSimulation(currentStates, transitions, symbol) {
  const next = new Set();
  const edges = [];

  currentStates.forEach((state) => {
    const targets = transitions[state]?.[symbol] || [];
    targets.forEach((t) => {
      next.add(t);
      edges.push(`${state}→${t}`);
    });
  });

  return { next: Array.from(next), edges };
}

/**
 * Convert NFA to DFA using subset construction.
 * Returns { newStates, newStart, newAccept, newTransitions, log }
 */
export function nfaToDFA(states, startState, acceptStates, transitions) {
  const log = [];

  // Collect alphabet (excluding epsilon)
  const alphabet = new Set();
  Object.values(transitions).forEach((t) =>
    Object.keys(t).forEach((sym) => {
      if (sym !== "ε") alphabet.add(sym);
    })
  );
  const alph = Array.from(alphabet).sort();

  // Start state is epsilon closure of original start
  const startClosure = epsilonClosure([startState], transitions).sort();
  const startKey = `{${startClosure.join(",")}}`;

  const queue = [startClosure];
  const seen = new Set([startClosure.join(",")]);
  const dfaStates = {};
  const dfaTransitions = {};
  const dfaAccept = [];

  while (queue.length) {
    const curr = queue.shift();
    const key = `{${curr.join(",")}}`;
    dfaStates[key] = curr;

    const isAccepting = curr.some((s) => acceptStates.includes(s));
    if (isAccepting && !dfaAccept.includes(key)) dfaAccept.push(key);

    log.push(`State ${key}${isAccepting ? " [ACCEPT]" : ""}`);

    alph.forEach((sym) => {
      // Compute move(curr, sym)
      const moved = new Set();
      curr.forEach((s) => {
        (transitions[s]?.[sym] || []).forEach((t) => moved.add(t));
      });

      // Epsilon closure of result
      const nextClosure = epsilonClosure(Array.from(moved), transitions).sort();
      const nextKey = nextClosure.length ? `{${nextClosure.join(",")}}` : "∅";

      if (!dfaTransitions[key]) dfaTransitions[key] = {};
      dfaTransitions[key][sym] = [nextKey];

      log.push(`  δ(${key}, ${sym}) = ${nextKey}`);

      if (nextClosure.length && !seen.has(nextClosure.join(","))) {
        seen.add(nextClosure.join(","));
        queue.push(nextClosure);
      }
    });
  }

  const newStates = Object.keys(dfaStates);

  return {
    newStates,
    newStart: startKey,
    newAccept: dfaAccept,
    newTransitions: dfaTransitions,
    log,
  };
}
