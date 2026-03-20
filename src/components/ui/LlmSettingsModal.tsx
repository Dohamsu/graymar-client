"use client";

import { useEffect, useState } from "react";
import { X, Check, Loader2, AlertCircle } from "lucide-react";
import {
  getLlmSettings,
  updateLlmSettings,
  getLlmUsage,
  type LlmSettingsResponse,
  type LlmUsageResponse,
} from "@/lib/api-client";
import {
  useSettingsStore,
  TEXT_SPEED_PRESETS,
  FONT_SIZE_PRESETS,
  type TextSpeedKey,
  type FontSizeKey,
} from "@/store/settings-store";
import { useGameStore } from "@/store/game-store";
import { calcTurnCostKRW, formatKRW } from "@/data/llm-pricing";

interface LlmSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const TEXT_SPEED_ORDER: TextSpeedKey[] = ["instant", "fast", "normal", "slow"];
const FONT_SIZE_ORDER: FontSizeKey[] = ["small", "normal", "large", "xlarge"];

/** 모델명 축약 (gpt-4o-2024-11-20 → gpt-4o) */
function shortModel(model: string | null): string {
  if (!model) return "?";
  // 날짜 접미사 제거
  return model.replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

export function LlmSettingsModal({ open, onClose }: LlmSettingsModalProps) {
  const [settings, setSettings] = useState<LlmSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Draft state for editing
  const [maxTokens, setMaxTokens] = useState(1024);

  // Text speed & font size (client-local, no server)
  const textSpeed = useSettingsStore((s) => s.textSpeed);
  const setTextSpeed = useSettingsStore((s) => s.setTextSpeed);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);

  // LLM usage
  const runId = useGameStore((s) => s.runId);
  const [usageData, setUsageData] = useState<LlmUsageResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    setUsageData(null);

    const promises: Promise<void>[] = [
      getLlmSettings()
        .then((data) => {
          setSettings(data);
          setMaxTokens(data.maxTokens);
        }),
    ];

    if (runId) {
      promises.push(
        getLlmUsage(runId)
          .then((data) => setUsageData(data))
          .catch(() => {}) // usage 실패는 무시
      );
    }

    Promise.all(promises)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [open, runId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const patch: Record<string, unknown> = { maxTokens };
      const updated = await updateLlmSettings(patch);
      setSettings(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  // Check if anything changed
  const hasChanges = settings && maxTokens !== settings.maxTokens;

  // 비용 계산
  const turnCosts = usageData?.turns.map((t) => ({
    ...t,
    cost: calcTurnCostKRW(t.model, t.prompt, t.cached, t.completion),
  }));
  const totalCost = turnCosts?.reduce((sum, t) => sum + t.cost, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-5 py-4">
          <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
            게임 설정
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2
                size={24}
                className="animate-spin text-[var(--text-muted)]"
              />
            </div>
          ) : (
            <>
              {/* Max Tokens */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    AI 출력 길이
                  </label>
                  <span className="text-xs font-mono text-[var(--gold)]">
                    {maxTokens}
                  </span>
                </div>
                <input
                  type="range"
                  min={256}
                  max={4096}
                  step={128}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full accent-[var(--gold)]"
                />
                <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>짧게</span>
                  <span>길게</span>
                </div>
              </div>

              {/* Text Speed */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">
                  대화 출력 속도
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TEXT_SPEED_ORDER.map((key) => {
                    const preset = TEXT_SPEED_PRESETS[key];
                    const selected = textSpeed === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setTextSpeed(key)}
                        className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                          selected
                            ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                            : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">
                  글자 크기
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {FONT_SIZE_ORDER.map((key) => {
                    const preset = FONT_SIZE_PRESETS[key];
                    const selected = fontSize === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setFontSize(key)}
                        className={`rounded-md border px-2 py-2 font-medium transition-colors ${
                          selected
                            ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                            : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                        }`}
                        style={{ fontSize: `${preset.ui}px` }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">
                  내러티브·선택지 텍스트에 적용됩니다
                </p>
              </div>

              {/* LLM 과금 현황 */}
              <div className="border-t border-[var(--border-primary)] pt-4">
                <label className="mb-3 block text-xs font-semibold text-[var(--text-secondary)]">
                  LLM 과금 현황
                </label>

                {!runId ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    진행 중인 게임이 없습니다
                  </p>
                ) : !usageData || usageData.turns.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    토큰 사용 기록이 없습니다
                  </p>
                ) : (
                  <>
                    {/* 턴별 테이블 */}
                    <div className="max-h-[200px] overflow-y-auto rounded border border-[var(--border-primary)]">
                      <table className="w-full text-[11px]">
                        <thead className="sticky top-0 bg-[var(--bg-secondary)]">
                          <tr className="text-[var(--text-muted)]">
                            <th className="px-2 py-1.5 text-left font-medium">턴</th>
                            <th className="px-2 py-1.5 text-left font-medium">모델</th>
                            <th className="px-2 py-1.5 text-right font-medium">비용</th>
                          </tr>
                        </thead>
                        <tbody>
                          {turnCosts!.map((t) => (
                            <tr
                              key={t.turnNo}
                              className="border-t border-[var(--border-primary)]/50 hover:bg-[var(--bg-secondary)]/50"
                              title={`입력: ${t.prompt.toLocaleString()} (캐시: ${t.cached.toLocaleString()}) | 출력: ${t.completion.toLocaleString()} | 지연: ${t.latencyMs}ms`}
                            >
                              <td className="px-2 py-1 font-mono text-[var(--text-secondary)]">
                                #{t.turnNo}
                              </td>
                              <td className="px-2 py-1 text-[var(--text-muted)]">
                                {shortModel(t.model)}
                              </td>
                              <td className="px-2 py-1 text-right font-mono text-[var(--gold)]">
                                {formatKRW(t.cost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 합계 */}
                    <div className="mt-3 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">
                          총 {usageData.totals.turns}턴
                        </span>
                        <span className="font-mono font-semibold text-[var(--gold)]">
                          {formatKRW(totalCost)}
                        </span>
                      </div>
                      <div className="flex gap-3 text-[var(--text-muted)]">
                        <span>
                          입력: {usageData.totals.prompt.toLocaleString()}
                        </span>
                        <span className={usageData.totals.cached > 0 ? "text-[var(--stamina-green)]" : ""}>
                          캐시: {usageData.totals.cached.toLocaleString()}
                        </span>
                        <span>
                          출력: {usageData.totals.completion.toLocaleString()}
                        </span>
                      </div>
                      {usageData.totals.turns > 0 && (
                        <div className="text-[var(--text-muted)]">
                          평균: {formatKRW(totalCost / usageData.totals.turns)}/턴
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-[var(--hp-red)]/10 px-3 py-2 text-xs text-[var(--hp-red)]">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-center gap-2 rounded-md bg-[var(--success-green)]/10 px-3 py-2 text-xs text-[var(--success-green)]">
                  <Check size={14} />
                  설정이 저장되었습니다.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-primary)] px-5 py-3">
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              닫기
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
                hasChanges
                  ? "bg-[var(--gold)] text-[var(--bg-primary)] hover:bg-[var(--gold)]/90"
                  : "cursor-not-allowed bg-[var(--border-primary)] text-[var(--text-muted)]"
              }`}
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              저장
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
