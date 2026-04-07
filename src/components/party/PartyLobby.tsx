"use client";

import { useState, useCallback } from "react";
import { Copy, Check, LogOut, Play, Shield, AlertTriangle } from "lucide-react";
import { PartyMemberCard } from "./PartyMemberCard";
import { PartyChatWindow } from "./PartyChatWindow";
import { PartyChatInput } from "./PartyChatInput";

// ── Types ──

interface PartyMember {
  userId: string;
  nickname: string;
  presetId: string;
  presetLabel: string;
  level: number;
  hp: number;
  maxHp: number;
  portraitUrl?: string | null;
  isLeader: boolean;
  isReady: boolean;
  isOnline: boolean;
}

interface ChatMessage {
  id: string;
  type: "TEXT" | "SYSTEM" | "GAME_EVENT";
  senderNickname?: string;
  senderId?: string;
  text: string;
  timestamp: number;
}

interface PartyLobbyProps {
  partyName: string;
  inviteCode: string;
  members: (PartyMember | null)[];
  maxMembers?: number;
  chatMessages: ChatMessage[];
  currentUserId: string;
  isLeader: boolean;
  isReady: boolean;
  onToggleReady: () => void;
  onStartDungeon: () => void;
  onInviteToRun?: () => void;
  onLeave: () => void;
  onSendChat: (text: string) => void;
  chatSending?: boolean;
  startLoading?: boolean;
}

export function PartyLobby({
  partyName,
  inviteCode,
  members,
  maxMembers = 4,
  chatMessages,
  currentUserId,
  isLeader,
  isReady,
  onToggleReady,
  onStartDungeon,
  onInviteToRun,
  onLeave,
  onSendChat,
  chatSending = false,
  startLoading = false,
}: PartyLobbyProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Pad members array to maxMembers
  const slots: (PartyMember | null)[] = Array.from(
    { length: maxMembers },
    (_, i) => members[i] ?? null,
  );

  const allReady = members.filter(Boolean).every((m) => m!.isReady);
  const memberCount = members.filter(Boolean).length;
  const canStart = isLeader && allReady && memberCount >= 2 && !startLoading;

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }, [inviteCode]);

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 sm:px-6">
        <div>
          <h1 className="font-display text-lg font-bold text-[var(--text-primary)]">
            {partyName}
          </h1>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>
              {memberCount}/{maxMembers}명
            </span>
          </div>
        </div>

        {/* Invite code */}
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-2 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 transition-colors hover:border-[var(--gold)]/30"
        >
          <span className="font-mono text-sm tracking-widest text-[var(--gold)]">
            {inviteCode}
          </span>
          {codeCopied ? (
            <Check size={14} className="text-[var(--success-green)]" />
          ) : (
            <Copy size={14} className="text-[var(--text-muted)]" />
          )}
        </button>
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left: Member Grid */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6 [&]:[-webkit-overflow-scrolling:touch]">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {slots.map((member, i) => (
              <PartyMemberCard
                key={member?.userId ?? `empty-${i}`}
                member={member}
                isSelf={member?.userId === currentUserId}
              />
            ))}
          </div>
        </div>

        {/* Right: Chat */}
        <div className="flex h-[240px] flex-col border-t border-[var(--border-primary)] bg-[var(--bg-card)] sm:h-[280px] lg:h-auto lg:w-[320px] lg:border-l lg:border-t-0 xl:w-[360px]">
          <div className="border-b border-[var(--border-primary)] px-4 py-2">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              파티 채팅
            </span>
          </div>
          <PartyChatWindow
            messages={chatMessages}
            currentUserId={currentUserId}
            className="flex-1 px-2 py-2"
          />
          <PartyChatInput
            onSend={onSendChat}
            sending={chatSending}
          />
        </div>
      </div>

      {/* ── Footer Buttons ── */}
      <div className="flex items-center justify-between border-t border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 sm:px-6">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="flex items-center gap-1.5 rounded-md border border-[var(--border-primary)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--hp-red)]/30 hover:text-[var(--hp-red)]"
        >
          <LogOut size={16} />
          나가기
        </button>

        <div className="flex items-center gap-2">
          {/* Ready toggle (non-leader) */}
          {!isLeader && (
            <button
              onClick={onToggleReady}
              className={`flex items-center gap-1.5 rounded-md px-4 py-3 text-sm font-semibold transition-colors ${
                isReady
                  ? "border border-[var(--success-green)]/30 bg-[var(--success-green)]/10 text-[var(--success-green)]"
                  : "border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Shield size={16} />
              {isReady ? "준비 완료" : "준비"}
            </button>
          )}

          {/* Start buttons (leader only) */}
          {isLeader && (
            <div className="flex items-center gap-2">
              <button
                onClick={onStartDungeon}
                disabled={!canStart}
                className={`flex items-center gap-1.5 rounded-md px-5 py-3 text-sm font-semibold transition-colors ${
                  canStart
                    ? "bg-[var(--gold)] text-[var(--bg-primary)] hover:bg-[var(--gold)]/90"
                    : "cursor-not-allowed bg-[var(--border-primary)] text-[var(--text-muted)]"
                }`}
              >
                <Play size={16} />
                새 던전
              </button>
              {onInviteToRun && (
                <button
                  onClick={onInviteToRun}
                  disabled={!canStart}
                  className={`flex items-center gap-1.5 rounded-md border px-5 py-3 text-sm font-semibold transition-colors ${
                    canStart
                      ? "border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[var(--bg-primary)]"
                      : "cursor-not-allowed border-[var(--border-primary)] text-[var(--text-muted)]"
                  }`}
                >
                  <Play size={16} />
                  내 세계에 초대
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Leave Confirm Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="mx-4 w-full max-w-sm rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6 shadow-xl"
            style={{ animation: "fadeIn 0.15s ease-out" }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--hp-red)]/10">
                <AlertTriangle size={20} className="text-[var(--hp-red)]" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                  파티 나가기
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  정말 파티에서 나가시겠습니까?
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-md border border-[var(--border-primary)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  onLeave();
                }}
                className="flex-1 rounded-md bg-[var(--hp-red)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--hp-red)]/90"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
