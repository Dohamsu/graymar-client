"use client";

import { useEffect, useState } from "react";
import { MapPin, Check, X, Clock } from "lucide-react";
import type { PartyVoteDTO } from "@/types/party";

interface VoteModalProps {
  vote: PartyVoteDTO;
  currentUserId: string;
  onCast: (voteId: string, choice: "yes" | "no") => void;
}

export function VoteModal({ vote, currentUserId, onCast }: VoteModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const isProposer = vote.proposerId === currentUserId;

  useEffect(() => {
    const update = () => {
      const left = Math.max(
        0,
        Math.ceil((new Date(vote.expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(left);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [vote.expiresAt]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-sm rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <MapPin size={18} className="text-[var(--gold)]" />
          <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
            이동 투표
          </h3>
        </div>

        {/* Destination */}
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--gold)]">
            {vote.proposerNickname}
          </span>
          님이{" "}
          <span className="font-medium text-[var(--text-primary)]">
            {vote.targetLocationName ?? vote.targetLocationId}
          </span>
          (으)로의 이동을 제안했습니다.
        </p>

        {/* Vote counts */}
        <div className="mb-4 flex items-center justify-between rounded-md bg-[var(--bg-primary)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-400" />
            <span className="text-sm text-[var(--text-primary)]">
              찬성 {vote.yesVotes}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <X size={16} className="text-red-400" />
            <span className="text-sm text-[var(--text-primary)]">
              반대 {vote.noVotes}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Clock size={14} />
            {secondsLeft}초
          </div>
        </div>

        {/* Actions */}
        {!isProposer && (
          <div className="flex gap-3">
            <button
              onClick={() => onCast(vote.id, "yes")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              <Check size={16} />
              찬성
            </button>
            <button
              onClick={() => onCast(vote.id, "no")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              <X size={16} />
              반대
            </button>
          </div>
        )}
        {isProposer && (
          <p className="text-center text-xs text-[var(--text-muted)]">
            투표 결과를 기다리는 중...
          </p>
        )}
      </div>
    </div>
  );
}
