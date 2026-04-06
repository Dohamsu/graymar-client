"use client";

import { useEffect, useState } from "react";
import { Clock, CheckCircle2, Circle } from "lucide-react";
import type { TurnWaitingStatus } from "@/types/party";

interface PartyTurnStatusProps {
  turnStatus: TurnWaitingStatus;
  totalMembers: number;
}

export function PartyTurnStatus({
  turnStatus,
  totalMembers,
}: PartyTurnStatusProps) {
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    const update = () => {
      const left = Math.max(
        0,
        Math.ceil(
          (new Date(turnStatus.deadline).getTime() - Date.now()) / 1000,
        ),
      );
      setSecondsLeft(left);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [turnStatus.deadline]);

  const submittedCount = turnStatus.submitted.length;
  const progress = totalMembers > 0 ? submittedCount / totalMembers : 0;

  return (
    <div className="flex items-center gap-3 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2">
      {/* Submit count */}
      <div className="flex items-center gap-1.5">
        {submittedCount < totalMembers ? (
          <Circle size={14} className="text-[var(--gold)]" />
        ) : (
          <CheckCircle2 size={14} className="text-emerald-400" />
        )}
        <span className="text-xs font-medium text-[var(--text-primary)]">
          {submittedCount}/{totalMembers} 제출
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-primary)]">
          <div
            className="h-full rounded-full bg-[var(--gold)] transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Timer */}
      <div
        className={`flex items-center gap-1 text-xs font-medium ${
          secondsLeft <= 5
            ? "text-[var(--hp-red)]"
            : secondsLeft <= 10
              ? "text-amber-400"
              : "text-[var(--text-muted)]"
        }`}
      >
        <Clock size={12} />
        {secondsLeft}초
      </div>
    </div>
  );
}
