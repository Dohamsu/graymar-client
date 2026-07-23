"use client";

import { useState } from "react";
import { Gem, X } from "lucide-react";
import { usePointsStore } from "@/store/points-store";

/**
 * 포인트 충전 모달 — 코드 입력. arch/85 §6
 * modalReason='insufficient' 면 잔액 부족 안내를 함께 노출.
 */
export function PointsModal() {
  const modalReason = usePointsStore((s) => s.modalReason);
  const balance = usePointsStore((s) => s.balance);
  const closeModal = usePointsStore((s) => s.closeModal);
  const redeem = usePointsStore((s) => s.redeem);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (!modalReason) return null;

  const onRedeem = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const granted = await redeem(code);
      setOk(`${granted}P 충전 완료!`);
      setCode("");
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

        {modalReason === "insufficient" && (
          <p className="mb-3 rounded border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-2 text-sm text-[var(--gold)]">
            포인트가 부족합니다. 채팅 1회에 포인트가 필요해요. 코드를 입력해
            충전하세요.
          </p>
        )}

        <p className="mb-3 text-sm text-[var(--text-muted)]">
          현재 잔액{" "}
          <span className="font-semibold text-[var(--gold)]">{balance}P</span>
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && onRedeem()}
          placeholder="코드 입력 (예: ABCD-2345)"
          autoFocus
          className="mb-3 w-full rounded border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 py-2 font-mono text-sm tracking-wider text-[var(--text-primary)] outline-none focus:border-[var(--gold)]"
        />

        {error && <p className="mb-3 text-sm text-[var(--color-danger,#e05a5a)]">{error}</p>}
        {ok && <p className="mb-3 text-sm text-[var(--gold)]">{ok}</p>}

        <button
          onClick={onRedeem}
          disabled={busy || !code.trim()}
          className="w-full rounded bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "충전 중…" : "충전하기"}
        </button>
      </div>
    </div>
  );
}
