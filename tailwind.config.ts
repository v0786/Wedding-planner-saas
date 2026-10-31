import type { Config } from "tailwindcss";

/**
 * Wedding Guest Planner — design tokens.
 *
 * The palette is warm and editorial: ivory paper, champagne surfaces and a
 * muted gold accent. Neutrals are warm (never blue-gray) so long dashboard
 * sessions feel calm rather than clinical.
 */
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
          50: "#FDFCF9",
          100: "#FAF7F0",
          200: "#F5EFE3",
          300: "#EDE4D2",
          400: "#E1D5BC",
        },
        champagne: {
          100: "#F7EEDC",
          200: "#EFE0C4",
          300: "#E2CCA4",
          400: "#D3B887",
        },
        gold: {
          200: "#E8D6AE",
          300: "#D9BE87",
          400: "#C9A961",
          500: "#B28F4C",
          600: "#8F7038",
          700: "#6B5227",
        },
        ink: {
          100: "#EDE9E3",
          200: "#D8D2C9",
          300: "#B5ADA3",
          400: "#948A7E",
          500: "#756B60",
          600: "#554D45",
          700: "#3A342E",
          800: "#24201C",
          900: "#151210",
        },
        sage: {
          50: "#F2F6F1",
          100: "#E2EDE1",
          300: "#B4CBB4",
          500: "#5F8A63",
          600: "#4A7050",
          700: "#3A5A40",
        },
        rose: {
          50: "#FBF2F1",
          100: "#F7E4E1",
          300: "#E0B0A9",
          500: "#B4574D",
          600: "#9A463D",
          700: "#7D3830",
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
          "linear-gradient(135deg, #C9A961 0%, #8F7038 55%, #6B5227 100%)",
        "champagne-wash":
          "linear-gradient(180deg, #FDFCF9 0%, #FAF7F0 40%, #F5EFE3 100%)",
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
