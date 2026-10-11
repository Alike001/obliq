export default function ProofLoading() {
  return (
    <main aria-busy="true" aria-live="polite">
      <div className="bg-[#161616]">
        <div className="page-wrap animate-pulse py-20 motion-reduce:animate-none md:py-24">
          <div className="h-4 w-32 rounded bg-white/15" />
          <div className="mt-6 h-12 w-full max-w-2xl rounded bg-white/15" />
          <div className="mt-6 h-4 w-full max-w-xl rounded bg-white/10" />
        </div>
      </div>
      <div className="page-wrap animate-pulse pt-16 motion-reduce:animate-none">
        <div className="h-7 w-80 max-w-full rounded bg-stone-300" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="h-28 rounded-2xl bg-stone-200" />
          <div className="h-28 rounded-2xl bg-stone-200" />
        </div>
      </div>
      <span className="sr-only">Loading what is proven</span>
    </main>
  );
}
