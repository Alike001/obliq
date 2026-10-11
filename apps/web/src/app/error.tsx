"use client";

import { Brand } from "@/components/brand";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <header className="site-nav">
        <div className="page-wrap flex items-center py-3">
          <Brand />
        </div>
      </header>
      <main className="page-wrap grid min-h-[60vh] place-items-center py-16">
        <section className="card max-w-lg p-8" role="alert">
          <p className="eyebrow">Not loaded</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            This page did not load.
          </h1>
          <p className="text-muted mt-3 text-sm leading-6">
            This is a fault on our side or a dropped connection, not a statement
            about any record or payment. If you were submitting something, treat
            it as not confirmed until you see the result.
          </p>
          {error.digest && (
            <p className="text-ink-3 mt-4 text-xs">
              Reference for support:{" "}
              <code className="break-all">{error.digest}</code>
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="button button-dark" onClick={reset}>
              Try again
            </button>
            {/* A full load, in case the fault is in the running page itself. */}
            <a className="button button-light" href="/">
              Back to the start
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
