/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef6ff",
          100: "#d9ebff",
          200: "#bcddff",
          300: "#8ec8ff",
          400: "#59a8ff",
          500: "#3385ff",
          600: "#1d64f5",
          700: "#1650e1",
          800: "#1841b6",
          900: "#193a8f",
          950: "#142557",
        },
        navy: {
          50: "#f0f4fc",
          100: "#e0e9f8",
          200: "#c7d6f2",
          300: "#a1bae7",
          400: "#7495d9",
          500: "#5376cc",
          600: "#415ebd",
          700: "#384eaa",
          800: "#33438b",
          900: "#2e3b6f",
          950: "#1e2642",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
