export default function AppLoading() {
  return (
    <main className="p-4 md:p-8" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-4 w-32 rounded bg-stone-300" />
        <div className="mt-4 h-9 w-72 rounded bg-stone-300" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="h-40 rounded-2xl bg-stone-200" />
          <div className="h-40 rounded-2xl bg-stone-200" />
        </div>
        <span className="sr-only">Loading financial records</span>
      </div>
    </main>
  );
}
