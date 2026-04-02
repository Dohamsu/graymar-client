"use client";

import { Compass, Clock, AlertTriangle, Award, GitBranch, Target, Shield } from "lucide-react";
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

const APPROACH_LABELS: Record<string, string> = {
  SOCIAL: "외교적",
  STEALTH: "은밀",
  FORCE: "무력",
  TRADE: "거래",
  INVESTIGATION: "조사",
  COMBAT: "전투",
};

const GOAL_LABELS: Record<string, string> = {
  GET_INFO: "정보 수집",
  GAIN_ACCESS: "접근 확보",
  SECURE_ITEM: "물건 확보",
  BUILD_ALLIANCE: "동맹 구축",
  RESOLVE_CONFLICT: "분쟁 해결",
  EARN_GOLD: "금화 벌기",
};

const FACTION_LABELS: Record<string, string> = {
  CITY_GUARD: "경비대",
  LABOR_GUILD: "노동 길드",
  MERCHANT_CONSORTIUM: "상인 연합",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ icon: Icon, title }: { icon: typeof Compass; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border-primary)] pb-2">
      <Icon size={12} className="text-[var(--text-muted)]" />
      <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-secondary)]">
        {title}
      </span>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-primary)]">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-2 text-[11px] text-[var(--text-muted)]">{text}</p>;
}

