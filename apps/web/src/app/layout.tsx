import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { MotionProvider } from "@/components/motion";
import "./globals.css";

// Downloaded at build time and served from this origin, so a visitor's
// browser never contacts a font service.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
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
    <html lang="en" className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body>
        {/* Animated content starts hidden; without scripts it must not stay so. */}
        <noscript>
          <style>
            {
              "[data-reveal]{opacity:1!important;visibility:visible!important;transform:none!important}"
            }
          </style>
        </noscript>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
