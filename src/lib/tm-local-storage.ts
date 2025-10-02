import { type TuringMachineSpec } from "./tm";

export const STORAGE_KEY = "turingMachineSpec";

// Custom serialization that converts Sets to arrays
function serializeTuringMachineSpec(spec: TuringMachineSpec): string {
  const serializable = {
    ...spec,
    Q: Array.from(spec.Q),
    Sigma: Array.from(spec.Sigma),
    Gamma: Array.from(spec.Gamma),
  };
  return JSON.stringify(serializable);
}

// Custom deserialization that converts arrays back to Sets
function deserializeTuringMachineSpec(data: unknown): TuringMachineSpec {
  if (!data || typeof data !== 'object' || data === null) {
    throw new Error("Invalid data for Turing Machine spec deserialization");
  }

  const obj = data as Record<string, unknown>;

  return {
    ...obj,
    Q: new Set(Array.isArray(obj.Q) ? obj.Q : []),
    Sigma: new Set(Array.isArray(obj.Sigma) ? obj.Sigma : []),
    Gamma: new Set(Array.isArray(obj.Gamma) ? obj.Gamma : []),
  } as TuringMachineSpec;
}

export function saveTuringMachineSpec(spec: TuringMachineSpec) {
  localStorage.setItem(STORAGE_KEY, serializeTuringMachineSpec(spec));
}

export function getTuringMachineSpec(): TuringMachineSpec | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    return deserializeTuringMachineSpec(parsed);
  } catch (error) {
    console.error("Failed to parse stored Turing Machine spec:", error);
    return null;
  }
}

export function clearTuringMachineSpec() {
  localStorage.removeItem(STORAGE_KEY);
}