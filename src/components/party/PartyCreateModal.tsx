"use client";

import { useState } from "react";
import { X, Loader2, Users } from "lucide-react";

interface PartyCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (partyName: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function PartyCreateModal({
  open,
  onClose,
  onSubmit,
  loading = false,
  error = null,
}: PartyCreateModalProps) {
  const [name, setName] = useState("");

  if (!open) return null;

  const canSubmit = name.trim().length >= 2 && name.trim().length <= 20 && !loading;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (canSubmit) onSubmit(name.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div
        className="w-full rounded-t-xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-2xl sm:mx-4 sm:max-w-sm sm:rounded-lg sm:rounded-t-lg"
        style={{ animation: "fadeIn 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[var(--gold)]" />
            <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
              파티 생성
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">
              파티 이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="2~20자 파티 이름"
              autoFocus
              className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
              <span>파티를 만들면 초대 코드가 생성됩니다</span>
              <span>{name.length}/20</span>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-[var(--hp-red)]/10 px-3 py-2 text-xs text-[var(--hp-red)]">
              {error}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`flex items-center gap-1.5 rounded-md px-5 py-3 text-sm font-semibold transition-colors ${
                canSubmit
                  ? "bg-[var(--gold)] text-[var(--bg-primary)] hover:bg-[var(--gold)]/90"
                  : "cursor-not-allowed bg-[var(--border-primary)] text-[var(--text-muted)]"
              }`}
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              파티 생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
