import { Construction } from "lucide-react";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/status-pill";
import { appSections } from "@/components/app-shell";

export function generateStaticParams() {
  return appSections
    .filter(([, , , status]) => status !== "IMPLEMENTED")
    .map(([, href]) => ({ section: href.split("/").at(-1) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const entry = appSections.find(([, href]) => href === `/app/${section}`);
  return entry ? { title: entry[0] } : {};
}

export default async function FoundationSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const entry = appSections.find(([, href]) => href === `/app/${section}`);
  if (!entry) notFound();
  const [label, , , status] = entry;
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center p-6">
      <section className="card bg-panel max-w-xl p-8 text-center md:p-12">
        <span className="empty-icon mx-auto">
          <Construction size={21} />
        </span>
        <div className="mt-6">
          <StatusPill status={status} />
        </div>
        <h1 className="mt-5 text-3xl font-medium tracking-[-.04em]">{label}</h1>
        <p className="text-muted mt-4 text-sm leading-6">
          {label} is planned and not built yet. It is listed so you can see
          where it will live. Nothing on this page can record, move or claim to
          move funds.
        </p>
        <a
          href="/docs/implementation-status"
          className="button button-light mt-7"
        >
          Read implementation status
        </a>
      </section>
    </main>
  );
}
