import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        marista: {
          primary: "#00ADEF",
          light: "#33BEF2",
          dark: "#0B3B5B",
          navy: "#0B3B5B",
          cyan: "#00ADEF",
          50: "#EAF6FC",
          100: "#D5ECF7",
          200: "#A6DCF2",
          300: "#66C7EE",
          400: "#33BEF2",
          500: "#00ADEF",
          600: "#008DC4",
          700: "#0B3B5B",
          800: "#082E47",
          900: "#051D2E",
        },
        success: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        danger: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        warning: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        neutral: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["Outfit", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "marista-gradient":
          "linear-gradient(135deg, #003459 0%, #005288 50%, #0077B6 100%)",
        "marista-gradient-light":
          "linear-gradient(135deg, #005288 0%, #0077B6 50%, #00A8E8 100%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "slide-in-right": "slideInRight 0.3s ease-out forwards",
        "scale-in": "scaleIn 0.3s ease-out forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 82, 136, 0.15)",
        "glass-lg": "0 16px 48px 0 rgba(0, 82, 136, 0.2)",
        card: "0 4px 6px -1px rgba(0, 82, 136, 0.1), 0 2px 4px -2px rgba(0, 82, 136, 0.1)",
        "card-hover":
          "0 20px 25px -5px rgba(0, 82, 136, 0.15), 0 8px 10px -6px rgba(0, 82, 136, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
