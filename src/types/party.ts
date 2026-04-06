// ---------------------------------------------------------------------------
// Party — shared types
// ---------------------------------------------------------------------------

export interface PartyInfo {
  id: string;
  name: string;
  leaderId: string;
  status: 'OPEN' | 'FULL' | 'IN_DUNGEON' | 'DISBANDED';
  maxMembers: number;
  inviteCode: string;
  createdAt: string;
}

export interface PartyMember {
  id: string;
  userId: string;
  nickname: string;
  role: 'LEADER' | 'MEMBER';
  isOnline: boolean;
  joinedAt: string;
  /** Game state (from the active run) */
  presetId?: string;
  hp?: number;
  maxHp?: number;
  currentLocation?: string;
}

export interface ChatMessage {
  id: string;
  partyId: string;
  senderId: string | null;
  senderNickname: string | null;
  type: 'TEXT' | 'SYSTEM' | 'GAME_EVENT';
  content: string;
  createdAt: string;
}

export interface PartySearchResult {
  id: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  status: string;
}
