import Link from "next/link";

export default function AppNotFound() {
  return (
    <main className="grid min-h-[60vh] place-items-center p-6">
      <section className="card max-w-lg p-8">
        <p className="eyebrow">Not found</p>
        <h1 className="mt-4 text-2xl font-semibold">
          There is no record at this address.
        </h1>
        <p className="text-muted mt-3 text-sm leading-6">
          The link may be mistyped, or the record may belong to another
          organization. Nothing was changed.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="button button-dark" href="/app">
            Back to overview
          </Link>
          <Link className="button button-light" href="/app/obligations">
            All obligations
          </Link>
        </div>
      </section>
    </main>
  );
}
