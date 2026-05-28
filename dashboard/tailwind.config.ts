import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Apple Dark Mode System Colors
        "apple-blue": "#0A84FF",
        "apple-indigo": "#5E5CE6",
        "apple-purple": "#BF5AF2",
        "apple-pink": "#FF375F",
        "apple-red": "#FF453A",
        "apple-orange": "#FF9F0A",
        "apple-yellow": "#FFD60A",
        "apple-green": "#30D158",
        "apple-teal": "#64D2FF",
        "apple-cyan": "#6AC4DC",
        // Semantic aliases
        "brand-green": "#0A84FF",  // Remapped to Apple Blue
        "brand-gold": "#FF9F0A",   // Apple Orange for warnings/running
        // Apple System Grays (Dark Mode)
        "gray-1": "#8E8E93",
        "gray-2": "#636366",
        "gray-3": "#48484A",
        "gray-4": "#3A3A3C",
        "gray-5": "#2C2C2E",
        "gray-6": "#1C1C1E",
        // Semantic tokens
        background: "#000000",
        card: {
          DEFAULT: "#1C1C1E",
          foreground: "#F5F5F7",
        },
        border: "#38383A",
        input: "#2C2C2E",
        ring: "#0A84FF",
        primary: {
          DEFAULT: "#0A84FF",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#2C2C2E",
          foreground: "#F5F5F7",
        },
        muted: {
          DEFAULT: "#1C1C1E",
          foreground: "#8E8E93",
        },
        accent: {
          DEFAULT: "#2C2C2E",
          foreground: "#F5F5F7",
        },
        destructive: {
          DEFAULT: "#FF453A",
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "#1C1C1E",
          foreground: "#F5F5F7",
        },
        foreground: "#F5F5F7",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      keyframes: {
        "pulse-status": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(10, 132, 255, 0.4)" },
          "50%": { boxShadow: "0 0 0 6px rgba(10, 132, 255, 0)" },
        },
      },
      animation: {
        "pulse-status": "pulse-status 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
