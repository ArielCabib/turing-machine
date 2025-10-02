import { useState } from "react";
import {
  createRuntime,
  step,
  type TuringMachineSpec,
  type TMRuntime,
} from "./lib/tm";
import TuringMachineSpecComponent from "./components/TuringMachineSpec";

export default function App() {
  const [currentView, setCurrentView] = useState<"spec" | "simulator">("spec");
  const [tmSpec, setTmSpec] = useState<TuringMachineSpec | null>(null);
  const [runtime, setRuntime] = useState<TMRuntime | null>(null);
  const [input, setInput] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [runTimeout, setRunTimeout] = useState<number | null>(null);
  const [randomInputs, setRandomInputs] = useState<string[]>([]);

  // Stop any running simulation
  const stopSimulation = () => {
    if (runTimeout) {
      clearTimeout(runTimeout);
      setRunTimeout(null);
    }
    if (isRunning) {
      setIsRunning(false);
      setStatusMessage("Simulation stopped.");
    }
  };

  // Auto-restart simulation when input changes
  const handleInputChange = (newInput: string) => {
    setInput(newInput);

    // Stop any running simulation first
    stopSimulation();

    if (tmSpec && newInput) {
      try {
        const rt = createRuntime(tmSpec, newInput);
        setRuntime(rt);
        setStatusMessage("Input changed. Simulation restarted.");
      } catch (error) {
        setStatusMessage(`Error with new input: ${error}`);
      }
    }
  };

  const handleBuildMachine = (spec: TuringMachineSpec) => {
    setTmSpec(spec);
    setCurrentView("simulator");

    // Auto-start the simulation with a random input
    setTimeout(() => {
      try {
        // Generate random inputs first
        const inputs: string[] = [];
        const alphabet = Array.from(spec.Sigma).filter(
          (symbol) => symbol.trim() !== ""
        );

        if (alphabet.length > 0) {
          // Generate up to 10 random inputs with lengths from 1 to 10
          for (let i = 0; i < 10; i++) {
            const length = Math.floor(Math.random() * 10) + 1; // 1 to 10 characters
            let randomInput = "";

            for (let j = 0; j < length; j++) {
              const randomIndex = Math.floor(Math.random() * alphabet.length);
              randomInput += alphabet[randomIndex];
            }

            inputs.push(randomInput);
          }

          setRandomInputs(inputs);

          // Use the first random input as the current input
          const selectedInput = inputs[0];
          setInput(selectedInput);

          const rt = createRuntime(spec, selectedInput);
          setRuntime(rt);
          setStatusMessage(
            `Simulation ready with random input: "${selectedInput}". Use Step or Run to execute.`
          );
        } else {
          const rt = createRuntime(spec, input);
          setRuntime(rt);
          setStatusMessage("Simulation ready. Use Step or Run to execute.");
        }
      } catch (error) {
        setStatusMessage(`Error starting simulation: ${error}`);
      }
    }, 100);
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

  const runSimulation = () => {
    if (!runtime) return;

    // Stop any existing run
    stopSimulation();

    setIsRunning(true);
    setStatusMessage("Running simulation...");

    const runStep = () => {
      if (!runtime) return;

      const canContinue = step(runtime);
      setRuntime({ ...runtime });

      if (canContinue) {
        // Continue running after a short delay
        const timeout = setTimeout(runStep, 500);
        setRunTimeout(timeout);
      } else {
        setIsRunning(false);
        setRunTimeout(null);

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

  if (currentView === "spec") {
    return <TuringMachineSpecComponent onBuildMachine={handleBuildMachine} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-3xl shadow-xl rounded-2xl p-8 space-y-6 bg-white dark:bg-gray-800">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            🧮 Turing Machine Simulator
          </h1>
          <button
            onClick={() => setCurrentView("spec")}
            className="px-4 py-2 text-white rounded-lg text-sm cursor-pointer bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Edit Machine
          </button>
        </div>

        {/* Input */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex justify-center">
            <input
              type="text"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              className="px-4 py-2 border rounded-lg w-64 text-center focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              placeholder="Enter input (e.g., 101)"
            />
          </div>

          {/* Random Test Inputs */}
          {randomInputs.length > 0 && (
            <div className="w-full max-w-2xl">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
                Test inputs (click to use):
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {randomInputs.map((testInput, index) => (
                  <button
                    key={index}
                    onClick={() => handleInputChange(testInput)}
                    className="px-3 py-1 text-sm border rounded cursor-pointer border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {testInput}
                  </button>
                ))}
              </div>
            </div>
          )}
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
            className="px-4 py-2 text-white rounded-lg cursor-pointer"
            style={
              {
                backgroundColor: "#10b981",
              } as React.CSSProperties
            }
            onClick={stepSimulation}
            disabled={!runtime || isRunning}
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
            className="px-4 py-2 text-white rounded-lg cursor-pointer"
            style={
              {
                backgroundColor: "#3b82f6",
              } as React.CSSProperties
            }
            onClick={runSimulation}
            disabled={!runtime || isRunning}
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
          {isRunning && (
            <button
              className="px-4 py-2 text-white rounded-lg cursor-pointer"
              style={
                {
                  backgroundColor: "#ef4444",
                } as React.CSSProperties
              }
              onClick={stopSimulation}
              onMouseEnter={(e) =>
                ((e.target as HTMLButtonElement).style.backgroundColor =
                  "#dc2626")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLButtonElement).style.backgroundColor =
                  "#ef4444")
              }
            >
              Stop
            </button>
          )}
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
