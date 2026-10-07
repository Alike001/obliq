import Link from "next/link";
import { useId } from "react";

/** The mark: an O cut through at the slant the product is named for. */
function Mark() {
  const id = useId();
  return (
    <svg
      viewBox="0 0 28 28"
      className="size-7 flex-none"
      fill="none"
      aria-hidden
    >
      <mask
        id={id}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="28"
        height="28"
      >
        <rect width="28" height="28" fill="#fff" />
        <path d="M21 -1 7 29" stroke="#000" strokeWidth="3.5" />
      </mask>
      <circle
        cx="14"
        cy="14"
        r="9.5"
        stroke="currentColor"
        strokeWidth="5"
        mask={`url(#${id})`}
      />
    </svg>
  );
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex min-h-11 items-center gap-2 text-[1.3125rem] font-semibold tracking-tight no-underline ${inverse ? "text-white" : "text-ink"}`}
      aria-label="Obliq home"
    >
      <Mark />
      obliq
    </Link>
  );
}
