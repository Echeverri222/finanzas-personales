/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./views/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",

  // Required, not belt-and-braces. `.dark { --background: ... }` in
  // styles/globals.css is a CLASS selector inside @layer base, so Tailwind only
  // keeps it if `dark` turns up as a candidate while scanning `content`. It
  // never does: the codebase only contains `dark:`-prefixed utilities, which
  // extract as different candidates, and the class itself is set at runtime on
  // <html> where a static scanner cannot see it.
  //
  // Without this the entire dark token block is dropped from the bundle, so the
  // theme toggle would appear to work (the class lands on <html>, `dark:`
  // variants fire) while every token stayed at its light value. Verified by
  // compiling globals.css with and without.
  safelist: ["dark"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      colors: {
        // shadcn tokens (HSL CSS variables)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Semantic status. `success`/`warning` are solid ink (AA for small
        // text); the `muted` pair is the tinted-surface + ink combination the
        // Badge uses. See styles/globals.css for which to reach for.
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          muted: "hsl(var(--success-muted))",
          "muted-foreground": "hsl(var(--success-muted-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          muted: "hsl(var(--warning-muted))",
          "muted-foreground": "hsl(var(--warning-muted-foreground))",
        },

        // Money direction, deliberately named apart from status.
        income: "hsl(var(--income))",
        expense: "hsl(var(--expense))",

        // Chart palette. chart-1..8 slot order is the colour-blindness
        // contract -- do not reorder.
        chart: {
          grid: "hsl(var(--chart-grid))",
          axis: "hsl(var(--chart-axis))",
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
          6: "hsl(var(--chart-6))",
          7: "hsl(var(--chart-7))",
          8: "hsl(var(--chart-8))",
        },
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        "primary": "0 25px 50px -12px rgba(29, 59, 139, 0.25)",
        "primary-lg": "0 20px 25px -5px rgba(29, 59, 139, 0.2), 0 8px 10px -6px rgba(29, 59, 139, 0.15)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
