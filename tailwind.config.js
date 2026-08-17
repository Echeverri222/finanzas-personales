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
        //
        // These carry `/ <alpha-value>` while the shadcn block above does not,
        // and the difference is load-bearing: it is what makes `bg-income/10`
        // (a tinted icon surface derived from the ink colour) compile. Without
        // the placeholder Tailwind cannot inject an alpha channel, and the
        // opacity modifier is dropped SILENTLY -- you get a fully opaque
        // block of colour instead of a tint. Tailwind substitutes 1 when no
        // modifier is used, so unmodified `bg-success` is unchanged.
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
          muted: "hsl(var(--success-muted) / <alpha-value>)",
          "muted-foreground": "hsl(var(--success-muted-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
          muted: "hsl(var(--warning-muted) / <alpha-value>)",
          "muted-foreground": "hsl(var(--warning-muted-foreground) / <alpha-value>)",
        },

        // Money direction, deliberately named apart from status.
        income: "hsl(var(--income) / <alpha-value>)",
        expense: "hsl(var(--expense) / <alpha-value>)",

        // Chart palette. chart-1..8 slot order is the colour-blindness
        // contract -- do not reorder.
        chart: {
          grid: "hsl(var(--chart-grid) / <alpha-value>)",
          axis: "hsl(var(--chart-axis) / <alpha-value>)",
          1: "hsl(var(--chart-1) / <alpha-value>)",
          2: "hsl(var(--chart-2) / <alpha-value>)",
          3: "hsl(var(--chart-3) / <alpha-value>)",
          4: "hsl(var(--chart-4) / <alpha-value>)",
          5: "hsl(var(--chart-5) / <alpha-value>)",
          6: "hsl(var(--chart-6) / <alpha-value>)",
          7: "hsl(var(--chart-7) / <alpha-value>)",
          8: "hsl(var(--chart-8) / <alpha-value>)",
        },
      },
      // --font-inter is provided by next/font/google in pages/_app.js, which
      // also puts the class that defines it on the app wrapper. The fallback
      // chain matters: it is what renders during `display: swap`.
      fontFamily: {
        display: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        // For money and dates only -- see components/money/Amount.tsx. Supplied
        // by next/font/google as --font-mono in pages/_app.js, same wiring as
        // --font-inter. The fallback chain is what renders during `swap`, and
        // every entry in it is metrically monospaced, so amounts never reflow
        // out of column alignment while the webfont loads.
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 3px)",
        sm: "calc(var(--radius) - 6px)",
        xl: "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        "primary": "0 25px 50px -12px rgba(29, 59, 139, 0.25)",
        "primary-lg": "0 20px 25px -5px rgba(29, 59, 139, 0.2), 0 8px 10px -6px rgba(29, 59, 139, 0.15)",
        // The "subtle ambient shadow" from the Stitch spec. Cards are defined
        // by their border and their tonal step off --background; this only
        // separates a card from the page at the edges, and `card-hover` is for
        // interactive surfaces (a clickable row or tile), never static ones.
        "card": "0 1px 2px 0 rgb(16 24 40 / 0.04)",
        "card-hover": "0 4px 6px -1px rgb(16 24 40 / 0.05), 0 2px 4px -2px rgb(16 24 40 / 0.05)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
