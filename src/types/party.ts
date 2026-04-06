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

// ── Phase 2 Types ──

export interface LobbyMemberState {
  userId: string;
  nickname: string;
  presetId: string | null;
  gender: string | null;
  isReady: boolean;
  isOnline: boolean;
}

export interface LobbyStateDTO {
  partyId: string;
  members: LobbyMemberState[];
  allReady: boolean;
  canStart: boolean;
}

export interface PartyVoteDTO {
  id: string;
  partyId: string;
  proposerId: string;
  proposerNickname: string;
  voteType: string;
  targetLocationId?: string;
  targetLocationName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  yesVotes: number;
  noVotes: number;
  totalMembers: number;
  expiresAt: string;
}

export interface TurnWaitingStatus {
  turnNo: number;
  submitted: string[];
  pending: string[];
  deadline: string;
}

export interface DungeonStartResult {
  partyId: string;
  runId: string;
  memberUserIds: string[];
}
