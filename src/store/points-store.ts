import { create } from 'zustand';
import { getPointsBalance, redeemPointCode } from '@/lib/api-client';
import { ApiError } from '@/lib/api-errors';

type ModalReason = 'redeem' | 'insufficient' | null;

interface PointsState {
  balance: number;
  chatCost: number;
  enabled: boolean;
  loaded: boolean;
  modalReason: ModalReason;
  /** 잔액 서버 동기화 */
  fetchBalance: () => Promise<void>;
  /** 낙관적 잔액 세팅 (턴 응답 등) */
  setBalance: (points: number) => void;
  openModal: (reason: Exclude<ModalReason, null>) => void;
  closeModal: () => void;
  /** 코드 충전 → 성공 시 잔액 갱신, 실패 시 한국어 메시지 throw */
  redeem: (code: string) => Promise<number>;
}

export const usePointsStore = create<PointsState>((set) => ({
  balance: 0,
  chatCost: 5,
  enabled: true,
  loaded: false,
  modalReason: null,

  fetchBalance: async () => {
    try {
      const res = await getPointsBalance();
      set({
        balance: res.points,
        chatCost: res.chatCost,
        enabled: res.enabled,
        loaded: true,
      });
    } catch {
      /* 비치명적 — 잔액 표시 실패는 게임 진행과 무관 */
    }
  },

  setBalance: (points) => set({ balance: points }),
  openModal: (reason) => set({ modalReason: reason }),
  closeModal: () => set({ modalReason: null }),

  redeem: async (code) => {
    try {
      const res = await redeemPointCode(code.trim());
      // 잔액만 갱신 — 모달은 열어둔 채로 성공 피드백을 노출한다(닫기는 모달이 담당).
      set({ balance: res.balance });
      return res.granted;
    } catch (err) {
      // 서버가 이미 한국어 메시지 반환 (존재하지 않는/만료된/소진된/이미 사용한 코드)
      if (err instanceof ApiError) throw new Error(err.message);
      throw new Error('충전에 실패했습니다.');
    }
  },
}));
