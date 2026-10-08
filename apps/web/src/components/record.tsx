import Link from "next/link";

/** The way back to the list a record belongs to. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="back-link">
      <span aria-hidden>←</span> {label}
    </Link>
  );
}

/** One labelled fact in a definition list. */
export function Fact({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="fact-label">{label}</dt>
      <dd className={mono ? "fact-value font-mono" : "fact-value"}>
        {children}
      </dd>
    </div>
  );
}
