"use client";

export default function AppError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[60vh] place-items-center p-6">
      <section className="card max-w-lg p-8 text-center">
        <p className="eyebrow">Operation unavailable</p>
        <h1 className="mt-4 text-2xl font-semibold">
          We could not load this financial record.
        </h1>
        <p className="text-muted mt-3 text-sm leading-6">
          The database or request failed explicitly. No temporary or fake record
          was substituted.
        </p>
        <button className="button button-dark mt-6" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
