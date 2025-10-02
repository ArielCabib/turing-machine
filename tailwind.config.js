/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "media", // Use system preference for dark mode
  theme: {
    extend: {
      colors: {
        // Light mode colors (matching your CSS variables)
        "bg-primary": "#f9fafb",
        "bg-secondary": "#ffffff",
        "text-primary": "#111827",
        "text-secondary": "#6b7280",
        "border-color": "#e5e7eb",
        accent: "#4f46e5",
        "accent-hover": "#4338ca",
        "tape-bg": "#ffffff",
        "tape-active": "#fef3c7",
        "tape-border": "#f59e0b",
      },
    },
  },
  plugins: [],
};
