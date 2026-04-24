import { create } from 'zustand';
import { useAuthStore } from '@/store/auth-store';
import * as api from '@/lib/api-client';
import * as sse from '@/lib/sse-client';
import type {
  PartyInfo,
  PartyMember,
  ChatMessage,
  PartySearchResult,
  LobbyStateDTO,
  PartyVoteDTO,
  TurnWaitingStatus,
} from '@/types/party';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of chat messages kept in memory. */
const MAX_MESSAGES = 200;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PartyState {
  // State
  party: PartyInfo | null;
  members: PartyMember[];
  messages: ChatMessage[];
  isConnected: boolean;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Phase 2 State
  lobbyState: LobbyStateDTO | null;
  currentVote: PartyVoteDTO | null;
  turnStatus: TurnWaitingStatus | null;
  partyRunId: string | null;
  dungeonCountdown: number | null;

  // REST actions
  createParty: (name: string) => Promise<void>;
  joinParty: (inviteCode: string) => Promise<void>;
  leaveParty: () => Promise<void>;
  kickMember: (userId: string) => Promise<void>;
  disbandParty: () => Promise<void>;
  fetchMyParty: () => Promise<void>;
  searchParties: (query: string) => Promise<PartySearchResult[]>;
  sendMessage: (content: string) => Promise<void>;
  fetchMessages: (cursor?: string) => Promise<void>;

  // Phase 2 REST actions
  toggleReady: (ready: boolean) => Promise<void>;
  startDungeon: () => Promise<void>;
  inviteToRun: () => Promise<void>;
  submitPartyAction: (rawInput: string, inputType?: 'ACTION' | 'CHOICE') => Promise<void>;
  proposeMove: (locationId: string) => Promise<void>;
  castVote: (voteId: string, choice: 'yes' | 'no') => Promise<void>;
  fetchLobbyState: () => Promise<void>;

  // SSE connection
  connectStream: () => void;
  disconnectStream: () => void;

  // Internal handlers (called by SSE events)
  _handleNewMessage: (msg: ChatMessage) => void;
  _handleMemberJoined: (data: { userId: string; nickname: string }) => void;
  _handleMemberLeft: (data: { userId: string; nickname: string }) => void;
  _handleDisbanded: () => void;
  _handleMemberStatus: (members: PartyMember[]) => void;

  // Utilities
  clearError: () => void;
  resetParty: () => void;
  markRead: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePartyStore = create<PartyState>((set, get) => ({
  party: null,
  members: [],
  messages: [],
  isConnected: false,
  unreadCount: 0,
  isLoading: false,
  error: null,

  // Phase 2 State
  lobbyState: null,
  currentVote: null,
  turnStatus: null,
  partyRunId: null,
  dungeonCountdown: null,

  // -----------------------------------------------------------------------
  // REST actions
  // -----------------------------------------------------------------------

  createParty: async (name) => {
    set({ isLoading: true, error: null });
    try {
      const { party, members } = await api.createParty(name);
      set({ party, members, isLoading: false });
      get().connectStream();
    } catch (e) {
      set({ isLoading: false, error: extractMsg(e, '파티 생성에 실패했습니다.') });
    }
  },

  joinParty: async (inviteCode) => {
    set({ isLoading: true, error: null });
    try {
      const { party, members } = await api.joinParty(inviteCode);
      set({ party, members, isLoading: false });
      get().connectStream();
    } catch (e) {
      set({ isLoading: false, error: extractMsg(e, '파티 참가에 실패했습니다.') });
    }
  },

  leaveParty: async () => {
    const { party } = get();
    if (!party) return;
    set({ isLoading: true, error: null });
    try {
      await api.leaveParty(party.id);
      get().disconnectStream();
      get().resetParty();
    } catch (e) {
      set({ isLoading: false, error: extractMsg(e, '파티 탈퇴에 실패했습니다.') });
    }
  },

  kickMember: async (userId) => {
    const { party } = get();
    if (!party) return;
    try {
      await api.kickMember(party.id, userId);
      // The SSE member_left event will update the members list
    } catch (e) {
      set({ error: extractMsg(e, '멤버 추방에 실패했습니다.') });
    }
  },

  disbandParty: async () => {
    const { party } = get();
    if (!party) return;
    set({ isLoading: true, error: null });
    try {
      await api.disbandParty(party.id);
      get().disconnectStream();
      get().resetParty();
    } catch (e) {
      set({ isLoading: false, error: extractMsg(e, '파티 해산에 실패했습니다.') });
    }
  },

  fetchMyParty: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.getMyParty();
      if (result) {
        set({ party: result.party, members: result.members, isLoading: false });
        get().connectStream();
      } else {
        set({ party: null, members: [], isLoading: false });
      }
    } catch (e) {
      set({ isLoading: false, error: extractMsg(e, '파티 조회에 실패했습니다.') });
    }
  },

  searchParties: async (query) => {
    try {
      const result = await api.searchParties(query);
      return result.items ?? [];
    } catch {
      return [];
    }
  },

  sendMessage: async (content) => {
    const { party } = get();
    if (!party) return;
    try {
      await api.sendChatMessage(party.id, content);
      // The SSE chat:new_message event will append the message
    } catch (e) {
      set({ error: extractMsg(e, '메시지 전송에 실패했습니다.') });
    }
  },

  fetchMessages: async (cursor) => {
    const { party } = get();
    if (!party) return;
    try {
      const { messages: fetched } = await api.getChatMessages(
        party.id,
        cursor,
        50,
      );
      set((s) => ({
        messages: cursor
          ? [...fetched, ...s.messages].slice(-MAX_MESSAGES)
          : fetched.slice(-MAX_MESSAGES),
      }));
    } catch {
      // Silently ignore — chat history is non-critical
    }
  },

  // -----------------------------------------------------------------------
  // Phase 2 REST actions
  // -----------------------------------------------------------------------

  toggleReady: async (ready) => {
    const { party } = get();
    if (!party) return;
    try {
      const state = await api.toggleReady(party.id, ready);
      set({ lobbyState: state });
    } catch (e) {
      set({ error: extractMsg(e, '준비 상태 변경에 실패했습니다.') });
    }
  },

  startDungeon: async () => {
    const { party } = get();
    if (!party) return;
    set({ isLoading: true, error: null });
    try {
      const result = await api.startDungeon(party.id);
      set({ partyRunId: result.runId, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: extractMsg(e, '던전 시작에 실패했습니다.') });
    }
  },

  inviteToRun: async () => {
    const { party } = get();
    if (!party) return;
    set({ isLoading: true, error: null });
    try {
      const result = await api.inviteToRun(party.id);
      set({ partyRunId: result.runId, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: extractMsg(e, '내 세계에 초대에 실패했습니다.') });
    }
  },

  submitPartyAction: async (rawInput, inputType = 'ACTION') => {
    const { party, partyRunId } = get();
    if (!party || !partyRunId) return;
    try {
      const idempotencyKey = `${partyRunId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await api.submitPartyAction(
        party.id,
        partyRunId,
        inputType,
        rawInput,
        idempotencyKey,
      );
    } catch (e) {
      set({ error: extractMsg(e, '행동 제출에 실패했습니다.') });
    }
  },

  proposeMove: async (locationId) => {
    const { party } = get();
    if (!party) return;
    try {
      const vote = await api.createVote(party.id, locationId);
      set({ currentVote: vote });
    } catch (e) {
      set({ error: extractMsg(e, '투표 제안에 실패했습니다.') });
    }
  },

  castVote: async (voteId, choice) => {
    const { party } = get();
    if (!party) return;
    try {
      await api.castVote(party.id, voteId, choice);
    } catch (e) {
      set({ error: extractMsg(e, '투표에 실패했습니다.') });
    }
  },

  fetchLobbyState: async () => {
    const { party } = get();
    if (!party) return;
    try {
      const state = await api.getLobbyState(party.id);
      set({ lobbyState: state });
    } catch {
      // non-critical
    }
  },

  // -----------------------------------------------------------------------
  // SSE connection
  // -----------------------------------------------------------------------

  connectStream: () => {
    const { party, isConnected } = get();
    if (!party || isConnected) return;

    const token = useAuthStore.getState().token;
    if (!token) return;

    // Register SSE event handlers
    sse.onEvent('chat:new_message', (data) => {
      get()._handleNewMessage(data as ChatMessage);
    });
    sse.onEvent('party:member_joined', (data) => {
      get()._handleMemberJoined(
        data as { userId: string; nickname: string },
      );
    });
    sse.onEvent('party:member_left', (data) => {
      get()._handleMemberLeft(
        data as { userId: string; nickname: string },
      );
    });
    sse.onEvent('party:disbanded', () => {
      get()._handleDisbanded();
    });
    sse.onEvent('party:member_status', (data) => {
      get()._handleMemberStatus(data as PartyMember[]);
    });

    sse.onEvent('party:member_left_dungeon', (data) => {
      const d = data as { userId: string; nickname: string };
      // 던전 이탈한 멤버를 목록에서 AI 표시 (제거하지 않음)
      set((s) => ({
        members: s.members.map((m) =>
          m.userId === d.userId ? { ...m, isOnline: false } : m,
        ),
      }));
    });
    sse.onEvent('party:member_ai_controlled', (data) => {
      const d = data as { userId: string };
      set((s) => ({
        members: s.members.map((m) =>
          m.userId === d.userId ? { ...m, isOnline: false } : m,
        ),
      }));
    });
    sse.onEvent('party:error', (data) => {
      const d = data as { code: string; message: string };
      set({ error: d.message });
    });
    sse.onEvent('party:member_hp_update', (data) => {
      const d = data as {
        members: { userId: string; nickname: string; hp: number; maxHp: number }[];
      };
      set((s) => ({
        members: s.members.map((m) => {
          const update = d.members.find((u) => u.userId === m.userId);
          return update ? { ...m, hp: update.hp, maxHp: update.maxHp } : m;
        }),
      }));
    });
    sse.onEvent('party:leader_changed', (data) => {
      const d = data as { newLeaderId: string };
      set((s) =>
        s.party ? { party: { ...s.party, leaderId: d.newLeaderId } } : s,
      );
    });

    // Phase 2 SSE events
    sse.onEvent('lobby:state_updated', (data) => {
      set({ lobbyState: data as LobbyStateDTO });
    });
    sse.onEvent('lobby:dungeon_starting', (data) => {
      const d = data as { runId: string; countdown: number };
      set({ partyRunId: d.runId, dungeonCountdown: d.countdown });
      // 카운트다운 후 자동 전환 (dungeonCountdown → 0)
      let remaining = d.countdown;
      const countdownInterval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          set({ dungeonCountdown: 0 });
        } else {
          set({ dungeonCountdown: remaining });
        }
      }, 1000);
    });
    sse.onEvent('dungeon:action_received', () => {
      // UI will reflect via dungeon:waiting
    });
    sse.onEvent('dungeon:waiting', (data) => {
      set({ turnStatus: data as TurnWaitingStatus });
    });
    sse.onEvent('dungeon:timeout_warning', (data) => {
      const d = data as { secondsLeft: number };
      set((s) =>
        s.turnStatus
          ? {
              turnStatus: {
                ...s.turnStatus,
                deadline: new Date(
                  Date.now() + d.secondsLeft * 1000,
                ).toISOString(),
              },
            }
          : s,
      );
    });
    sse.onEvent('dungeon:turn_resolved', (data) => {
      set({ turnStatus: null });
      // 런 종료 체크
      const d = data as Record<string, unknown>;
      const sr = d.serverResult as Record<string, unknown> | undefined;
      if (sr?.nodeOutcome === 'RUN_ENDED') {
        // 던전 종료 → 파티 상태 리셋 + 파티 정보 재조회
        set({ partyRunId: null, dungeonCountdown: null });
        get().fetchMyParty();
      }
    });
    sse.onEvent('dungeon:loot_distributed', () => {
      // LootDistribution 모달 표시용 — 추후 UI 연동
    });
    sse.onEvent('dungeon:gold_distributed', () => {
      // 골드 분배 알림 — 추후 UI 연동
    });
    sse.onEvent('dungeon:location_changed', () => {
      // 게임 스토어가 자동으로 런 상태를 폴링하여 새 장소 반영
    });
    sse.onEvent('vote:proposed', (data) => {
      set({ currentVote: data as PartyVoteDTO });
    });
    sse.onEvent('vote:updated', (data) => {
      const d = data as Partial<PartyVoteDTO>;
      set((s) =>
        s.currentVote ? { currentVote: { ...s.currentVote, ...d } } : s,
      );
    });
    sse.onEvent('vote:resolved', () => {
      set({ currentVote: null });
    });

    sse.onConnect(() => {
      set({ isConnected: true });
    });
    sse.onDisconnect(() => {
      set({ isConnected: false });
    });

    sse.connectPartyStream(party.id, token);
  },

  disconnectStream: () => {
    sse.offEvent('chat:new_message');
    sse.offEvent('party:member_joined');
    sse.offEvent('party:member_left');
    sse.offEvent('party:disbanded');
    sse.offEvent('party:member_status');
    sse.offEvent('party:member_left_dungeon');
    sse.offEvent('party:member_ai_controlled');
    sse.offEvent('party:error');
    sse.offEvent('party:member_hp_update');
    sse.offEvent('party:leader_changed');
    // Phase 2 events
    sse.offEvent('lobby:state_updated');
    sse.offEvent('lobby:dungeon_starting');
    sse.offEvent('dungeon:action_received');
    sse.offEvent('dungeon:waiting');
    sse.offEvent('dungeon:timeout_warning');
    sse.offEvent('dungeon:turn_resolved');
    sse.offEvent('dungeon:loot_distributed');
    sse.offEvent('dungeon:gold_distributed');
    sse.offEvent('dungeon:location_changed');
    sse.offEvent('vote:proposed');
    sse.offEvent('vote:updated');
    sse.offEvent('vote:resolved');
    sse.disconnectPartyStream();
    set({ isConnected: false });
  },

  // -----------------------------------------------------------------------
  // Internal SSE handlers
  // -----------------------------------------------------------------------

  _handleNewMessage: (msg) => {
    set((s) => ({
      messages: [...s.messages, msg].slice(-MAX_MESSAGES),
      unreadCount: s.unreadCount + 1,
    }));
  },

  _handleMemberJoined: (data) => {
    set((s) => {
      // Avoid duplicates
      if (s.members.some((m) => m.userId === data.userId)) return s;
      const newMember: PartyMember = {
        id: data.userId,
        userId: data.userId,
        nickname: data.nickname,
        role: 'MEMBER',
        isOnline: true,
        joinedAt: new Date().toISOString(),
      };
      return { members: [...s.members, newMember] };
    });
  },

  _handleMemberLeft: (data) => {
    set((s) => ({
      members: s.members.filter((m) => m.userId !== data.userId),
    }));
  },

  _handleDisbanded: () => {
    get().disconnectStream();
    get().resetParty();
  },

  _handleMemberStatus: (data) => {
    // 서버가 { userId, isOnline } 단일 객체를 보냄 — 멤버 목록 교체가 아닌 업데이트
    const d = data as unknown as { userId: string; isOnline: boolean };
    if (d.userId) {
      set((s) => ({
        members: s.members.map((m) =>
          m.userId === d.userId ? { ...m, isOnline: d.isOnline } : m,
        ),
      }));
    }
  },

  // -----------------------------------------------------------------------
  // Utilities
  // -----------------------------------------------------------------------

  clearError: () => {
    set({ error: null });
  },

  resetParty: () => {
    set({
      party: null,
      members: [],
      messages: [],
      isConnected: false,
      unreadCount: 0,
      isLoading: false,
      error: null,
      lobbyState: null,
      currentVote: null,
      turnStatus: null,
      partyRunId: null,
      dungeonCountdown: null,
    });
  },

  markRead: () => {
    set({ unreadCount: 0 });
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractMsg(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message || fallback;
  return fallback;
}
