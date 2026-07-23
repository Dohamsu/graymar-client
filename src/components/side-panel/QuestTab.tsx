"use client";

import { Compass, Clock, AlertTriangle, Award, GitBranch, Target, Shield, Sparkles, ScrollText, MapPin, CheckCircle2 } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import type { ArcRoute } from "@/types/game";

// ---------------------------------------------------------------------------
// Constants / Labels
// ---------------------------------------------------------------------------

const ARC_ROUTE_LABELS: Record<ArcRoute, { name: string; color: string }> = {
  EXPOSE_CORRUPTION: { name: "부패 폭로", color: "var(--info-blue)" },
  PROFIT_FROM_CHAOS: { name: "혼란의 이득", color: "var(--gold)" },
  ALLY_GUARD: { name: "경비대 동맹", color: "var(--success-green)" },
};

const MARK_LABELS: Record<string, string> = {
  BETRAYER: "배신자",
  SAVIOR: "구원자",
  KINGMAKER: "왕 세우는 자",
  SHADOW_HAND: "그림자 손",
  MARTYR: "순교자",
  PROFITEER: "이익 추구자",
  PEACEMAKER: "중재자",
  WITNESS: "목격자",
  ACCOMPLICE: "공범",
  AVENGER: "복수자",
  COWARD: "겁쟁이",
  MERCIFUL: "자비로운 자",
};

const INCIDENT_KIND_LABELS: Record<string, { label: string; color: string }> = {
  CRIMINAL: { label: "범죄", color: "var(--hp-red)" },
  POLITICAL: { label: "정치", color: "var(--info-blue)" },
  ECONOMIC: { label: "경제", color: "var(--gold)" },
  SOCIAL: { label: "사회", color: "var(--success-green)" },
  MILITARY: { label: "군사", color: "#f97316" },
};

// 서버 정본 enum (parsed-intent-v3.ts APPROACH_VECTOR)과 1:1 — drift 수정 2026-07-23
const APPROACH_LABELS: Record<string, string> = {
  SOCIAL: "사교",
  STEALTH: "은밀",
  PRESSURE: "압박",
  ECONOMIC: "거래",
  OBSERVATIONAL: "관찰",
  POLITICAL: "정치",
  LOGISTICAL: "실무",
  VIOLENT: "무력",
};

// 서버 정본 enum (parsed-intent-v3.ts INTENT_GOAL_CATEGORY)과 1:1
const GOAL_LABELS: Record<string, string> = {
  GET_INFO: "정보 수집",
  GAIN_ACCESS: "접근 확보",
  SHIFT_RELATION: "관계 변화",
  ACQUIRE_RESOURCE: "자원 확보",
  BLOCK_RIVAL: "경쟁자 견제",
  CREATE_DISTRACTION: "교란",
  HIDE_TRACE: "흔적 은폐",
  ESCALATE_CONFLICT: "충돌 격화",
  DEESCALATE_CONFLICT: "충돌 완화",
  TEST_REACTION: "반응 떠보기",
};

