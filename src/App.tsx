import { useState, useEffect, useCallback, useRef } from "react";
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
  const [isRunning, setIsRunning] = useState(false);
  const [runTimeout, setRunTimeout] = useState<number | null>(null);
  const [randomInputs, setRandomInputs] = useState<string[]>([]);
  const isLoadingRef = useRef(false);

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

  // localStorage key for saving state
  const STORAGE_KEY = "turing-machine-state";

  // Save state to localStorage
  const saveState = useCallback(() => {
    if (isLoadingRef.current) {
      console.log("Skipping save - currently loading state");
      return;
    }

    console.log(
      "saveState called with formData transitions:",
      formData.transitions.length
    );
    const state = {
      currentView,
      tmSpec,
      input,
      formData,
      randomInputs,
      statusMessage,
      isRunning,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log("State saved to localStorage");
    } catch (error) {
      console.warn("Failed to save state to localStorage:", error);
    }
  }, [
    currentView,
    tmSpec,
    input,
    formData,
    randomInputs,
    statusMessage,
    isRunning,
  ]);

  // Load state from localStorage
  const loadState = useCallback(() => {
    if (isLoadingRef.current) {
      console.log("Already loading state, skipping");
      return;
    }

    try {
      isLoadingRef.current = true;
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        console.log("Loading state from localStorage");
        const state = JSON.parse(savedState);

        // Validate and restore state
        if (state.currentView) setCurrentView(state.currentView);
        if (state.tmSpec) setTmSpec(state.tmSpec);
        if (state.input) setInput(state.input);
        if (state.formData) {
          console.log("Restoring formData:", state.formData);
          console.log("Transitions in formData:", state.formData.transitions);
          setFormData(state.formData);
        }
        if (state.randomInputs) setRandomInputs(state.randomInputs);
        if (state.statusMessage) setStatusMessage(state.statusMessage);

        // Restore runtime if we have a valid spec and input
        if (state.tmSpec && state.input) {
          try {
            // Reconstruct the spec with proper Set objects
            // Handle both array and object serialization formats
            const reconstructSet = (data: unknown): Set<string> => {
              if (Array.isArray(data)) {
                return new Set(data);
              } else if (data && typeof data === "object") {
                // If it's an object, extract the values
                return new Set(Object.values(data));
              }
              return new Set();
            };

            const reconstructedSpec: TuringMachineSpec = {
              Q: reconstructSet(state.tmSpec.Q),
              Sigma: reconstructSet(state.tmSpec.Sigma),
              Gamma: reconstructSet(state.tmSpec.Gamma),
              delta: state.tmSpec.delta,
              q0: state.tmSpec.q0,
              qAccept: state.tmSpec.qAccept,
              qReject: state.tmSpec.qReject,
              blank: state.tmSpec.blank,
            };

            // Debug logging
            console.log("Original Sigma from state:", state.tmSpec.Sigma);
            console.log(
              "Reconstructed Sigma:",
              Array.from(reconstructedSpec.Sigma)
            );
            console.log("Original delta from state:", state.tmSpec.delta);
            console.log("Reconstructed delta:", reconstructedSpec.delta);
            console.log("Input to validate:", state.input);

            // Validate that the input is compatible with the reconstructed alphabet
            let inputAlphabet = Array.from(reconstructedSpec.Sigma);

            // Fallback: if reconstructed alphabet is empty, try multiple sources
            if (inputAlphabet.length === 0) {
              // Try formData first
              if (state.formData && state.formData.inputAlphabet) {
                inputAlphabet = state.formData.inputAlphabet.filter(
                  (symbol: string) => symbol.trim() !== ""
                );
                console.log(
                  "Using fallback alphabet from formData:",
                  inputAlphabet
                );
              }

              // If formData alphabet is still incomplete, try tape alphabet
              if (
                inputAlphabet.length === 0 ||
                !state.input
                  .split("")
                  .every((char: string) => inputAlphabet.includes(char))
              ) {
                const tapeAlphabet = Array.from(reconstructedSpec.Gamma);
                if (
                  tapeAlphabet.length > 0 &&
                  state.input
                    .split("")
                    .every((char: string) => tapeAlphabet.includes(char))
                ) {
                  inputAlphabet = tapeAlphabet;
                  console.log(
                    "Using tape alphabet as input alphabet:",
                    inputAlphabet
                  );
                } else {
                  // Last resort: extract from input
                  const inputChars = state.input.split("");
                  const uniqueChars = [...new Set(inputChars)] as string[];
                  inputAlphabet = uniqueChars;
                  console.log(
                    "Using alphabet extracted from input:",
                    inputAlphabet
                  );
                }
              }

              // Update the reconstructed spec with the fallback alphabet
              reconstructedSpec.Sigma = new Set(inputAlphabet);
            }

            const inputChars = state.input.split("");
            const invalidChars = inputChars.filter(
              (char: string) => !inputAlphabet.includes(char)
            );

            if (invalidChars.length > 0) {
              console.warn(
                `Input contains characters not in alphabet: ${invalidChars.join(
                  ", "
                )}`
              );
              setStatusMessage(
                `State restored, but input "${state.input}" contains invalid characters. Please rebuild the machine or change the input.`
              );
              return;
            }

            const rt = createRuntime(reconstructedSpec, state.input);
            setRuntime(rt);
          } catch (error) {
            console.warn("Failed to restore runtime:", error);
            setStatusMessage(
              "State restored, but runtime could not be recreated. Please rebuild the machine."
            );
          }
        }
      }
    } catch (error) {
      console.warn("Failed to load state from localStorage:", error);
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  // Load state on component mount
  useEffect(() => {
    loadState();
    // Set a flag to prevent immediate saving after load
    setTimeout(() => {
      setHasLoaded(true);
    }, 100);
  }, [loadState]);

  // Save state whenever important data changes (but not on initial load)
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (hasLoaded) {
      saveState();
    }
  }, [saveState, hasLoaded]);

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

  const clearAllTransitions = () => {
    // Clear all form data completely
    setFormData({
      states: [],
      inputAlphabet: [],
      tapeAlphabet: [],
      blankSymbol: "",
      startState: "",
      acceptState: "",
      rejectState: "",
      transitions: [],
    });

    // Also clear other related state
    setTmSpec(null);
    setRuntime(null);
    setInput("");
    setStatusMessage("All data cleared. Start fresh!");
    setIsRunning(false);
    setRandomInputs([]);

    // Clear any running timeout
    if (runTimeout) {
      clearTimeout(runTimeout);
      setRunTimeout(null);
    }
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

      // Auto-start the simulation with a random input
      setTimeout(() => {
        try {
          // Generate random inputs first
          const inputs: string[] = [];
          const alphabet = formData.inputAlphabet.filter(
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
    } catch (error) {
      setStatusMessage(`Error creating Turing machine: ${error}`);
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

  const loadExample = (exampleName: string) => {
    console.log("Loading example:", exampleName);
    console.log("hasLoaded flag:", hasLoaded);
    console.log(
      "Current formData transitions before load:",
      formData.transitions.length
    );
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
      case "infinite-loop":
        setFormData({
          states: ["q0", "qAccept", "qReject"],
          inputAlphabet: ["0"],
          tapeAlphabet: ["0", "□"],
          blankSymbol: "□",
          startState: "q0",
          acceptState: "qAccept",
          rejectState: "qReject",
          transitions: [
            {
              fromState: "q0",
              readSymbol: "0",
              toState: "q0",
              writeSymbol: "0",
              direction: "R",
            },
            {
              fromState: "q0",
              readSymbol: "□",
              toState: "q0",
              writeSymbol: "□",
              direction: "L",
            },
          ],
        });
        break;
    }

    // Manually trigger save after loading example (only if not during restoration)
    if (hasLoaded) {
      setTimeout(() => {
        console.log("Manually saving after example load");
        saveState();
      }, 50);
    } else {
      console.log("Skipping manual save - still loading state");
    }
  };

  if (currentView === "spec") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-4xl shadow-xl rounded-2xl p-8 space-y-6 bg-white dark:bg-gray-800">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              🧮 Turing Machine Builder
            </h1>

            {/* Example Presets */}
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Try these examples:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => loadExample("binary-increment")}
                  className="px-3 py-1 text-sm border rounded cursor-pointer border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Binary Increment +1 (e.g., "101" → "110")
                </button>
                <button
                  onClick={() => loadExample("infinite-loop")}
                  className="px-3 py-1 text-sm border rounded cursor-pointer border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Infinite Loop (use Stop button!)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* States */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
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
                      className="px-3 py-1 border rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                    />
                    <button
                      onClick={() => {
                        const newStates = formData.states.filter(
                          (_, i) => i !== index
                        );
                        setFormData((prev) => ({ ...prev, states: newStates }));
                      }}
                      className="text-red-500 hover:text-red-700 cursor-pointer"
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
                  className="px-3 py-1 border border-dashed rounded text-sm cursor-pointer border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                >
                  + Add State
                </button>
              </div>
            </div>

            {/* Input Alphabet */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
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
                      className="px-3 py-1 border rounded text-sm w-12 text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
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
                      className="text-red-500 hover:text-red-700 cursor-pointer"
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
                  className="px-3 py-1 border border-dashed rounded text-sm cursor-pointer border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                >
                  + Add Symbol
                </button>
              </div>
            </div>

            {/* Tape Alphabet */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
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
                      className="px-3 py-1 border rounded text-sm w-12 text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
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
                      className="text-red-500 hover:text-red-700 cursor-pointer"
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
                  className="px-3 py-1 border border-dashed rounded text-sm cursor-pointer border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                >
                  + Add Symbol
                </button>
              </div>
            </div>

            {/* Special States */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                Special States
              </label>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400">
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
                  <label className="block text-xs text-gray-500 dark:text-gray-400">
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
                  <label className="block text-xs text-gray-500 dark:text-gray-400">
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
                  <label className="block text-xs text-gray-500 dark:text-gray-400">
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
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                Transitions (δ)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={addTransition}
                  className="px-4 py-2 text-white rounded-lg text-sm cursor-pointer bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  + Add Transition
                </button>
                {formData.transitions.length > 0 && (
                  <button
                    onClick={clearAllTransitions}
                    className="px-4 py-2 text-white rounded-lg text-sm cursor-pointer bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                  >
                    Clear All Data
                  </button>
                )}
              </div>
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

                  <span className="text-gray-500">×</span>

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

                  <span className="text-gray-500">→</span>

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
                    className="text-red-500 hover:text-red-700 px-2 cursor-pointer"
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
              className="px-6 py-3 text-white rounded-lg font-medium cursor-pointer bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              Build Turing Machine
            </button>
          </div>

          {/* Show generated random inputs in spec view */}
          {randomInputs.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
                Auto-generated test inputs:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {randomInputs.map((testInput, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 text-sm border rounded border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700"
                  >
                    {testInput}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
