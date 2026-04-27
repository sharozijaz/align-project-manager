/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 22px 60px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: ["Jost", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Jost", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
