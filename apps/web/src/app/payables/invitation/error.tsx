"use client";

export default function RecipientInvitationError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-wrap grid min-h-[60vh] place-items-center py-10">
      <section className="card max-w-lg p-8" role="alert">
        <p className="eyebrow">Not completed</p>
        <h1 className="mt-4 text-2xl font-semibold">This page did not load.</h1>
        <p className="text-muted mt-3 text-sm leading-6">
          This page cannot determine whether an in-progress request completed.
          Try again in this tab to recover the authoritative result, or open the
          link in your email once more if you had not submitted an address.
        </p>
        <button className="button button-dark mt-6" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
