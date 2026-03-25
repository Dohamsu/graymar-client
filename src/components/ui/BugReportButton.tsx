"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { BugReportModal } from "./BugReportModal";

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const runId = useGameStore((s) => s.runId);

  if (!runId) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-muted)] shadow-lg transition hover:border-[var(--gold)]/40 hover:text-[var(--gold)] lg:bottom-8 lg:right-8 lg:h-10 lg:w-10"
        title="버그 신고"
      >
        <Bug size={18} />
      </button>
      {open && <BugReportModal onClose={() => setOpen(false)} />}
    </>
  );
}
