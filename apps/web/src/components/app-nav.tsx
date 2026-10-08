"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { appSections } from "./app-sections";

/** The section a path belongs to: the overview only on an exact match. */
function isCurrent(pathname: string, href: string) {
  return href === "/app"
    ? pathname === "/app"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-6 grid gap-1" aria-label="Application">
      {appSections.map(([label, href, Icon, status]) => {
        const current = isCurrent(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className="side-link"
            aria-current={current ? "page" : undefined}
          >
            {current && (
              <motion.span
                layoutId="side-active"
                className="side-active"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <Icon size={16} aria-hidden />
            <span className="flex-1">{label}</span>
            {status !== "IMPLEMENTED" && (
              <span className="side-soon">Planned</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function TabNav() {
  const pathname = usePathname();
  return (
    <nav
      className="hairline bg-panel flex gap-1 overflow-x-auto border-b px-3 py-2 lg:hidden"
      aria-label="Application mobile"
    >
      {appSections.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className="tab-link"
          aria-current={isCurrent(pathname, href) ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
