import { create } from 'zustand';
import { useAuthStore } from '@/store/auth-store';
import * as api from '@/lib/api-client';
import * as sse from '@/lib/sse-client';
import type {
  PartyInfo,
  PartyMember,
  ChatMessage,
  PartySearchResult,
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
      return await api.searchParties(query);
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

  _handleMemberStatus: (members) => {
    set({ members });
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
