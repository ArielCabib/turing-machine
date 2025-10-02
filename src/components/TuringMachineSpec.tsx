import React, { useState, useEffect } from "react";
import {
  type TuringMachineSpec,
  type Direction,
  type Transition,
} from "../lib/tm";
import {
  saveTuringMachineSpec,
  getTuringMachineSpec,
} from "../lib/tm-local-storage";

interface TuringMachineSpecProps {
  onBuildMachine: (spec: TuringMachineSpec) => void;
}

export default function TuringMachineSpecComponent({
  onBuildMachine,
}: TuringMachineSpecProps) {
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

  // Metadata for JSON export
  const [exportMetadata, setExportMetadata] = useState({
    name: "Turing Machine Specification",
    description: "Exported from Turing Machine Builder",
  });

  // Control visibility of modals
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // File input ref for loading JSON files
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load saved machine on component mount
  useEffect(() => {
    const savedSpec = getTuringMachineSpec();
    if (savedSpec) {
      // Convert saved spec back to form data
      setFormData({
        states: Array.from(savedSpec.Q),
        inputAlphabet: Array.from(savedSpec.Sigma),
        tapeAlphabet: Array.from(savedSpec.Gamma),
        blankSymbol: savedSpec.blank,
        startState: savedSpec.q0,
        acceptState: savedSpec.qAccept,
        rejectState: savedSpec.qReject,
        transitions: Object.entries(savedSpec.delta).flatMap(
          ([fromState, stateTransitions]) =>
            Object.entries(stateTransitions || {}).map(
              ([readSymbol, transition]) => ({
                fromState,
                readSymbol,
                toState: transition?.nextState || "",
                writeSymbol: transition?.write || "",
                direction: transition?.move || "R",
              })
            )
        ),
      });
    }
  }, []);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (showLoadModal || showSaveModal)) {
        if (showLoadModal) {
          setShowLoadModal(false);
        }
        if (showSaveModal) {
          setShowSaveModal(false);
        }
      }
    };

    if (showLoadModal || showSaveModal) {
      document.addEventListener("keydown", handleEscKey);
      return () => document.removeEventListener("keydown", handleEscKey);
    }
  }, [showLoadModal, showSaveModal]);

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
    setFormData({
      ...formData,
      transitions: [],
    });
  };

  const updateTransition = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      transitions: prev.transitions.map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      ),
    }));
  };

  // Helper function to build Turing machine spec from form data
  const buildTuringMachineSpec = (): TuringMachineSpec => {
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

    return {
      Q: new Set(formData.states),
      Sigma: new Set(formData.inputAlphabet),
      Gamma: new Set(formData.tapeAlphabet),
      delta,
      q0: formData.startState,
      qAccept: formData.acceptState,
      qReject: formData.rejectState,
      blank: formData.blankSymbol,
    };
  };

  const buildTuringMachine = () => {
    try {
      const spec = buildTuringMachineSpec();

      // Save the machine to localStorage
      saveTuringMachineSpec(spec);

      onBuildMachine(spec);
    } catch (error) {
      console.error(`Error creating Turing machine: ${error}`);
    }
  };

  const openLoadModal = () => {
    setShowLoadModal(true);
  };

  const openSaveModal = () => {
    setShowSaveModal(true);
  };

  const performDownload = () => {
    try {
      const spec = buildTuringMachineSpec();

      // Create a JSON-serializable version of the spec
      const jsonSpec = {
        Q: Array.from(spec.Q),
        Sigma: Array.from(spec.Sigma),
        Gamma: Array.from(spec.Gamma),
        delta: spec.delta,
        q0: spec.q0,
        qAccept: spec.qAccept,
        qReject: spec.qReject,
        blank: spec.blank,
        metadata: {
          name: exportMetadata.name,
          description: exportMetadata.description,
          exportedAt: new Date().toISOString(),
        },
      };

      // Sanitize filename by removing invalid characters and replacing spaces with hyphens
      const sanitizedName = exportMetadata.name
        .replace(/[^a-zA-Z0-9\s-_]/g, "") // Remove invalid characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .toLowerCase(); // Convert to lowercase

      // Create filename with sanitized name and date
      const filename = sanitizedName
        ? `${sanitizedName}-${new Date().toISOString().split("T")[0]}.json`
        : `turing-machine-${new Date().toISOString().split("T")[0]}.json`;

      // Create and download the JSON file
      const jsonString = JSON.stringify(jsonSpec, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      // Hide save modal after download
      setShowSaveModal(false);
    } catch (error) {
      console.error(`Error downloading JSON: ${error}`);
    }
  };

  const cancelLoad = () => {
    setShowLoadModal(false);
  };

  const cancelSave = () => {
    setShowSaveModal(false);
  };

  const handleFileLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = e.target?.result as string;
        const loadedSpec = JSON.parse(jsonContent);

        // Validate that it's a valid Turing machine spec
        if (
          !loadedSpec.Q ||
          !loadedSpec.Sigma ||
          !loadedSpec.Gamma ||
          !loadedSpec.delta
        ) {
          alert("Invalid Turing machine specification file.");
          return;
        }

        // Update form data with loaded specification
        setFormData({
          states: Array.isArray(loadedSpec.Q) ? loadedSpec.Q : [],
          inputAlphabet: Array.isArray(loadedSpec.Sigma)
            ? loadedSpec.Sigma
            : [],
          tapeAlphabet: Array.isArray(loadedSpec.Gamma) ? loadedSpec.Gamma : [],
          blankSymbol: loadedSpec.blank || "□",
          startState: loadedSpec.q0 || "",
          acceptState: loadedSpec.qAccept || "",
          rejectState: loadedSpec.qReject || "",
          transitions: Object.entries(loadedSpec.delta || {}).flatMap(
            ([fromState, stateTransitions]) =>
              Object.entries(stateTransitions || {}).map(
                ([readSymbol, transition]) => ({
                  fromState,
                  readSymbol,
                  toState: transition?.nextState || "",
                  writeSymbol: transition?.write || "",
                  direction: transition?.move || "R",
                })
              )
          ),
        });

        // Update metadata if available
        if (loadedSpec.metadata) {
          setExportMetadata({
            name: loadedSpec.metadata.name || "Turing Machine Specification",
            description:
              loadedSpec.metadata.description ||
              "Exported from Turing Machine Builder",
          });
        }

        // Close the load modal
        setShowLoadModal(false);

        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        alert("Turing machine specification loaded successfully!");
      } catch (error) {
        console.error("Error loading JSON file:", error);
        alert(
          "Error loading JSON file. Please make sure it's a valid Turing machine specification."
        );
      }
    };

    reader.readAsText(file);
  };

  const triggerFileLoad = () => {
    fileInputRef.current?.click();
  };

  const loadExample = (exampleName: string) => {
    console.log("Loading example:", exampleName);
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
  };

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
                  Clear All Transitions
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

        {/* Load Modal */}
        {showLoadModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={cancelLoad}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Load Turing Machine
                  </h3>
                  <button
                    onClick={cancelLoad}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📁</div>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Select a JSON file to load a previously saved Turing machine
                    specification.
                  </p>
                  <button
                    onClick={triggerFileLoad}
                    className="px-6 py-3 text-white rounded-lg font-medium cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                  >
                    Choose JSON File
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={cancelLoad}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 rounded-lg text-sm cursor-pointer border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileLoad}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Save Modal */}
        {showSaveModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={cancelSave}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Save Turing Machine
                  </h3>
                  <button
                    onClick={cancelSave}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Machine Name
                    </label>
                    <input
                      type="text"
                      value={exportMetadata.name}
                      onChange={(e) =>
                        setExportMetadata((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        borderColor: "var(--border-color)",
                      }}
                      placeholder="Enter machine name"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={exportMetadata.description}
                      onChange={(e) =>
                        setExportMetadata((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        borderColor: "var(--border-color)",
                      }}
                      placeholder="Enter description"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={cancelSave}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 rounded-lg text-sm cursor-pointer border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={performDownload}
                    className="px-4 py-2 text-white rounded-lg text-sm cursor-pointer bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors"
                  >
                    💾 Save JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <button
            onClick={buildTuringMachine}
            className="px-6 py-3 text-white rounded-lg font-medium cursor-pointer bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Build Turing Machine
          </button>
          <button
            onClick={openLoadModal}
            className="px-6 py-3 text-white rounded-lg font-medium cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            📁 Load Machine
          </button>
          <button
            onClick={openSaveModal}
            className="px-6 py-3 text-white rounded-lg font-medium cursor-pointer bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
          >
            💾 Save Machine
          </button>
        </div>
      </div>
    </div>
  );
}