function ReputationBar({ value }: { value: number }) {
  const clamped = Math.max(-100, Math.min(100, value));
  const pct = ((clamped + 100) / 200) * 100;
  const color = value > 0 ? "var(--success-green)" : value < 0 ? "var(--hp-red)" : "var(--text-muted)";
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-primary)]">
      {/* center marker */}
      <div className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-[var(--text-muted)] opacity-40" />
      {/* filled portion from center */}
      {value !== 0 && (
        <div
          className="absolute top-0 h-full rounded-full transition-all"
          style={{
            left: value > 0 ? "50%" : `${pct}%`,
            width: `${Math.abs(pct - 50)}%`,
            backgroundColor: color,
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

  const activeGoals = playerGoals.filter((g) => !g.completed);
  const reputationEntries = reputation ? Object.entries(reputation) : [];

  return (
    <div className="flex flex-col gap-5">
      {/* A. Arc Route */}
      <section className="flex flex-col gap-2">
        <SectionHeader icon={Compass} title="노선" />
        {arcState?.currentRoute ? (
          <div className="flex flex-col gap-2 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] p-3">
            <div className="flex items-center justify-between">
              <span
                className="text-[12px] font-semibold"
                style={{ color: ARC_ROUTE_LABELS[arcState.currentRoute].color }}
              >
                {ARC_ROUTE_LABELS[arcState.currentRoute].name}
              </span>
              {arcState.commitment >= 3 && (
                <span className="rounded bg-[var(--gold)]/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--gold)]">
                  확정
                </span>
              )}
            </div>
            {/* Commitment pips */}
            <div className="flex items-center gap-1">
              <span className="mr-1 text-[9px] text-[var(--text-muted)]">각오</span>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2.5 w-6 rounded-sm border"
                  style={{
                    backgroundColor: i < arcState.commitment
                      ? ARC_ROUTE_LABELS[arcState.currentRoute!].color
                      : "transparent",
                    borderColor: ARC_ROUTE_LABELS[arcState.currentRoute!].color + "60",
                  }}
                />
              ))}
              <span className="ml-1 text-[9px] text-[var(--text-muted)]">{arcState.commitment}/3</span>
            </div>
            {arcState.betrayalCount > 0 && (
              <span className="text-[9px] text-[var(--hp-red)]">
                노선 변경 {arcState.betrayalCount}회
              </span>
            )}
          </div>
        ) : (
          <EmptyState text="아직 노선을 정하지 않았다" />
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
                className="flex flex-col gap-1.5 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--text-primary)]">
                    {FACTION_LABELS[factionId] ?? factionId}
                  </span>
                  <span
                    className="text-[10px] font-semibold"
                    style={{
                      color: value > 0 ? "var(--success-green)" : value < 0 ? "var(--hp-red)" : "var(--text-muted)",
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
          <EmptyState text="세력 정보 없음" />
        )}
      </section>

      {/* B. Deadline */}
      <section className="flex flex-col gap-2">
        <SectionHeader icon={Clock} title="시한" />
        {mainArcClock ? (
          <div className="flex flex-col gap-2 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-primary)]">
                {day}일차 / {mainArcClock.softDeadlineDay}일
              </span>
              {(() => {
                const remaining = mainArcClock.softDeadlineDay - (day ?? 1);
                const urgent = remaining <= 3;
                return (
                  <span
                    className={`text-[11px] font-semibold ${
                      mainArcClock.triggered
                        ? "text-[var(--hp-red)]"
                        : urgent
                          ? "text-[#f97316]"
                          : "text-[var(--text-muted)]"
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
              color={mainArcClock.triggered ? "var(--hp-red)" : day > mainArcClock.softDeadlineDay - 3 ? "#f97316" : "var(--info-blue)"}
            />
          </div>
        ) : (
          <EmptyState text="시한 정보 없음" />
        )}
      </section>

      {/* C. Active Incidents */}
      <section className="flex flex-col gap-2">
        <SectionHeader icon={AlertTriangle} title="진행 중 사건" />
        {activeIncidents.length > 0 ? (
          <div className="flex flex-col gap-2">
            {activeIncidents.map((inc) => {
              const kindInfo = INCIDENT_KIND_LABELS[inc.kind] ?? { label: inc.kind, color: "var(--text-muted)" };
              return (
                <div
                  key={inc.incidentId}
                  className={`flex flex-col gap-1.5 rounded border p-3 ${
                    inc.resolved
                      ? "border-[var(--border-primary)] bg-[var(--bg-card)] opacity-60"
                      : "border-[var(--border-primary)] bg-[var(--bg-card)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[var(--text-primary)]">
                      {inc.title}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: kindInfo.color + "20",
                        color: kindInfo.color,
                      }}
                    >
                      {kindInfo.label}
                    </span>
                  </div>
                  {inc.resolved ? (
                    <span className="text-[9px] text-[var(--text-muted)]">
                      결과: {inc.outcome === "CONTAINED" ? "해결" : inc.outcome === "ESCALATED" ? "악화" : "만료"}
                    </span>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-[9px] text-[var(--text-muted)]">통제</span>
                        <MiniBar value={inc.control} max={100} color="var(--success-green)" />
                        <span className="text-[9px] text-[var(--text-muted)]">{inc.control}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-[9px] text-[var(--text-muted)]">압박</span>
                        <MiniBar value={inc.pressure} max={100} color="var(--hp-red)" />
                        <span className="text-[9px] text-[var(--text-muted)]">{inc.pressure}</span>
                      </div>
                      <span className="text-[9px] text-[var(--text-muted)]">
                        단계 {inc.stage + 1}/3
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState text="활성 사건 없음" />
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
                className="group relative flex flex-col rounded border border-[var(--gold)]/30 bg-[var(--bg-card)] px-2.5 py-1.5"
              >
                <span className="text-[11px] font-medium text-[var(--gold)]">
                  {MARK_LABELS[mark.type] ?? mark.type}
                </span>
                {mark.context && (
                  <span className="text-[9px] leading-relaxed text-[var(--text-muted)]">
                    {mark.context}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="아직 획득한 정체성이 없다" />
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
                const successRate = thread.actionCount > 0
                  ? Math.round((thread.successRate ?? 0) * 100)
                  : 0;
                return (
                  <div
                    key={thread.threadId}
                    className="flex flex-col gap-1.5 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[var(--text-primary)]">
                        {APPROACH_LABELS[thread.approachVector] ?? thread.approachVector}
                      </span>
                      <span className="text-[9px] text-[var(--text-muted)]">
                        {GOAL_LABELS[thread.goalCategory] ?? thread.goalCategory}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MiniBar
                        value={successRate}
                        max={100}
                        color={successRate >= 60 ? "var(--success-green)" : successRate >= 30 ? "var(--gold)" : "var(--hp-red)"}
                      />
                      <span className="text-[9px] text-[var(--text-muted)]">
                        {successRate}%
                      </span>
                    </div>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {thread.actionCount}회 시도
                    </span>
                    {thread.summary && (
                      <span className="text-[9px] leading-relaxed text-[var(--text-muted)]">
                        {thread.summary}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <EmptyState text="아직 패턴이 감지되지 않았다" />
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
                className="flex flex-col gap-1.5 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px]">
                    {goal.type === "EXPLICIT" ? "\u{1F4CB}" : "\u{1F50D}"}
                  </span>
                  <span className="text-[11px] font-medium text-[var(--text-primary)]">
                    {goal.description}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-8 text-[9px] text-[var(--text-muted)]">진행</span>
                  <MiniBar
                    value={goal.progress}
                    max={100}
                    color={goal.progress >= 70 ? "var(--success-green)" : goal.progress >= 30 ? "var(--gold)" : "var(--info-blue)"}
                  />
                  <span className="text-[9px] text-[var(--text-muted)]">{goal.progress}%</span>
                </div>
                {goal.milestones.length > 0 && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {goal.milestones.map((ms, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-[9px]">
                          {ms.completed ? "\u2705" : "\u2B1C"}
                        </span>
                        <span
                          className={`text-[9px] leading-relaxed ${
                            ms.completed
                              ? "text-[var(--text-muted)] line-through"
                              : "text-[var(--text-secondary)]"
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
          <EmptyState text="아직 감지된 목표가 없다" />
        )}
      </section>
    </div>
  );
}
