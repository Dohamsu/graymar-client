"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Paperclip, CheckCircle, Loader2 } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { submitBugReport } from "@/lib/api-client";
import type { StoryMessage } from "@/types/game";

const CATEGORIES = [
  { id: "narrative", label: "서술이 이상해요" },
  { id: "choices", label: "선택지가 맞지 않아요" },
  { id: "npc", label: "NPC 반응이 어색해요" },
  { id: "judgment", label: "판정 결과가 이상해요" },
  { id: "ui", label: "화면/UI 오류" },
  { id: "other", label: "기타" },
] as const;

type Category = (typeof CATEGORIES)[number]["id"];

interface BugReportModalProps {
  onClose: () => void;
}

/** 메시지 상세 직렬화 (A) — 렌더 플래그/NPC/선택지/판정 포함 */
function serializeMessage(msg: StoryMessage): Record<string, unknown> {
  return {
    id: msg.id,
    type: msg.type,
    text: msg.text,
    tags: msg.tags,
    loading: msg.loading,
    typed: msg.typed,
    selectedChoiceId: msg.selectedChoiceId,
    resolveOutcome: msg.resolveOutcome,
    resolveBreakdown: msg.resolveBreakdown,
    speakingNpc: msg.speakingNpc
      ? { npcId: msg.speakingNpc.npcId, displayName: msg.speakingNpc.displayName }
      : undefined,
    npcPortrait: msg.npcPortrait
      ? {
          npcId: msg.npcPortrait.npcId,
          npcName: msg.npcPortrait.npcName,
          isNewlyIntroduced: msg.npcPortrait.isNewlyIntroduced,
        }
      : undefined,
    choices: msg.choices?.map((c) => ({
      id: c.id,
      label: c.label,
      affordance: c.affordance,
      modifier: c.modifier,
      disabled: c.disabled,
    })),
    locationImage: msg.locationImage,
  };
}

function collectRecentTurns(maxTurns = 5) {
  const state = useGameStore.getState();
  const messages = state.messages;
  const currentTurnNo = state.currentTurnNo;
  const nodeType = state.currentNodeType;

  const turns: Array<{
    turnNo: number;
    nodeType: string | null;
    messages: Array<Record<string, unknown>>;
  }> = [];

  // Group messages into pseudo-turns by PLAYER messages
  let currentGroup: Array<Record<string, unknown>> = [];
  let turnCounter = currentTurnNo;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    currentGroup.unshift(serializeMessage(msg));

    if (msg.type === "PLAYER" || msg.type === "SYSTEM") {
      turns.unshift({
        turnNo: turnCounter--,
        nodeType,
        messages: currentGroup,
      });
      currentGroup = [];
      if (turns.length >= maxTurns) break;
    }
  }

  if (currentGroup.length > 0 && turns.length < maxTurns) {
    turns.unshift({
      turnNo: turnCounter,
      nodeType,
      messages: currentGroup,
    });
  }

  return turns.slice(-maxTurns);
}

/** 클라이언트 스냅샷 (B) — 현재 게임/스트리밍/HUD/위치 상태 */
function collectClientSnapshot(): Record<string, unknown> {
  const s = useGameStore.getState();
  const lastMessages = s.messages.slice(-10).map((m) => ({
    id: m.id,
    type: m.type,
    loading: m.loading,
    typed: m.typed,
    hasSpeakingNpc: !!m.speakingNpc,
    hasPortrait: !!m.npcPortrait,
    textLen: m.text?.length ?? 0,
  }));

  return {
    runId: s.runId,
    phase: s.phase,
    currentNodeType: s.currentNodeType,
    currentNodeIndex: s.currentNodeIndex,
    currentTurnNo: s.currentTurnNo,
    locationName: s.locationName,
    currentLocationId: s.worldState?.currentLocationId ?? null,
    hubHeat: s.worldState?.hubHeat ?? null,
    hubSafety: s.worldState?.hubSafety ?? null,
    timePhase: s.worldState?.timePhase ?? null,
    day: s.worldState?.day ?? null,
    hud: s.hud,
    equippedCount: Object.keys(s.characterInfo?.equipment ?? []).length,
    inventoryCount: s.inventory.length,
    equipmentBagCount: s.equipmentBag.length,
    isSubmitting: s.isSubmitting,
    isStreaming: s.isStreaming,
    isNarrating: s.isNarrating,
    choicesLoading: s.choicesLoading,
    streamBufferLength: s.streamTextBuffer.length,
    streamBufferDone: s.streamBufferDone,
    streamDoneNarrativeLength: s.streamDoneNarrative?.length ?? 0,
    streamSegmentsCount: s.streamSegments.length,
    activeChoiceCount: s.choices.length,
    pendingMessagesCount: s.pendingMessages.length,
    pendingChoicesCount: s.pendingChoices.length,
    messagesCount: s.messages.length,
    lastMessages,
    characterInfo: s.characterInfo
      ? { name: s.characterInfo.name, class: s.characterInfo.class, level: s.characterInfo.level }
      : null,
    llmStats: s.llmStats
      ? {
          model: s.llmStats.model,
          prompt: s.llmStats.prompt,
          cached: s.llmStats.cached,
          completion: s.llmStats.completion,
          latencyMs: s.llmStats.latencyMs,
        }
      : null,
    llmFailure: s.llmFailure,
    error: s.error,
  };
}

