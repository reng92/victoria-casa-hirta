import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Colori societari (invariati)
        brand: {
          blue: "#102c5c",
          red: "#e70d0c",
          DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)",
          soft: "rgb(var(--brand-soft-rgb) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          soft: "rgb(var(--accent-soft-rgb) / <alpha-value>)",
        },
        // Token semantici (dark default, light in [data-theme="light"])
        bg: "rgb(var(--bg-rgb) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface-rgb) / <alpha-value>)",
          2: "rgb(var(--surface-2-rgb) / <alpha-value>)",
        },
        border: "var(--border)",
        text: "rgb(var(--text-rgb) / <alpha-value>)",
        muted: "rgb(var(--muted-rgb) / <alpha-value>)",
        win: "rgb(var(--win-rgb) / <alpha-value>)",
        draw: "rgb(var(--draw-rgb) / <alpha-value>)",
        loss: "rgb(var(--loss-rgb) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Scala tipografica fluida
        display: ["clamp(2.5rem, 2rem + 2.5vw, 4rem)", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "700" }],
        h1: ["clamp(2rem, 1.6rem + 2vw, 3rem)", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "700" }],
        h2: ["clamp(1.5rem, 1.3rem + 1vw, 2rem)", { lineHeight: "1.15", letterSpacing: "-0.015em", fontWeight: "700" }],
        h3: ["clamp(1.125rem, 1.05rem + 0.4vw, 1.375rem)", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" }],
      },
      borderRadius: {
        card: "16px",
        hero: "24px",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px -12px rgb(0 0 0 / 0.25)",
        card: "0 1px 0 rgb(255 255 255 / 0.04) inset, 0 10px 30px -18px rgb(0 0 0 / 0.5)",
        glow: "0 0 0 1px rgb(var(--accent-rgb) / 0.35), 0 12px 40px -16px rgb(var(--accent-rgb) / 0.45)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-dot": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.6)", opacity: "0.4" },
        },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        shimmer: "shimmer 1.8s linear infinite",
        "pulse-dot": "pulse-dot 1.2s ease-in-out infinite",
      },
      screens: {
        xs: "400px",
      },
    },
  },
  plugins: [],
};

export default config;
