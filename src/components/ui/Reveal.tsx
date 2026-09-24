"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Indice per lo stagger (60ms per step). */
  index?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}

/**
 * Entrata fade + translateY(12px) con stagger di 60ms.
 * Rispetta prefers-reduced-motion (nessuna traslazione, solo opacità istantanea).
 */
export default function Reveal({ children, index = 0, className = "", as = "div" }: Props) {
  const reduce = useReducedMotion();
  const Comp = (motion as unknown as Record<string, typeof motion.div>)[as] ?? motion.div;

  return (
    <Comp
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 }}
    >
      {children}
    </Comp>
  );
}
