"use client";

import { MotionConfig, motion } from "motion/react";
import { useEffect } from "react";

const easeOut = [0.22, 1, 0.36, 1] as const;

/**
 * Honours the visitor's reduced-motion setting for every Motion component.
 * `data-motion` tells the stylesheet that scripts started; until it is set, a
 * failsafe shows content that would otherwise wait for an animation.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.motion = "on";
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/**
 * Content rises in the first time it is scrolled to. `data-reveal` lets the
 * root layout show it when scripts are off.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: easeOut, delay }}
    >
      {children}
    </motion.div>
  );
}
