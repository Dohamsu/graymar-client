"use client";

import { useState } from "react";
import { X, Search, Users, Loader2, UserPlus } from "lucide-react";

// ── Types ──

interface PartySearchResult {
  id: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  leaderName: string;
  status: "WAITING" | "IN_GAME";
}

interface PartyJoinModalProps {
  open: boolean;
  onClose: () => void;
  onJoinByCode: (code: string) => void;
  onJoinBySearch: (partyId: string) => void;
  searchResults?: PartySearchResult[];
  onSearch?: (query: string) => void;
  loading?: boolean;
  error?: string | null;
}

type TabKey = "code" | "search";

export function PartyJoinModal({
  open,
  onClose,
  onJoinByCode,
  onJoinBySearch,
  searchResults = [],
  onSearch,
  loading = false,
  error = null,
}: PartyJoinModalProps) {
  const [tab, setTab] = useState<TabKey>("code");
  const [code, setCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  if (!open) return null;

  const canJoinByCode = code.trim().length === 6 && !loading;

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (canJoinByCode) onJoinByCode(code.trim().toUpperCase());
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim().length >= 1 && onSearch) {
      onSearch(searchQuery.trim());
    }
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "code", label: "초대 코드" },
    { key: "search", label: "파티 검색" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div
        className="flex w-full max-h-[85dvh] flex-col rounded-t-xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-2xl sm:mx-4 sm:max-h-none sm:max-w-md sm:rounded-lg sm:rounded-t-lg"
        style={{ animation: "fadeIn 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-5 py-4">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-[var(--gold)]" />
            <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
              파티 참가
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-primary)]">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-b-2 border-[var(--gold)] text-[var(--gold)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto overscroll-contain px-5 py-5 [&]:[-webkit-overflow-scrolling:touch]">
          {tab === "code" ? (
            /* ── Invite Code Tab ── */
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">
                  초대 코드 입력
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  maxLength={6}
                  placeholder="6자리 코드"
                  autoFocus
                  className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-3 text-center font-mono text-xl tracking-[0.3em] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:tracking-normal placeholder:text-base focus:border-[var(--gold)] focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  파티 리더에게 받은 6자리 코드를 입력하세요
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-[var(--hp-red)]/10 px-3 py-2 text-xs text-[var(--hp-red)]">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!canJoinByCode}
                  className={`flex items-center gap-1.5 rounded-md px-5 py-3 text-sm font-semibold transition-colors ${
                    canJoinByCode
                      ? "bg-[var(--gold)] text-[var(--bg-primary)] hover:bg-[var(--gold)]/90"
                      : "cursor-not-allowed bg-[var(--border-primary)] text-[var(--text-muted)]"
                  }`}
                >
                  {loading && <Loader2 size={12} className="animate-spin" />}
                  참가
                </button>
              </div>
            </form>
          ) : (
            /* ── Search Tab ── */
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="파티 이름으로 검색"
                    className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] py-3 pl-9 pr-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || searchQuery.trim().length < 1}
                  className="rounded-md bg-[var(--bg-secondary)] border border-[var(--border-primary)] px-3 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                </button>
              </form>

              {/* Search Results */}
              <div className="max-h-[240px] space-y-2 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[var(--text-muted)]">
                    검색 결과가 없습니다
                  </p>
                ) : (
                  searchResults.map((party) => (
                    <div
                      key={party.id}
                      className="flex items-center justify-between rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 transition-colors hover:border-[var(--gold)]/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                            {party.name}
                          </span>
                          {party.status === "IN_GAME" && (
                            <span className="shrink-0 rounded bg-[var(--hp-red)]/10 px-1.5 py-0.5 text-[10px] text-[var(--hp-red)]">
                              게임 중
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <Users size={10} />
                            {party.memberCount}/{party.maxMembers}
                          </span>
                          <span>리더: {party.leaderName}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onJoinBySearch(party.id)}
                        disabled={
                          loading ||
                          party.status === "IN_GAME" ||
                          party.memberCount >= party.maxMembers
                        }
                        className="ml-3 shrink-0 rounded-md bg-[var(--gold)] px-4 py-2.5 text-xs font-semibold text-[var(--bg-primary)] hover:bg-[var(--gold)]/90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        가입
                      </button>
                    </div>
                  ))
                )}
              </div>

              {error && (
                <div className="rounded-md bg-[var(--hp-red)]/10 px-3 py-2 text-xs text-[var(--hp-red)]">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
