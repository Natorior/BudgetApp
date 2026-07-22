import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        surface: "var(--surface)",
        border: "var(--border)",
        foreground: "var(--text)",
        muted: "var(--text-secondary)",
        accent: "var(--accent)",
        positive: "var(--positive)",
        warning: "var(--warning)",
        critical: "var(--critical)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        input: "var(--radius-input)",
        chip: "var(--radius-chip)",
      },
      spacing: {
        gutter: "var(--screen-gutter)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
