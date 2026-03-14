import type { ReactNode } from "react";

/** 순수 CSS 호버 툴팁 — Tailwind group/stat 패턴 */
export function StatTooltip({
  children,
  hint,
}: {
  children: ReactNode;
  hint: string;
}) {
  if (!hint) return <>{children}</>;

  return (
    <div className="group/stat relative">
      {children}
      <div
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2
          -translate-x-1/2 w-max max-w-[200px] rounded border border-[var(--border-primary)]
          bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-secondary)]
          opacity-0 shadow-lg transition-opacity group-hover/stat:opacity-100"
        role="tooltip"
      >
        {hint}
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--bg-secondary)]" />
      </div>
    </div>
  );
}
