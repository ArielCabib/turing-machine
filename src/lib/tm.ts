export type State = string;
export type Symbol = string;
export type Direction = 'L' | 'R' | 'S'; // include 'S' (stay) for convenience

// δ: Q × Γ → Q × Γ × {L, R, S}
export interface Transition {
  nextState: State;
  write: Symbol;
  move: Direction;
}

export type Delta = Record<State, Record<Symbol, Transition>>;

export interface TuringMachineSpec {
  Q: Set<State>;          // states
  Sigma: Set<Symbol>;     // input alphabet (no blank)
  Gamma: Set<Symbol>;     // tape alphabet (includes blank)
  delta: Delta;           // transition function
  q0: State;              // start
  qAccept: State;
  qReject: State;
  blank: Symbol;          // explicit blank symbol, e.g. '□' or ' '
}

// A runtime instance: spec + current configuration
export interface TMRuntime {
  spec: TuringMachineSpec;
  tape: Symbol[];
  head: number;
  state: State;
  steps: number;
}

export function createRuntime(spec: TuringMachineSpec, input: string): TMRuntime {
  const tape = input.length ? input.split('') : [spec.blank];
  return { spec, tape, head: 0, state: spec.q0, steps: 0 };
}

export function read(rt: TMRuntime): Symbol {
  const { tape, head, spec } = rt;
  return tape[head] ?? spec.blank;
}

export function write(rt: TMRuntime, s: Symbol) {
  rt.tape[rt.head] = s;
}

export function move(rt: TMRuntime, dir: Direction) {
  if (dir === 'L') {
    rt.head -= 1;
    if (rt.head < 0) { rt.tape.unshift(rt.spec.blank); rt.head = 0; }
  } else if (dir === 'R') {
    rt.head += 1;
    if (rt.head >= rt.tape.length) rt.tape.push(rt.spec.blank);
  } // 'S' = no move
}

// One step; returns false when halting
export function step(rt: TMRuntime): boolean {
  if (rt.state === rt.spec.qAccept || rt.state === rt.spec.qReject) return false;

  const sym = read(rt);
  const stateRow = rt.spec.delta[rt.state] || {};
  const tr = stateRow[sym];

  if (!tr) {
    // No rule: reject by default
    rt.state = rt.spec.qReject;
    rt.steps++;
    return false;
  }

  write(rt, tr.write);
  move(rt, tr.move);
  rt.state = tr.nextState;
  rt.steps++;

  return !(rt.state === rt.spec.qAccept || rt.state === rt.spec.qReject);
}