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
  /** 로비에서 직접 고른 값인가 (false = 최근 런에서 유추) */
  presetFromLobby: boolean;
  /** 로비에서 고른 시나리오 (리더 값이 런 생성에 쓰인다) */
  scenarioId: string | null;
}

export interface LobbyStateDTO {
  partyId: string;
  members: LobbyMemberState[];
  allReady: boolean;
  canStart: boolean;
  /** 배경 미선택으로 시작을 막고 있는 멤버 닉네임 */
  missingPresetNicknames: string[];
}

/** 로비 로드아웃 — 솔로 런 이력 없이 파티를 시작하기 위한 멤버별 선택 */
export interface LobbyLoadout {
  presetId: string;
  gender?: 'male' | 'female';
  scenarioId?: string | null;
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
