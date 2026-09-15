import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Cairo", "Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "loading-sweep": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
        },
      },
      animation: {
        "loading-sweep": "loading-sweep 1.2s ease-in-out infinite",
      },
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#bcdbff",
          300: "#8ec3ff",
          400: "#59a2ff",
          500: "#3380ff",
          600: "#1c5ff5",
          700: "#1749e0",
          800: "#193cb5",
          900: "#1a378f",
          950: "#142257",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