const FACTION_LABELS: Record<string, string> = {
  CITY_GUARD: "경비대",
  LABOR_GUILD: "노동 길드",
  MERCHANT_CONSORTIUM: "상인 연합",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// 카드 공통 클래스 — 모든 섹션의 카드는 동일한 elevated/대비 룩
const CARD_CLASS =
  "rounded-md border border-white/20 bg-white/[0.06] p-3 shadow-md shadow-black/40 backdrop-blur-[1px]";

function SectionHeader({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Compass;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-2 border-b border-white/15 pb-2">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-[var(--gold)]" />
        <span className="text-[12px] font-bold uppercase tracking-[2px] text-[var(--text-primary)]">
          {title}
        </span>
      </div>
      {hint && (
        <span className="text-[11px] font-medium tabular-nums text-[var(--text-primary)]/70">
          {hint}
        </span>
      )}
    </div>
  );
}

function MiniBar({
  value,
  max,
  color,
  height = "h-2.5",
}: {
  value: number;
  max: number;
  color: string;
  height?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className={`${height} w-full overflow-hidden rounded-full border border-white/15 bg-white/[0.16]`}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}66` }}
      />
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-white/20 bg-white/[0.03] px-3 py-3">
      <p className="text-[12px] font-medium text-[var(--text-primary)]/85">{text}</p>
    </div>
  );
}

function StageDots({ stage, total = 3 }: { stage: number; total?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => {
        const reached = i <= stage;
        return (
          <span
            key={i}
            className="h-1.5 w-4 rounded-full"
            style={{
              backgroundColor: reached ? "var(--gold)" : "rgba(255,255,255,0.18)",
              boxShadow: reached ? "0 0 4px var(--gold)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

// 진행도 라벨 + 바 + 우측 % 숫자. 가로 폭 일관성 보장.
function StatRow({
  label,
  value,
  color,
  max = 100,
  suffix = "%",
}: {
  label: string;
  value: number;
  color: string;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-10 shrink-0 text-[12px] font-semibold text-[var(--text-primary)]/90">
        {label}
      </span>
      <MiniBar value={value} max={max} color={color} />
      <span className="w-11 shrink-0 text-right text-[12px] font-bold tabular-nums text-[var(--text-primary)]">
        {value}
        {suffix}
      </span>
    </div>
  );
}

function ReputationBar({ value }: { value: number }) {
  const clamped = Math.max(-100, Math.min(100, value));
  const pct = ((clamped + 100) / 200) * 100;
  const color = value > 0 ? "var(--success-green)" : value < 0 ? "var(--hp-red)" : "var(--text-primary)";
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full border border-white/15 bg-white/[0.16]">
      {/* center marker */}
      <div className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-white/60" />
      {/* filled portion from center */}
      {value !== 0 && (
        <div
          className="absolute top-0 h-full rounded-full transition-all"
          style={{
            left: value > 0 ? "50%" : `${pct}%`,
            width: `${Math.abs(pct - 50)}%`,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}66`,
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function QuestTab() {
  const arcState = useGameStore((s) => s.arcState);
  const mainArcClock = useGameStore((s) => s.mainArcClock);
  const day = useGameStore((s) => s.day);
  const activeIncidents = useGameStore((s) => s.activeIncidents);
  const narrativeMarks = useGameStore((s) => s.narrativeMarks);
  const playerThreads = useGameStore((s) => s.playerThreads);
  const playerGoals = useGameStore((s) => s.playerGoals);
  const reputation = useGameStore((s) => s.worldState?.reputation);
  const questStatus = useGameStore((s) => s.questStatus);

  const activeGoals = playerGoals.filter((g) => !g.completed);
  const reputationEntries = reputation ? Object.entries(reputation) : [];

  // 이정표 — 미발견 단서의 발견 가능 지역 (중복 지역 병합)
  const nextLocationNames = [
    ...new Set(
      (questStatus?.nextObjectives ?? []).flatMap((o) => o.locationNames),
    ),
  ];

  // ── 상단 요약 — 현재 데이터만 사용. 항목이 하나라도 있으면 카드 노출.
  const summaryRoute = arcState?.currentRoute ? ARC_ROUTE_LABELS[arcState.currentRoute] : null;
  const summaryDeadline = mainArcClock
    ? mainArcClock.triggered
      ? { label: "시한 초과", urgent: true }
      : (() => {
          const remaining = mainArcClock.softDeadlineDay - (day ?? 1);
          return { label: `D-${remaining}`, urgent: remaining <= 3 };
        })()
    : null;
  const summaryGoal = activeGoals[0] ?? null;
  const summaryActiveIncidentCount = activeIncidents.filter((i) => !i.resolved).length;
  const showSummary = Boolean(summaryRoute || summaryDeadline || summaryGoal || summaryActiveIncidentCount);

  return (
    <div className="flex flex-col gap-6">
      {/* -1. 의뢰 현황판 (2026-07-23) — 단계·발견 단서·다음 행선지 이정표 */}
      {questStatus && (
        <section className="flex flex-col gap-2">
          <SectionHeader
            icon={ScrollText}
            title="의뢰"
            hint={`단계 ${questStatus.stateIndex + 1}/${questStatus.totalStates}`}
          />
          <div className={`flex flex-col gap-3 ${CARD_CLASS}`}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[14px] font-bold leading-snug text-[var(--gold)]">
                {questStatus.title}
              </span>
            </div>
            <MiniBar
              value={questStatus.stateIndex + 1}
              max={questStatus.totalStates}
              color="var(--gold)"
            />
            {questStatus.stateDescription && (
              <p className="text-[12px] leading-relaxed text-[var(--text-primary)]/90">
                {questStatus.stateDescription}
              </p>
            )}

            {/* 다음 행선지 — 이정표 */}
            {questStatus.terminal ? (
              <div className="flex items-center gap-2 border-t border-white/15 pt-2.5">
                <MapPin size={13} className="shrink-0 text-[var(--hp-red)]" />
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                  최종 선택의 순간 — 더 모을 단서는 없다
                </span>
              </div>
            ) : nextLocationNames.length > 0 ? (
              <div className="flex flex-col gap-2 border-t border-white/15 pt-2.5">
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="shrink-0 text-[var(--gold)]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)]/75">
                    다음 단서가 있는 곳
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {nextLocationNames.map((name) => (
                    <span
                      key={name}
                      className="rounded border border-[var(--gold)]/50 bg-[var(--gold)]/[0.12] px-2 py-0.5 text-[12px] font-semibold text-[var(--gold)]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 단서 방향 힌트 ([단서 방향]과 동일 소스) */}
            {questStatus.directionHint && !questStatus.terminal && (
              <p className="rounded bg-white/[0.05] px-2.5 py-2 text-[12px] italic leading-relaxed text-[var(--text-primary)]/85">
                {questStatus.directionHint}
              </p>
            )}

            {/* 발견한 단서 */}
            <div className="flex flex-col gap-1.5 border-t border-white/15 pt-2.5">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="shrink-0 text-[var(--success-green)]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)]/75">
                  발견한 단서 {questStatus.discoveredFacts.length}건
                </span>
              </div>
              {questStatus.discoveredFacts.length > 0 ? (
                questStatus.discoveredFacts.map((f) => (
                  <div key={f.factId} className="flex items-start gap-1.5">
                    <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-[var(--success-green)]" />
                    <span className="text-[12px] leading-relaxed text-[var(--text-primary)]/90">
                      {f.description}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-[12px] text-[var(--text-primary)]/60">
                  아직 단서를 찾지 못했다 — 위 지역에서 조사하거나 사람들에게 물어보자
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 0. Top Summary — 현재 상황 한눈에 */}
      {showSummary && (
        <section className="flex flex-col gap-2">
          <SectionHeader icon={Sparkles} title="현재 상황" />
          <div className={`flex flex-col gap-2.5 ${CARD_CLASS}`}>
            {/* 노선 + 시한 한 줄 */}
            {(summaryRoute || summaryDeadline) && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[var(--text-primary)]/85">노선</span>
                <div className="flex items-center gap-2">
                  {summaryRoute ? (
                    <span
                      className="text-[13px] font-bold"
                      style={{ color: summaryRoute.color }}
                    >
                      {summaryRoute.name}
                    </span>
                  ) : (
                    <span className="text-[12px] font-medium text-[var(--text-primary)]/70">
                      미정
                    </span>
                  )}
                  {summaryDeadline && (
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                        summaryDeadline.urgent
                          ? "bg-[var(--hp-red)]/25 text-[var(--hp-red)]"
                          : "bg-white/10 text-[var(--text-primary)]/95"
                      }`}
                    >
                      {summaryDeadline.label}
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* 활성 사건 카운트 */}
            {summaryActiveIncidentCount > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[var(--text-primary)]/85">활성 사건</span>
                <span className="text-[12px] font-bold tabular-nums text-[var(--text-primary)]">
                  {summaryActiveIncidentCount}건
                </span>
              </div>
            )}
            {/* 다음 목표 한 줄 */}
            {summaryGoal && (
              <div className="flex flex-col gap-1.5 border-t border-white/15 pt-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)]/75">
                  다음 목표
                </span>
                <div className="flex items-start gap-2">
                  <span className="mt-px text-[12px] leading-none">
                    {summaryGoal.type === "EXPLICIT" ? "\u{1F4CB}" : "\u{1F50D}"}
                  </span>
                  <span className="text-[12px] font-semibold leading-snug text-[var(--text-primary)]">
                    {summaryGoal.description}
                  </span>
                </div>
                <StatRow
                  label="진행"
                  value={summaryGoal.progress}
                  color={
                    summaryGoal.progress >= 70
                      ? "var(--success-green)"
                      : summaryGoal.progress >= 30
                        ? "var(--gold)"
                        : "var(--info-blue)"
                  }
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* A. Arc Route */}
      <section className="flex flex-col gap-2">
        <SectionHeader icon={Compass} title="노선" />
        {arcState?.currentRoute ? (
          <div className={`flex flex-col gap-3 ${CARD_CLASS}`}>
            <div className="flex items-center justify-between">
              <span
                className="text-[14px] font-bold"
                style={{ color: ARC_ROUTE_LABELS[arcState.currentRoute].color }}
              >
                {ARC_ROUTE_LABELS[arcState.currentRoute].name}
              </span>
              {arcState.commitment >= 3 && (
                <span className="rounded border border-[var(--gold)]/60 bg-[var(--gold)]/30 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--gold)]">
                  확정
                </span>
              )}
            </div>
            {/* Commitment pips */}
            <div className="flex items-center gap-1.5">
              <span className="mr-1 w-10 shrink-0 text-[12px] font-semibold text-[var(--text-primary)]/90">각오</span>
              {[0, 1, 2].map((i) => {
                const filled = i < arcState.commitment;
                const routeColor = ARC_ROUTE_LABELS[arcState.currentRoute!].color;
                return (
                  <div
                    key={i}
                    className="h-3 w-7 rounded-sm border"
                    style={{
                      backgroundColor: filled ? routeColor : "rgba(255,255,255,0.08)",
                      borderColor: filled ? routeColor : "rgba(255,255,255,0.35)",
                      boxShadow: filled ? `0 0 6px ${routeColor}99` : undefined,
                    }}
                  />
                );
              })}
              <span className="ml-1 text-[12px] font-bold tabular-nums text-[var(--text-primary)]">{arcState.commitment}/3</span>
            </div>
            {arcState.betrayalCount > 0 && (
              <span className="text-[12px] font-semibold text-[var(--hp-red)]">
                노선 변경 {arcState.betrayalCount}회
              </span>
            )}
          </div>
        ) : (
          <EmptyCard text="아직 노선을 정하지 않았다" />
        )}
      </section>

      {/* A-2. Faction Reputation */}
      <section className="flex flex-col gap-2">
        <SectionHeader icon={Shield} title="세력 관계" />
        {reputationEntries.length > 0 ? (
          <div className="flex flex-col gap-2">
            {reputationEntries.map(([factionId, value]) => (
              <div
                key={factionId}
                className={`flex flex-col gap-2 ${CARD_CLASS}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {questStatus?.factionNames?.[factionId] ?? FACTION_LABELS[factionId] ?? factionId}
                  </span>
                  <span
                    className="text-[12px] font-bold tabular-nums"
                    style={{
                      color: value > 0 ? "var(--success-green)" : value < 0 ? "var(--hp-red)" : "var(--text-primary)",
                    }}
                  >
                    {value > 0 ? `+${value}` : value}
                  </span>
                </div>
                <ReputationBar value={value} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyCard text="아직 접촉한 세력이 없다" />
        )}
      </section>

      {/* B. Deadline */}
      <section className="flex flex-col gap-2">
        <SectionHeader icon={Clock} title="시한" />
        {mainArcClock ? (
          <div className={`flex flex-col gap-2.5 ${CARD_CLASS}`}>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold tabular-nums text-[var(--text-primary)]">
                {day}일차 / {mainArcClock.softDeadlineDay}일
              </span>
              {(() => {
                const remaining = mainArcClock.softDeadlineDay - (day ?? 1);
                const urgent = remaining <= 3;
                return (
                  <span
                    className={`rounded px-2 py-0.5 text-[12px] font-bold tabular-nums ${
                      mainArcClock.triggered
                        ? "bg-[var(--hp-red)]/25 text-[var(--hp-red)]"
                        : urgent
                          ? "bg-[var(--orange)]/25 text-[var(--orange)]"
                          : "bg-white/10 text-[var(--text-primary)]"
                    }`}
                  >
                    {mainArcClock.triggered ? "시한 초과" : `D-${remaining}`}
                  </span>
                );
              })()}
            </div>
            <MiniBar
              value={day}
              max={mainArcClock.softDeadlineDay}
              color={mainArcClock.triggered ? "var(--hp-red)" : day > mainArcClock.softDeadlineDay - 3 ? "var(--orange)" : "var(--info-blue)"}
            />
          </div>
        ) : (
          <EmptyCard text="아직 시한이 정해지지 않았다" />
        )}
      </section>

      {/* C. Active Incidents */}
      <section className="flex flex-col gap-2">
        <SectionHeader
          icon={AlertTriangle}
          title="진행 중 사건"
          hint={activeIncidents.length > 0 ? `${activeIncidents.length}건` : undefined}
        />
        {activeIncidents.length > 0 ? (
          <div className="flex flex-col gap-2">
            {activeIncidents.map((inc) => {
              const kindInfo = INCIDENT_KIND_LABELS[inc.kind] ?? { label: inc.kind, color: "var(--text-primary)" };
              return (
                <div
                  key={inc.incidentId}
                  className={`flex flex-col gap-2.5 ${CARD_CLASS} ${inc.resolved ? "opacity-60" : ""}`}
                  style={{
                    borderLeft: `2px solid ${kindInfo.color}${inc.resolved ? "55" : "AA"}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-semibold leading-snug text-[var(--text-primary)]">
                      {inc.title}
                    </span>
                    <span
                      className="shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold tracking-wide"
                      style={{
                        backgroundColor: kindInfo.color + "30",
                        borderColor: kindInfo.color + "60",
                        color: kindInfo.color,
                      }}
                    >
                      {kindInfo.label}
                    </span>
                  </div>
                  {inc.resolved ? (
                    <span className="text-[12px] font-medium text-[var(--text-primary)]/85">
                      결과: {inc.outcome === "CONTAINED" ? "해결" : inc.outcome === "ESCALATED" ? "악화" : "만료"}
                    </span>
                  ) : (
                    <>
                      <StatRow label="통제" value={inc.control} color="var(--success-green)" />
                      <StatRow label="압박" value={inc.pressure} color="var(--hp-red)" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]/85">
                          단계 {inc.stage + 1}/3
                        </span>
                        <StageDots stage={inc.stage} total={3} />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyCard text="아직 진행 중인 사건이 없다" />
        )}
      </section>

      {/* D. Narrative Marks */}
      <section className="flex flex-col gap-2">
        <SectionHeader icon={Award} title="정체성" />
        {narrativeMarks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {narrativeMarks.map((mark, idx) => (
              <div
                key={`${mark.type}-${idx}`}
                className="group relative flex flex-col gap-1 rounded-md border border-[var(--gold)]/60 bg-[var(--gold)]/[0.12] px-2.5 py-1.5 shadow-md shadow-black/40"
              >
                <span className="text-[12px] font-bold tracking-wide text-[var(--gold)]">
                  {MARK_LABELS[mark.type] ?? mark.type}
                </span>
                {mark.context && (
                  <span className="text-[12px] font-medium leading-relaxed text-[var(--text-primary)]/90">
                    {mark.context}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyCard text="아직 획득한 정체성이 없다" />
        )}
      </section>

      {/* E. Player Threads */}
      <section className="flex flex-col gap-2">
        <SectionHeader icon={GitBranch} title="행동 패턴" />
        {playerThreads.filter((t) => t.status === "ACTIVE" || t.status === "EMERGING").length > 0 ? (
          <div className="flex flex-col gap-2">
            {playerThreads
              .filter((t) => t.status === "ACTIVE" || t.status === "EMERGING")
              .map((thread) => {
                // 서버가 raw PlayerThread(successCount/failCount)를 보내는 경로
                // 대응 — successRate 부재 시 successCount로 직접 계산 (0% 고정 버그 수정)
                const rate =
                  thread.successRate ??
                  (thread.actionCount > 0
                    ? (thread.successCount ?? 0) / thread.actionCount
                    : 0);
                const successRate = thread.actionCount > 0 ? Math.round(rate * 100) : 0;
                return (
                  <div
                    key={thread.threadId}
                    className={`flex flex-col gap-2 ${CARD_CLASS}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                        {APPROACH_LABELS[thread.approachVector] ?? thread.approachVector}
                      </span>
                      <span className="rounded border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--text-primary)]/90">
                        {GOAL_LABELS[thread.goalCategory] ?? thread.goalCategory}
                      </span>
                    </div>
                    <StatRow
                      label="성공"
                      value={successRate}
                      color={successRate >= 60 ? "var(--success-green)" : successRate >= 30 ? "var(--gold)" : "var(--hp-red)"}
                    />
                    <span className="text-[12px] font-medium text-[var(--text-primary)]/80">
                      {thread.actionCount}회 시도
                    </span>
                    {thread.summary && (
                      <span className="text-[12px] leading-relaxed text-[var(--text-primary)]/90">
                        {thread.summary}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <EmptyCard text="아직 패턴이 감지되지 않았다" />
        )}
      </section>

      {/* F. Player Goals */}
      <section className="flex flex-col gap-2">
        <SectionHeader icon={Target} title="활성 목표" />
        {activeGoals.length > 0 ? (
          <div className="flex flex-col gap-2">
            {activeGoals.map((goal) => (
              <div
                key={goal.id}
                className={`flex flex-col gap-2 ${CARD_CLASS}`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-px text-[13px] leading-none">
                    {goal.type === "EXPLICIT" ? "\u{1F4CB}" : "\u{1F50D}"}
                  </span>
                  <span className="text-[13px] font-semibold leading-snug text-[var(--text-primary)]">
                    {goal.description}
                  </span>
                </div>
                <StatRow
                  label="진행"
                  value={goal.progress}
                  color={goal.progress >= 70 ? "var(--success-green)" : goal.progress >= 30 ? "var(--gold)" : "var(--info-blue)"}
                />
                {goal.milestones.length > 0 && (
                  <div className="mt-0.5 flex flex-col gap-1.5 border-t border-white/15 pt-2.5">
                    {goal.milestones.map((ms, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="mt-px text-[11px] leading-none">
                          {ms.completed ? "\u2705" : "\u2B1C"}
                        </span>
                        <span
                          className={`text-[12px] leading-relaxed ${
                            ms.completed
                              ? "text-[var(--text-primary)]/55 line-through"
                              : "text-[var(--text-primary)]/95"
                          }`}
                        >
                          {ms.description}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyCard text="아직 감지된 목표가 없다" />
        )}
      </section>
    </div>
  );
}
