"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Check } from "lucide-react";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

/**
 * A drawing of one bill part-way through its lifecycle. It is labelled as an
 * illustration and carries no live or organization data. On load it assembles
 * itself: the window settles, then the tiles, the meter and the steps follow.
 */
export function HeroWindow({ steps }: { steps: readonly string[] }) {
  const root = useRef<HTMLDivElement>(null);
  const done = 2;

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(root.current, { autoAlpha: 1 });
      });
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .fromTo(
            root.current,
            { autoAlpha: 0, y: 36, rotate: 3 },
            { autoAlpha: 1, y: 0, rotate: 0, duration: 0.9, delay: 0.15 },
          )
          .from(
            ".window-side i",
            {
              scaleX: 0,
              transformOrigin: "left",
              stagger: 0.05,
              duration: 0.4,
            },
            "-=0.45",
          )
          .from(
            ".window-kicker, .window-title",
            { autoAlpha: 0, y: 10, stagger: 0.08, duration: 0.45 },
            "<",
          )
          .from(
            ".window-tiles > div",
            { autoAlpha: 0, y: 14, stagger: 0.09, duration: 0.45 },
            "-=0.25",
          )
          .from(".window-progress", { autoAlpha: 0, duration: 0.3 }, "-=0.2")
          .from(".meter i", { width: 0, duration: 0.9, ease: "power2.out" })
          .from(
            ".window-list li",
            { autoAlpha: 0, x: -12, stagger: 0.08, duration: 0.35 },
            "-=0.7",
          )
          .from(
            ".tick-done",
            { scale: 0, stagger: 0.12, duration: 0.4, ease: "back.out(2.5)" },
            "-=0.35",
          );
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} data-reveal style={{ opacity: 0 }}>
      <div
        className="window"
        role="img"
        aria-label="Illustration with example data: a bill that has been captured and controlled, and is waiting for your signer."
      >
        <span className="window-flag">Illustration</span>
        <div className="window-top" aria-hidden>
          <i />
          <i />
          <i />
          <span>obliq / example obligation</span>
        </div>
        <div className="window-body" aria-hidden>
          <div className="window-side">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="window-main">
            <p className="window-kicker">Example bill</p>
            <p className="window-title">Approved, not yet paid.</p>
            <div className="window-tiles">
              <div>
                <small>Approvals</small>
                <strong>2 of 2</strong>
              </div>
              <div>
                <small>Signer</small>
                <strong>Yours</strong>
              </div>
              <div>
                <small>Payment</small>
                <strong>Shielded</strong>
              </div>
            </div>
            <div className="window-progress">
              <div>
                <span>Lifecycle</span>
                <b>
                  {done} of {steps.length}
                </b>
              </div>
              <div className="meter">
                <i style={{ width: `${(done / steps.length) * 100}%` }} />
              </div>
            </div>
            <ul className="window-list">
              {steps.slice(0, 4).map((name, index) => (
                <li key={name}>
                  <span className={index < done ? "tick tick-done" : "tick"}>
                    {index < done && <Check size={9} />}
                  </span>
                  <span>{name}</span>
                  <span>
                    {index < done
                      ? "done"
                      : index === done
                        ? "your signer"
                        : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
