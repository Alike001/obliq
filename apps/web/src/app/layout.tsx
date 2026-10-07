import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";

// Downloaded at build time and served from this origin, so a visitor's
// browser never contacts a font service.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-plex-serif",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

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
    <html
      lang="en"
      className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
