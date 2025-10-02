import { useState } from "react";

export default function App() {
  const [input, setInput] = useState("1011");
  const [steps, setSteps] = useState(0);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div
        className="w-full max-w-3xl shadow-xl rounded-2xl p-8 space-y-6"
        style={{ backgroundColor: "var(--bg-secondary)" }}
      >
        <h1
          className="text-3xl font-bold text-center"
          style={{ color: "var(--accent-color)" }}
        >
          🧮 Turing Machine Simulator
        </h1>

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
            onClick={() => {
              setSteps(0);
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "var(--accent-hover)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "var(--accent-color)")
            }
          >
            Reset
          </button>
        </div>

        {/* Tape */}
        <div className="flex justify-center gap-1 overflow-x-auto py-4">
          {input.split("").map((c, i) => (
            <div
              key={i}
              className="w-12 h-12 border-2 flex items-center justify-center font-bold text-lg"
              style={
                {
                  backgroundColor:
                    i === steps % input.length
                      ? "var(--tape-active)"
                      : "var(--tape-bg)",
                  borderColor:
                    i === steps % input.length
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

        {/* Controls */}
        <div className="flex justify-center gap-3">
          <button
            className="px-4 py-2 text-white rounded-lg"
            style={{ backgroundColor: "#10b981" } as React.CSSProperties}
            onClick={() => setSteps(steps + 1)}
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
            onClick={() => setSteps(0)}
            onMouseEnter={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "#dc2626")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "#ef4444")
            }
          >
            Pause
          </button>
        </div>

        {/* State info */}
        <div
          className="text-center font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Current State:{" "}
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>
            q0
          </span>{" "}
          • Steps:{" "}
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>
            {steps}
          </span>
        </div>
      </div>
    </div>
  );
}
