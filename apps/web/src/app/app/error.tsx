"use client";

import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[60vh] place-items-center p-6">
      <section className="card max-w-lg p-8" role="alert">
        <p className="eyebrow">Not completed</p>
        <h1 className="mt-4 text-2xl font-semibold">
          This page or action did not complete.
        </h1>
        <p className="text-muted mt-3 text-sm leading-6">
          If you were opening a record, nothing was shown in its place. If you
          were submitting a form, treat it as not recorded until you see the
          change on the record itself.
        </p>
        <p className="text-muted mt-3 text-sm leading-6">
          Open the record and check it before you submit again, so nothing is
          entered twice.
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
          <Link className="button button-light" href="/app">
            Back to overview
          </Link>
        </div>
      </section>
    </main>
  );
}
