"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Plays the authority track in order as it scrolls into view: each lane
 * draws in, then the five steps land one after another, so the hand-offs read
 * as a sequence. With reduced motion the track is simply shown.
 */
export function TrackReveal({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({
            defaults: { ease: "power3.out" },
            scrollTrigger: { trigger: root.current, start: "top 78%" },
          })
          .from(".lane-bg", {
            scaleX: 0,
            transformOrigin: "left",
            stagger: 0.1,
            duration: 0.7,
          })
          .from(
            ".lane-name",
            { autoAlpha: 0, x: -12, stagger: 0.1, duration: 0.4 },
            "-=0.6",
          )
          .from(
            ".step",
            { autoAlpha: 0, y: 26, stagger: 0.16, duration: 0.55 },
            "-=0.35",
          );
      });
    },
    { scope: root },
  );

  return <div ref={root}>{children}</div>;
}
