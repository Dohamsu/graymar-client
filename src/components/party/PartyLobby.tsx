"use client";

import { useState, useCallback } from "react";
import { Copy, Check, LogOut, Play, Shield, AlertTriangle } from "lucide-react";
import { PartyMemberCard } from "./PartyMemberCard";
import { LobbyLoadoutPicker } from "./LobbyLoadoutPicker";
import type { LobbyLoadout } from "@/types/party";
import { PartyChatWindow } from "./PartyChatWindow";
import { PartyChatInput } from "./PartyChatInput";

// ── Types ──

interface PartyMember {
  userId: string;
  nickname: string;
  presetId: string | null;
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
  /** 시작 실패 등 store 에러 — 로비에서 무표시로 삼켜지던 것 표시 (2026-08-01 QA) */
  error?: string | null;

  // ── 로비 배경 선택 (arch/84 후속 2026-08-07) ──
  /** 내 확정 프리셋 (로비 선택 또는 최근 런 유추) */
  myPresetId?: string | null;
  /** 내 프리셋이 로비에서 직접 고른 값인가 */
  myPresetFromLobby?: boolean;
  myGender?: string | null;
  /** 배경 목록을 가져올 시나리오 팩 */
  scenarioId?: string;
  /** 배경 미선택으로 시작을 막고 있는 멤버 닉네임 (서버 판정) */
  missingPresetNicknames?: string[];
  onSelectLoadout?: (loadout: LobbyLoadout) => void;
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
  onInviteToRun: _onInviteToRun,
  onLeave,
  onSendChat,
  chatSending = false,
  startLoading = false,
  error = null,
  myPresetId = null,
  myPresetFromLobby = false,
  myGender = null,
  // 기본 팩 — 리더가 최근 런의 시나리오를 갖고 있으면 호출부가 넘긴다
  scenarioId = "graymar_v1",
  missingPresetNicknames = [],
  onSelectLoadout,
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
  // 배경 미선택 멤버가 있으면 시작 불가 — 서버 canStart 와 같은 조건을 클라에도
  // 둬서, 눌렀다가 400 을 받는 대신 버튼이 아예 잠기고 이유가 보이게 한다.
  const canStart =
    isLeader &&
    allReady &&
    memberCount >= 2 &&
    missingPresetNicknames.length === 0 &&
    !startLoading;

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
      <div className="flex items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6">
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
        <div className="flex h-[320px] flex-col border-t border-[var(--border-primary)] bg-[var(--bg-card)] sm:h-[380px] lg:h-auto lg:w-[320px] lg:border-l lg:border-t-0 xl:w-[360px]">
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

      {/* ── 배경 선택 (로비 로드아웃) ── */}
      {onSelectLoadout && (
        <div className="border-t border-[var(--border-primary)] px-4 py-3 sm:px-6">
          <LobbyLoadoutPicker
            currentPresetId={myPresetId}
            fromLobby={myPresetFromLobby}
            currentGender={myGender}
            scenarioId={scenarioId}
            onSelect={onSelectLoadout}
          />
          {missingPresetNicknames.length > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-[var(--text-muted)]">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                배경을 고르지 않은 멤버가 있어 시작할 수 없습니다:{" "}
                <span className="text-[var(--text-secondary)]">
                  {missingPresetNicknames.join(", ")}
                </span>
              </span>
            </p>
          )}
        </div>
      )}

      {/* ── Error Banner (시작 실패 등) ── */}
      {error && (
        <div className="border-t border-[var(--hp-red)]/20 bg-[var(--hp-red)]/10 px-4 py-2 text-center text-xs text-[var(--hp-red)] sm:px-6">
          {error}
        </div>
      )}

      {/* ── Footer Buttons ── */}
      <div className="flex items-center justify-between border-t border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="flex items-center gap-1.5 rounded-md border border-[var(--border-primary)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--hp-red)]/30 hover:text-[var(--hp-red)]"
        >
          <LogOut size={16} />
          나가기
        </button>

        <div className="flex items-center gap-2">
          {/* Ready toggle (all members including leader) */}
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

          {/* Start button (leader only) */}
          {isLeader && (
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
              시작하기
            </button>
          )}
        </div>
      </div>

      {/* Leave Confirm Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60 py-4">
          <div
            className="m-auto mx-4 w-full max-w-sm rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6 shadow-xl"
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
