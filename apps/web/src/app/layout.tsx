import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Obliq — Private financial operations",
    template: "%s — Obliq",
  },
  description:
    "Manage bills, approvals and private Zcash settlements without giving up control of your treasury.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
