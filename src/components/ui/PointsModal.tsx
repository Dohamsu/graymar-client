"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Gem, X } from "lucide-react";
import { usePointsStore } from "@/store/points-store";

/**
 * 포인트 충전 모달 — 코드 입력. arch/85 §6
 * modalReason='insufficient' 면 잔액 부족 안내를 함께 노출.
 */
export function PointsModal() {
  const modalReason = usePointsStore((s) => s.modalReason);
  const balance = usePointsStore((s) => s.balance);
  const closeModal = usePointsStore((s) => s.closeModal);
  const chatCost = usePointsStore((s) => s.chatCost);
  const redeem = usePointsStore((s) => s.redeem);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  if (!modalReason) return null;

  const onRedeem = async () => {
    if (!code.trim() || busy || granted !== null) return;
    setBusy(true);
    setError(null);
    try {
      const g = await redeem(code);
      setGranted(g);
      setCode("");
      // 성공 화면을 잠시 보여준 뒤 자동으로 닫는다.
      closeTimer.current = setTimeout(() => closeModal(), 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "충전에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => e.key === "Escape" && closeModal()}
    >
      <div className="w-full max-w-sm rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gem size={18} className="text-[var(--gold)]" />
            <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
              포인트 충전
            </h2>
          </div>
          <button
            onClick={closeModal}
            aria-label="닫기"
            className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        {granted !== null ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)]">
              <Check size={26} strokeWidth={3} />
            </div>
            <p className="text-base font-bold text-[var(--text-primary)]">
              <span className="text-[var(--gold)]">{granted}P</span> 충전
              완료!
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              현재 잔액{" "}
              <span className="font-semibold text-[var(--gold)]">
                {balance}P
              </span>
            </p>
            <button
              onClick={closeModal}
              className="mt-5 w-full rounded bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
            >
              확인
            </button>
          </div>
        ) : (
          <>
            {modalReason === "insufficient" && (
              <p className="mb-3 rounded border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-2 text-sm text-[var(--gold)]">
                포인트가 부족합니다. 채팅 1회에 포인트가 필요해요. 코드를 입력해
                충전하세요.
              </p>
            )}

            <div className="mb-3 flex items-center justify-between text-sm text-[var(--text-muted)]">
              <span>
                현재 잔액{" "}
                <span className="font-semibold text-[var(--gold)]">
                  {balance}P
                </span>
              </span>
              <span>
                채팅 1회 ={" "}
                <span className="font-semibold text-[var(--gold)]">
                  {chatCost}P
                </span>
              </span>
            </div>

            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && onRedeem()}
              placeholder="코드 입력 (예: ABCD-2345)"
              autoFocus
              className="mb-3 w-full rounded border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 py-2 font-mono text-sm tracking-wider text-[var(--text-primary)] outline-none focus:border-[var(--gold)]"
            />

            {error && (
              <p className="mb-3 text-sm text-[var(--color-danger,#e05a5a)]">
                {error}
              </p>
            )}

            <button
              onClick={onRedeem}
              disabled={busy || !code.trim()}
              className="w-full rounded bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "충전 중…" : "충전하기"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
