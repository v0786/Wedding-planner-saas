import type { Config } from "tailwindcss";

/** Ivory and gold wedding palette; legacy names map to semantic theme variables. */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: "rgb(var(--ivory-50) / <alpha-value>)",
          100: "rgb(var(--ivory-100) / <alpha-value>)",
          200: "rgb(var(--ivory-200) / <alpha-value>)",
          300: "rgb(var(--ivory-300) / <alpha-value>)",
          400: "rgb(var(--ivory-400) / <alpha-value>)",
        },
        gray: {
          100: "rgb(var(--ink-100) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          50: "rgb(var(--ivory-50) / <alpha-value>)",
        },
        champagne: {
          100: "#fbf3e4",
          200: "#f5e7cb",
          300: "#e8d2a8",
          400: "#b58632",
        },
        gold: {
          200: "#f0dfbd",
          300: "#d6b574",
          400: "#b58632",
          500: "#a37424",
          600: "#91601b",
          700: "#79501a",
        },
        ink: {
          100: "rgb(var(--ink-100) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
        },
        sage: {
          50: "#f3f7ec",
          100: "#e8efdb",
          300: "#B4CBB4",
          500: "#4d7950",
          600: "#416b43",
          700: "#37613c",
        },
        rose: {
          50: "#fff5f1",
          100: "#fbe4dd",
          300: "#E0B0A9",
          500: "#b25045",
          600: "#a13a32",
          700: "#8d302a",
        },
        /* design.md §2.2 — Modern Luxury Wedding Editorial design tokens.
           Authoritative palette for the redesign; mapped to CSS variables
           defined in app/globals.css. */
        brand: {
          background: "var(--color-background)",
          surface: "var(--color-surface)",
          "surface-muted": "var(--color-surface-muted)",
          primary: "var(--color-primary)",
          "primary-hover": "var(--color-primary-hover)",
          accent: "var(--color-accent)",
          text: "var(--color-text)",
          "text-muted": "var(--color-text-muted)",
          border: "var(--color-border)",
          success: "var(--color-success)",
          warning: "var(--color-warning)",
          danger: "var(--color-danger)",
          info: "var(--color-info)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        display: ["3.25rem", { lineHeight: "1.08", letterSpacing: "-0.02em" }],
        "display-sm": ["2.5rem", { lineHeight: "1.12", letterSpacing: "-0.015em" }],
        "display-xs": ["2rem", { lineHeight: "1.18", letterSpacing: "-0.01em" }],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(36, 32, 28, 0.04), 0 4px 16px -4px rgba(36, 32, 28, 0.08)",
        lift: "0 2px 4px rgba(36, 32, 28, 0.04), 0 16px 40px -12px rgba(36, 32, 28, 0.16)",
        glow: "0 12px 40px -12px rgba(178, 143, 76, 0.45)",
        ring: "inset 0 0 0 1px rgba(178, 143, 76, 0.22)",
      },
      backgroundImage: {
        "gold-sheen":
          "linear-gradient(135deg, #f2deb4 0%, #e6c98e 55%, #d6b574 100%)",
        "champagne-wash":
          "linear-gradient(180deg, #fffdf8 0%, #fcf9f3 40%, #f5ead7 100%)",
        "paper-grain":
          "radial-gradient(circle at 20% 10%, rgba(201,169,97,0.10), transparent 45%), radial-gradient(circle at 85% 0%, rgba(143,112,56,0.08), transparent 40%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "drift": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "sheen": {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "scale-in": "scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both",
        drift: "drift 7s ease-in-out infinite",
        sheen: "sheen 2.4s ease-in-out infinite",
      },
      transitionTimingFunction: {
        refined: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
