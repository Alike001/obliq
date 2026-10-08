import Link from "next/link";
import { useId } from "react";

/** The mark: an O cut through at the slant the product is named for. */
function Mark() {
  const id = useId();
  return (
    <span className="brand-mark" aria-hidden>
      <svg viewBox="0 0 28 28" fill="none">
        <mask
          id={id}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="28"
          height="28"
        >
          <rect width="28" height="28" fill="#fff" />
          <path d="M21 -1 7 29" stroke="#000" strokeWidth="4" />
        </mask>
        <circle
          cx="14"
          cy="14"
          r="9"
          stroke="currentColor"
          strokeWidth="6"
          mask={`url(#${id})`}
        />
      </svg>
    </span>
  );
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={inverse ? "brand brand-inverse" : "brand"}
      aria-label="Obliq home"
    >
      <Mark />
      obliq
    </Link>
  );
}
