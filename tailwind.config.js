/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./views/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#1d3b8b",
        "primary-dark": "#152a6b",
        "background-light": "#f6f6f8",
        "background-dark": "#121620",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        "primary": "0 25px 50px -12px rgba(29, 59, 139, 0.25)",
        "primary-lg": "0 20px 25px -5px rgba(29, 59, 139, 0.2), 0 8px 10px -6px rgba(29, 59, 139, 0.15)",
      },
    },
  },
  plugins: [],
}
