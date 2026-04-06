"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, ArrowLeft, Loader2 } from "lucide-react";
import { usePartyStore } from "@/store/party-store";
import { useAuthStore } from "@/store/auth-store";
import { PartyCreateModal } from "./PartyCreateModal";
import { PartyJoinModal } from "./PartyJoinModal";
import { PartyLobby } from "./PartyLobby";
import type { PartySearchResult as StoreSearchResult } from "@/types/party";

// PartyJoinModal uses its own internal type with leaderName
interface JoinModalSearchResult {
  id: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  leaderName: string;
  status: "WAITING" | "IN_GAME";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PartyMainScreenProps {
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Adapter: map store ChatMessage → PartyLobby ChatMessage
// ---------------------------------------------------------------------------

function adaptMessages(
  msgs: { id: string; type: "TEXT" | "SYSTEM" | "GAME_EVENT"; senderNickname: string | null; senderId: string | null; content: string; createdAt: string }[],
) {
  return msgs.map((m) => ({
    id: m.id,
    type: m.type,
    senderNickname: m.senderNickname ?? undefined,
    senderId: m.senderId ?? undefined,
    text: m.content,
    timestamp: new Date(m.createdAt).getTime(),
  }));
}

// ---------------------------------------------------------------------------
// Adapter: map store PartyMember → PartyLobby PartyMember
// ---------------------------------------------------------------------------

function adaptMembers(
  members: { id: string; userId: string; nickname: string; role: "LEADER" | "MEMBER"; isOnline: boolean; joinedAt: string; presetId?: string; hp?: number; maxHp?: number }[],
) {
  return members.map((m) => ({
    userId: m.userId,
    nickname: m.nickname,
    presetId: m.presetId ?? "DOCKWORKER",
    presetLabel: m.presetId ?? "",
    level: 1,
    hp: m.hp ?? 0,
    maxHp: m.maxHp ?? 0,
    portraitUrl: null,
    isLeader: m.role === "LEADER",
    isReady: true, // Phase 2: ready system
    isOnline: m.isOnline,
  }));
}

// ---------------------------------------------------------------------------
// PartyMainScreen
// ---------------------------------------------------------------------------

export function PartyMainScreen({ onBack }: PartyMainScreenProps) {
  const party = usePartyStore((s) => s.party);
  const members = usePartyStore((s) => s.members);
  const messages = usePartyStore((s) => s.messages);
  const isLoading = usePartyStore((s) => s.isLoading);
  const error = usePartyStore((s) => s.error);
  const fetchMyParty = usePartyStore((s) => s.fetchMyParty);
  const createParty = usePartyStore((s) => s.createParty);
  const joinParty = usePartyStore((s) => s.joinParty);
  const leaveParty = usePartyStore((s) => s.leaveParty);
  const sendMessage = usePartyStore((s) => s.sendMessage);
  const searchParties = usePartyStore((s) => s.searchParties);
  const clearError = usePartyStore((s) => s.clearError);
  const disconnectStream = usePartyStore((s) => s.disconnectStream);

  const currentUserId = useAuthStore((s) => s.user?.id ?? "");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [searchResults, setSearchResults] = useState<JoinModalSearchResult[]>([]);

  // Fetch party on mount
  useEffect(() => {
    fetchMyParty();
  }, [fetchMyParty]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      disconnectStream();
    };
  }, [disconnectStream]);

  // ── Handlers ──

  const handleCreateParty = useCallback(
    async (name: string) => {
      await createParty(name);
      // If no error, close modal (party will be set in store)
      const currentError = usePartyStore.getState().error;
      if (!currentError) setShowCreateModal(false);
    },
    [createParty],
  );

  const handleJoinByCode = useCallback(
    async (code: string) => {
      await joinParty(code);
      const currentError = usePartyStore.getState().error;
      if (!currentError) setShowJoinModal(false);
    },
    [joinParty],
  );

  const handleJoinBySearch = useCallback(
    async (partyId: string) => {
      // Search results use party ID — for now, treat as invite code
      // The actual API might accept partyId directly; adapt as needed
      await joinParty(partyId);
      const currentError = usePartyStore.getState().error;
      if (!currentError) setShowJoinModal(false);
    },
    [joinParty],
  );

