import Head from 'next/head';

/**
 * Page title + optional description and right-aligned actions.
 *
 * Also sets <title>, which no page had. The heading scale (2xl -> 3xl on
 * desktop, tight tracking) comes from both reference designs; the old text-2xl
 * gave the page name no more weight than a card heading, so screens read as a
 * stack of panels with nothing announcing what you were looking at.
 */
export function PageHeader({ title, description, documentTitle, children }) {
  return (
    <>
      <Head>
        <title>{`${documentTitle || title} · Finanzas`}</title>
      </Head>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children ? (
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        ) : null}
      </div>
    </>
  );
}

/**
 * The `label-caps` style from the Stitch spec: uppercase, tracked-out, small
 * and quiet. Used for table headers, stat labels and section titles so the eye
 * can tell structure from content without reading either.
 */
export function SectionLabel({ children, className = '' }) {
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground ${className}`}
    >
      {children}
    </p>
  );
}
