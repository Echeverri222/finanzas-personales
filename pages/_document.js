import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="es" suppressHydrationWarning>
      <Head>
        {/* Inter is self-hosted via next/font/google in _app.js; the
            render-blocking <link> to fonts.googleapis.com that used to live
            here is gone on purpose. */}

        {/* Tells the browser we genuinely support both, so form controls,
            scrollbars and the pre-paint canvas follow the active theme instead
            of always rendering light chrome. */}
        <meta name="color-scheme" content="light dark" />

        {/* Mobile browser chrome. These must be literal colours -- a meta tag
            cannot read a CSS variable -- so they are hand-kept in step with
            --background in styles/globals.css. Update both together.
              light: hsl(220 23% 97%)    -> #f6f7f9
              dark:  hsl(240 10% 3.9%)   -> #09090b */}
        <meta
          name="theme-color"
          content="#f6f7f9"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#09090b"
          media="(prefers-color-scheme: dark)"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