  const handleSearch = useCallback(
    async (query: string) => {
      const results = await searchParties(query);
      // Adapt store type → JoinModal type
      setSearchResults(
        results.map((r: StoreSearchResult) => ({
          id: r.id,
          name: r.name,
          memberCount: r.memberCount,
          maxMembers: r.maxMembers,
          leaderName: "",
          status: r.status === "OPEN" ? ("WAITING" as const) : ("IN_GAME" as const),
        })),
      );
    },
    [searchParties],
  );

  const handleLeave = useCallback(async () => {
    await leaveParty();
  }, [leaveParty]);

  const handleSendChat = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  const handleBack = useCallback(() => {
    clearError();
    onBack();
  }, [clearError, onBack]);

  // ── Loading state ──

  if (isLoading && !party) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--bg-primary)]">
        <Loader2 size={32} className="animate-spin text-[var(--gold)]" />
        <span className="text-sm text-[var(--text-muted)]">파티 정보를 불러오는 중...</span>
      </div>
    );
  }

  // ── Party Lobby (joined) ──

  if (party) {
    const isLeader = party.leaderId === currentUserId;
    const adaptedMembers = adaptMembers(members);
    const adaptedMessages = adaptMessages(messages);

    return (
      <div className="flex h-full flex-col bg-[var(--bg-primary)]">
        <PartyLobby
          partyName={party.name}
          inviteCode={party.inviteCode}
          members={adaptedMembers}
          maxMembers={party.maxMembers}
          chatMessages={adaptedMessages}
          currentUserId={currentUserId}
          isLeader={isLeader}
          isReady={true}
          onToggleReady={() => {/* Phase 2 */}}
          onStartDungeon={() => {/* Phase 2 */}}
          onLeave={handleLeave}
          onSendChat={handleSendChat}
        />

        {/* Modals */}
        <PartyCreateModal
          open={showCreateModal}
          onClose={() => { setShowCreateModal(false); clearError(); }}
          onSubmit={handleCreateParty}
          loading={isLoading}
          error={error}
        />
        <PartyJoinModal
          open={showJoinModal}
          onClose={() => { setShowJoinModal(false); clearError(); }}
          onJoinByCode={handleJoinByCode}
          onJoinBySearch={handleJoinBySearch}
          searchResults={searchResults}
          onSearch={handleSearch}
          loading={isLoading}
          error={error}
        />
      </div>
    );
  }

  // ── No Party (create / join) ──

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-[var(--bg-primary)] px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--gold)]/40 bg-[var(--gold)]/5">
          <Users size={28} className="text-[var(--gold)]" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-[var(--text-primary)]">
          파티
        </h1>
        <p className="max-w-xs text-center text-sm text-[var(--text-muted)]">
          동료와 함께 그레이마르의 음모에 맞서세요.
        </p>
      </div>

      {error && (
        <div className="w-full max-w-xs rounded-md bg-[var(--hp-red)]/10 px-4 py-2.5 text-center text-xs text-[var(--hp-red)]">
          {error}
        </div>
      )}

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={() => { clearError(); setShowCreateModal(true); }}
          className="flex h-14 w-full items-center justify-center gap-2 border border-[var(--gold)] bg-[var(--gold)] font-display text-lg tracking-wide text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)]"
        >
          <Users size={18} />
          파티 만들기
        </button>

        <button
          onClick={() => { clearError(); setShowJoinModal(true); }}
          className="flex h-14 w-full items-center justify-center gap-2 border border-[var(--gold)] bg-transparent font-display text-lg tracking-wide text-[var(--gold)] transition-all hover:bg-[var(--gold)] hover:text-[var(--bg-primary)]"
        >
          <UserPlus size={18} />
          파티 참가하기
        </button>

        <button
          onClick={handleBack}
          className="mt-2 flex items-center justify-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
        >
          <ArrowLeft size={14} />
          솔로 플레이로 돌아가기
        </button>
      </div>

      {/* Modals */}
      <PartyCreateModal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); clearError(); }}
        onSubmit={handleCreateParty}
        loading={isLoading}
        error={error}
      />
      <PartyJoinModal
        open={showJoinModal}
        onClose={() => { setShowJoinModal(false); clearError(); }}
        onJoinByCode={handleJoinByCode}
        onJoinBySearch={handleJoinBySearch}
        searchResults={searchResults}
        onSearch={handleSearch}
        loading={isLoading}
        error={error}
      />
    </div>
  );
}
