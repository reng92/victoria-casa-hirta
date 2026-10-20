"use client";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Frecce, Home e Fine spostano la tab attiva (pattern ARIA con roving tabindex)
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const current = items.findIndex((it) => it.key === active);
    let next = current;
    if (e.key === "ArrowRight") next = (current + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (current - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    setActive(items[next].key);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Sezioni"
        onKeyDown={onKeyDown}
        className={
          isSeg
            ? "relative inline-flex w-full sm:w-auto p-1 rounded-full bg-surface-2 border border-border"
            : "relative flex gap-1 border-b border-border overflow-x-auto no-scrollbar"
        }
      >
        {items.map((it, i) => {
          const selected = it.key === active;
          return (
            <button
              key={it.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
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
