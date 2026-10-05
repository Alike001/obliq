import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-3"
      aria-label="Obliq home"
    >
      <span
        className={`grid size-8 place-items-center rounded-full border ${inverse ? "border-white/30" : "border-ink/20"}`}
      >
        <span
          className={`size-2.5 rounded-full ${inverse ? "bg-mint" : "bg-ink"}`}
        />
      </span>
      <span
        className={`text-lg font-semibold tracking-[-0.04em] ${inverse ? "text-white" : "text-ink"}`}
      >
        obliq
      </span>
    </Link>
  );
}
