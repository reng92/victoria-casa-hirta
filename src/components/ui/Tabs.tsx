"use client";
import { useId, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
  content: ReactNode;
}

interface Props {
  items: TabItem[];
  defaultKey?: string;
  /** "segmented" = pill compatta (Prossime/Risultati); "underline" = tab con linea. */
  variant?: "segmented" | "underline";
  className?: string;
}

/**
 * Tab / segmented control accessibile. I contenuti possono essere
 * server component: vengono renderizzati lato server e solo mostrati/nascosti qui.
 */
export default function Tabs({ items, defaultKey, variant = "segmented", className = "" }: Props) {
  const [active, setActive] = useState(defaultKey ?? items[0]?.key);
  const id = useId();
  const reduce = useReducedMotion();
  const layoutId = `tab-indicator-${id}`;

  const isSeg = variant === "segmented";

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Sezioni"
        className={
          isSeg
            ? "relative inline-flex w-full sm:w-auto p-1 rounded-full bg-surface-2 border border-border"
            : "relative flex gap-1 border-b border-border overflow-x-auto no-scrollbar"
        }
      >
        {items.map((it) => {
          const selected = it.key === active;
          return (
            <button
              key={it.key}
              role="tab"
              id={`${id}-tab-${it.key}`}
              aria-selected={selected}
              aria-controls={`${id}-panel-${it.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(it.key)}
              className={
                isSeg
                  ? `relative flex-1 sm:flex-none sm:min-w-[120px] px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                      selected ? "text-white" : "text-muted hover:text-text"
                    }`
                  : `relative shrink-0 px-4 py-3 text-sm font-semibold transition-colors ${
                      selected ? "text-text" : "text-muted hover:text-text"
                    }`
              }
            >
              {selected && (
                <motion.span
                  layoutId={layoutId}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                  className={
                    isSeg
                      ? "absolute inset-0 rounded-full tab-indicator shadow-glow"
                      : "absolute left-0 right-0 -bottom-px h-0.5 tab-indicator rounded-full"
                  }
                  aria-hidden
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                {it.label}
                {typeof it.count === "number" && (
                  <span
                    className={`text-[11px] tabular px-1.5 py-px rounded-full ${
                      selected && isSeg ? "bg-white/20 text-white" : "bg-surface border border-border text-muted"
                    }`}
                  >
                    {it.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {items.map((it) => (
        <div
          key={it.key}
          role="tabpanel"
          id={`${id}-panel-${it.key}`}
          aria-labelledby={`${id}-tab-${it.key}`}
          hidden={it.key !== active}
          className="mt-5 focus:outline-none"
        >
          {it.content}
        </div>
      ))}
    </div>
  );
}