/** DOM 요약 (F) — 실제 렌더된 메시지/선택지 스캔 */
function collectDomSummary(): Record<string, unknown> {
  if (typeof document === "undefined") return {};
  const choiceButtons = document.querySelectorAll(".choice-btn");
  return {
    renderedChoiceButtonCount: choiceButtons.length,
    renderedDialogueBubbleCount: document.querySelectorAll("[data-dialogue-bubble]").length,
    scrollY: typeof window !== "undefined" ? window.scrollY : null,
    docScrollHeight: document.documentElement.scrollHeight,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : null,
    viewportWidth: typeof window !== "undefined" ? window.innerWidth : null,
  };
}

export function BugReportModal({ onClose }: BugReportModalProps) {
  const runId = useGameStore((s) => s.runId);
  const [selected, setSelected] = useState<Category | null>(null);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!selected || !runId) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const recentTurns = collectRecentTurns(5);
      const [{ getUiLogs }, { getNetworkLog }] = await Promise.all([
        import("@/lib/ui-logger"),
        import("@/lib/network-logger"),
      ]);
      const clientSnapshot = {
        ...collectClientSnapshot(),
        dom: collectDomSummary(),
      };
      await submitBugReport(runId, {
        category: selected,
        description: description.trim() || undefined,
        recentTurns,
        uiDebugLog: getUiLogs(),
        clientSnapshot,
        networkLog: getNetworkLog(),
      });
      setStatus("done");
      // Auto-close after success
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "신고 전송에 실패했습니다");
    }
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
    >
      <div className="w-full max-w-md rounded-t-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-2xl shadow-black/50 sm:rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-5 py-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            버그 신고
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-muted)] transition hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Success state */}
        {status === "done" ? (
          <div className="flex flex-col items-center gap-3 px-5 py-10">
            <CheckCircle size={36} className="text-[var(--success-green)]" />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              신고가 접수되었습니다
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              소중한 의견 감사합니다
            </p>
          </div>
        ) : (
          <>
            {/* Category selection */}
            <div className="px-5 pt-4">
              <p className="mb-3 text-xs font-medium text-[var(--text-secondary)]">
                어떤 문제인가요?
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelected(cat.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      selected === cat.id
                        ? "border-[var(--gold)]/60 bg-[var(--gold)]/10 text-[var(--gold)]"
                        : "border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="px-5 pt-4">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="구체적으로 어떤 점이 이상한지 알려주세요"
                rows={3}
                className="w-full resize-none rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2.5 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)]/40 focus:outline-none"
              />
            </div>

            {/* Auto-attach notice */}
            <div className="flex items-center gap-1.5 px-5 pt-2">
              <Paperclip size={12} className="text-[var(--text-muted)]" />
              <span className="text-[11px] text-[var(--text-muted)]">
                최근 5턴 대화가 자동으로 첨부됩니다
              </span>
            </div>

            {/* Error message */}
            {status === "error" && errorMsg && (
              <div className="mx-5 mt-3 rounded border border-[var(--hp-red)]/30 bg-[var(--hp-red)]/10 px-3 py-2">
                <p className="text-xs text-[var(--hp-red)]">{errorMsg}</p>
              </div>
            )}

            {/* Submit */}
            <div className="px-5 pb-5 pt-4">
              <button
                onClick={handleSubmit}
                disabled={!selected || status === "submitting"}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2.5 text-sm font-medium text-[var(--bg-primary)] transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    전송 중...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    신고하기
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
