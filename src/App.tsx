import { useState } from "react";
import {
  createRuntime,
  step,
  type TuringMachineSpec,
  type TMRuntime,
  type Direction,
  type Transition,
} from "./lib/tm";

export default function App() {
  const [currentView, setCurrentView] = useState<"spec" | "simulator">("spec");
  const [tmSpec, setTmSpec] = useState<TuringMachineSpec | null>(null);
  const [runtime, setRuntime] = useState<TMRuntime | null>(null);
  const [input, setInput] = useState("101");
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Form state for TM specification
  const [formData, setFormData] = useState({
    states: ["q0", "q1", "qAccept", "qReject"],
    inputAlphabet: ["0", "1"],
    tapeAlphabet: ["0", "1", "□"],
    blankSymbol: "□",
    startState: "q0",
    acceptState: "qAccept",
    rejectState: "qReject",
    transitions: [] as Array<{
      fromState: string;
      readSymbol: string;
      toState: string;
      writeSymbol: string;
      direction: Direction;
    }>,
  });

  const addTransition = () => {
    setFormData((prev) => ({
      ...prev,
      transitions: [
        ...prev.transitions,
        {
          fromState: prev.states[0] || "",
          readSymbol: prev.inputAlphabet[0] || "",
          toState: prev.states[0] || "",
          writeSymbol: prev.inputAlphabet[0] || "",
          direction: "R" as Direction,
        },
      ],
    }));
  };

  const removeTransition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      transitions: prev.transitions.filter((_, i) => i !== index),
    }));
  };

  const updateTransition = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      transitions: prev.transitions.map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      ),
    }));
  };

  const buildTuringMachine = () => {
    try {
      // Build the delta function from transitions
      const delta: Record<string, Partial<Record<string, Transition>>> = {};

      formData.transitions.forEach((transition) => {
        if (!delta[transition.fromState]) {
          delta[transition.fromState] = {};
        }
        delta[transition.fromState][transition.readSymbol] = {
          nextState: transition.toState,
          write: transition.writeSymbol,
          move: transition.direction,
        };
      });

      const spec: TuringMachineSpec = {
        Q: new Set(formData.states),
        Sigma: new Set(formData.inputAlphabet),
        Gamma: new Set(formData.tapeAlphabet),
        delta,
        q0: formData.startState,
        qAccept: formData.acceptState,
        qReject: formData.rejectState,
        blank: formData.blankSymbol,
      };

      setTmSpec(spec);
      setCurrentView("simulator");
    } catch (error) {
      alert(`Error creating Turing machine: ${error}`);
    }
  };

  const startSimulation = () => {
    if (!tmSpec) return;

    try {
      const rt = createRuntime(tmSpec, input);
      setRuntime(rt);
      setStatusMessage("Simulation started. Use Step or Run to execute.");
    } catch (error) {
      setStatusMessage(`Error starting simulation: ${error}`);
    }
  };

  const stepSimulation = () => {
    if (!runtime) return;

    const canContinue = step(runtime);

    // Force re-render by creating a new runtime object
    setRuntime({ ...runtime });

    if (!canContinue) {
      if (runtime.state === runtime.spec.qAccept) {
        setStatusMessage(`✅ Machine accepted! Final state: ${runtime.state}`);
      } else if (runtime.state === runtime.spec.qReject) {
        setStatusMessage(`❌ Machine rejected! Final state: ${runtime.state}`);
      } else {
        setStatusMessage(`🛑 Machine halted in state: ${runtime.state}`);
      }
    }
  };

  const resetSimulation = () => {
    if (!tmSpec) return;
    setStatusMessage("");
    startSimulation();
  };

  const runSimulation = () => {
    if (!runtime) return;

    const runStep = () => {
      if (!runtime) return;

      const canContinue = step(runtime);
      setRuntime({ ...runtime });

      if (canContinue) {
        // Continue running after a short delay
        setTimeout(runStep, 500);
      } else {
        if (runtime.state === runtime.spec.qAccept) {
          setStatusMessage(
            `✅ Machine accepted! Final state: ${runtime.state}`
          );
        } else if (runtime.state === runtime.spec.qReject) {
          setStatusMessage(
            `❌ Machine rejected! Final state: ${runtime.state}`
          );
        } else {
          setStatusMessage(`🛑 Machine halted in state: ${runtime.state}`);
        }
      }
    };

    runStep();
  };

  const loadExample = (exampleName: string) => {
    switch (exampleName) {
      case "binary-increment":
        setFormData({
          states: ["q0", "q1", "qAccept", "qReject"],
          inputAlphabet: ["0", "1"],
          tapeAlphabet: ["0", "1", "□"],
          blankSymbol: "□",
          startState: "q0",
          acceptState: "qAccept",
          rejectState: "qReject",
          transitions: [
            // Move to the rightmost digit
            {
              fromState: "q0",
              readSymbol: "0",
              toState: "q0",
              writeSymbol: "0",
              direction: "R",
            },
            {
              fromState: "q0",
              readSymbol: "1",
              toState: "q0",
              writeSymbol: "1",
              direction: "R",
            },
            {
              fromState: "q0",
              readSymbol: "□",
              toState: "q1",
              writeSymbol: "□",
              direction: "L",
            },

            // Increment: 0 becomes 1, 1 becomes 0 and carry
            {
              fromState: "q1",
              readSymbol: "0",
              toState: "qAccept",
              writeSymbol: "1",
              direction: "S",
            },
            {
              fromState: "q1",
              readSymbol: "1",
              toState: "q1",
              writeSymbol: "0",
              direction: "L",
            },
            {
              fromState: "q1",
              readSymbol: "□",
              toState: "qAccept",
              writeSymbol: "1",
              direction: "S",
            },
          ],
        });
        break;
    }
  };

  if (currentView === "spec") {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <div
          className="w-full max-w-4xl shadow-xl rounded-2xl p-8 space-y-6"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <div className="text-center space-y-4">
            <h1
              className="text-3xl font-bold"
              style={{ color: "var(--accent-color)" }}
            >
              🧮 Turing Machine Builder
            </h1>

            {/* Example Presets */}
            <div className="space-y-2">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Try this example:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => loadExample("binary-increment")}
                  className="px-3 py-1 text-sm border rounded"
                  style={{
                    borderColor: "var(--border-color)",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--bg-secondary)",
                  }}
                >
                  Binary Increment +1 (e.g., "101" → "110")
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* States */}
            <div className="space-y-3">
              <label
                className="block text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                States (Q)
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.states.map((state, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => {
                        const newStates = [...formData.states];
                        newStates[index] = e.target.value;
                        setFormData((prev) => ({ ...prev, states: newStates }));
                      }}
                      className="px-3 py-1 border rounded text-sm"
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        borderColor: "var(--border-color)",
                      }}
                    />
                    <button
                      onClick={() => {
                        const newStates = formData.states.filter(
                          (_, i) => i !== index
                        );
                        setFormData((prev) => ({ ...prev, states: newStates }));
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      states: [...prev.states, ""],
                    }))
                  }
                  className="px-3 py-1 border border-dashed rounded text-sm"
                  style={{
                    borderColor: "var(--border-color)",
                    color: "var(--text-secondary)",
                  }}
                >
                  + Add State
                </button>
              </div>
            </div>

            {/* Input Alphabet */}
            <div className="space-y-3">
              <label
                className="block text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Input Alphabet (Σ)
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.inputAlphabet.map((symbol, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) => {
                        const newAlphabet = [...formData.inputAlphabet];
                        newAlphabet[index] = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          inputAlphabet: newAlphabet,
                        }));
                      }}
                      className="px-3 py-1 border rounded text-sm w-12 text-center"
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        borderColor: "var(--border-color)",
                      }}
                    />
                    <button
                      onClick={() => {
                        const newAlphabet = formData.inputAlphabet.filter(
                          (_, i) => i !== index
                        );
                        setFormData((prev) => ({
                          ...prev,
                          inputAlphabet: newAlphabet,
                        }));
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      inputAlphabet: [...prev.inputAlphabet, ""],
                    }))
                  }
                  className="px-3 py-1 border border-dashed rounded text-sm"
                  style={{
                    borderColor: "var(--border-color)",
                    color: "var(--text-secondary)",
                  }}
                >
                  + Add Symbol
                </button>
              </div>
            </div>

            {/* Tape Alphabet */}
            <div className="space-y-3">
              <label
                className="block text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Tape Alphabet (Γ)
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.tapeAlphabet.map((symbol, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) => {
                        const newAlphabet = [...formData.tapeAlphabet];
                        newAlphabet[index] = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          tapeAlphabet: newAlphabet,
                        }));
                      }}
                      className="px-3 py-1 border rounded text-sm w-12 text-center"
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        borderColor: "var(--border-color)",
                      }}
                    />
                    <button
                      onClick={() => {
                        const newAlphabet = formData.tapeAlphabet.filter(
                          (_, i) => i !== index
                        );
                        setFormData((prev) => ({
                          ...prev,
                          tapeAlphabet: newAlphabet,
                        }));
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      tapeAlphabet: [...prev.tapeAlphabet, ""],
                    }))
                  }
                  className="px-3 py-1 border border-dashed rounded text-sm"
                  style={{
                    borderColor: "var(--border-color)",
                    color: "var(--text-secondary)",
                  }}
                >
                  + Add Symbol
                </button>
              </div>
            </div>

            {/* Special States */}
            <div className="space-y-3">
              <label
                className="block text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Special States
              </label>
              <div className="space-y-2">
                <div>
                  <label
                    className="block text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Start State
                  </label>
                  <select
                    value={formData.startState}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startState: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-1 border rounded text-sm"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    {formData.states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Accept State
                  </label>
                  <input
                    type="text"
                    value={formData.acceptState}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        acceptState: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-1 border rounded text-sm"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border-color)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Reject State
                  </label>
                  <input
                    type="text"
                    value={formData.rejectState}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rejectState: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-1 border rounded text-sm"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border-color)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Blank Symbol
                  </label>
                  <input
                    type="text"
                    value={formData.blankSymbol}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        blankSymbol: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-1 border rounded text-sm"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border-color)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Transitions */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label
                className="block text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Transitions (δ)
              </label>
              <button
                onClick={addTransition}
                className="px-4 py-2 text-white rounded-lg text-sm"
                style={{ backgroundColor: "var(--accent-color)" }}
              >
                + Add Transition
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {formData.transitions.map((transition, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 border rounded"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <select
                    value={transition.fromState}
                    onChange={(e) =>
                      updateTransition(index, "fromState", e.target.value)
                    }
                    className="px-2 py-1 border rounded text-sm"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    {formData.states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>

                  <span style={{ color: "var(--text-secondary)" }}>×</span>

                  <select
                    value={transition.readSymbol}
                    onChange={(e) =>
                      updateTransition(index, "readSymbol", e.target.value)
                    }
                    className="px-2 py-1 border rounded text-sm w-16 text-center"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    {formData.tapeAlphabet.map((symbol) => (
                      <option key={symbol} value={symbol}>
                        {symbol}
                      </option>
                    ))}
                  </select>

                  <span style={{ color: "var(--text-secondary)" }}>→</span>

                  <select
                    value={transition.toState}
                    onChange={(e) =>
                      updateTransition(index, "toState", e.target.value)
                    }
                    className="px-2 py-1 border rounded text-sm"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    {formData.states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>

                  <select
                    value={transition.writeSymbol}
                    onChange={(e) =>
                      updateTransition(index, "writeSymbol", e.target.value)
                    }
                    className="px-2 py-1 border rounded text-sm w-16 text-center"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    {formData.tapeAlphabet.map((symbol) => (
                      <option key={symbol} value={symbol}>
                        {symbol}
                      </option>
                    ))}
                  </select>

                  <select
                    value={transition.direction}
                    onChange={(e) =>
                      updateTransition(index, "direction", e.target.value)
                    }
                    className="px-2 py-1 border rounded text-sm w-16 text-center"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    <option value="L">L</option>
                    <option value="R">R</option>
                    <option value="S">S</option>
                  </select>

                  <button
                    onClick={() => removeTransition(index)}
                    className="text-red-500 hover:text-red-700 px-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={buildTuringMachine}
              className="px-6 py-3 text-white rounded-lg font-medium"
              style={{ backgroundColor: "var(--accent-color)" }}
            >
              Build Turing Machine
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div
        className="w-full max-w-3xl shadow-xl rounded-2xl p-8 space-y-6"
        style={{ backgroundColor: "var(--bg-secondary)" }}
      >
        <div className="flex justify-between items-center">
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--accent-color)" }}
          >
            🧮 Turing Machine Simulator
          </h1>
          <button
            onClick={() => setCurrentView("spec")}
            className="px-4 py-2 text-white rounded-lg text-sm"
            style={{ backgroundColor: "var(--accent-color)" }}
          >
            Edit Machine
          </button>
        </div>

        {/* Input */}
        <div className="flex justify-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="px-4 py-2 border rounded-lg w-64 text-center focus:outline-none"
            style={
              {
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
                borderColor: "var(--border-color)",
              } as React.CSSProperties
            }
          />
          <button
            className="px-4 py-2 text-white rounded-lg"
            style={
              {
                backgroundColor: "var(--accent-color)",
              } as React.CSSProperties
            }
            onClick={startSimulation}
            onMouseEnter={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "var(--accent-hover)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "var(--accent-color)")
            }
          >
            Start
          </button>
        </div>

        {/* Tape */}
        {runtime && (
          <div className="flex justify-center gap-1 overflow-x-auto py-4">
            {runtime.tape.map((c, i) => (
              <div
                key={i}
                className="w-12 h-12 border-2 flex items-center justify-center font-bold text-lg"
                style={
                  {
                    backgroundColor:
                      i === runtime.head
                        ? "var(--tape-active)"
                        : "var(--tape-bg)",
                    borderColor:
                      i === runtime.head
                        ? "var(--tape-border)"
                        : "var(--border-color)",
                    color: "var(--text-primary)",
                  } as React.CSSProperties
                }
              >
                {c}
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-3">
          <button
            className="px-4 py-2 text-white rounded-lg"
            style={{ backgroundColor: "#10b981" } as React.CSSProperties}
            onClick={stepSimulation}
            disabled={!runtime}
            onMouseEnter={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "#059669")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "#10b981")
            }
          >
            Step
          </button>
          <button
            className="px-4 py-2 text-white rounded-lg"
            style={{ backgroundColor: "#3b82f6" } as React.CSSProperties}
            onClick={runSimulation}
            disabled={!runtime}
            onMouseEnter={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "#2563eb")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "#3b82f6")
            }
          >
            Run
          </button>
          <button
            className="px-4 py-2 text-white rounded-lg"
            style={{ backgroundColor: "#ef4444" } as React.CSSProperties}
            onClick={resetSimulation}
            onMouseEnter={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "#dc2626")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "#ef4444")
            }
          >
            Reset
          </button>
        </div>

        {/* State info */}
        {runtime && (
          <div
            className="text-center font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Current State:{" "}
            <span
              className="font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {runtime.state}
            </span>{" "}
            • Steps:{" "}
            <span
              className="font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {runtime.steps}
            </span>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div
            className="text-center p-3 rounded-lg border"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
          >
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}
