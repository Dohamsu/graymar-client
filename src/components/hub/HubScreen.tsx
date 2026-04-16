"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin, Shield, AlertTriangle, Skull, Handshake, Coins } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { HeatGauge } from "./HeatGauge";
import { TimePhaseIndicator } from "./TimePhaseIndicator";
import { SignalFeedPanel } from "./SignalFeedPanel";
import { IncidentTracker } from "./IncidentTracker";
import { NpcRelationshipCard } from "./NpcRelationshipCard";
import { PinnedAlertStack } from "./PinnedAlertStack";
import { WorldDeltaSummaryCard } from "./WorldDeltaSummaryCard";
import { HubNotificationList } from "./HubNotificationList";
import type { Choice, LocationDynamicStateUI } from "@/types/game";

function CollapsibleSection({ title, badge, defaultOpen = false, children }: {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider cursor-pointer"
        aria-expanded={open}
      >
        <span>{title}{badge != null && badge > 0 ? ` (${badge})` : ''}</span>
        <span className="text-[10px] text-[var(--text-muted)]">{open ? '\u25BC' : '\u25B6'}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

// choiceId → locationId 매핑
const CHOICE_TO_LOCATION_ID: Record<string, string> = {
  go_market: "LOC_MARKET",
  go_guard: "LOC_GUARD",
  go_harbor: "LOC_HARBOR",
  go_slums: "LOC_SLUMS",
};

// 조건 ID → 표시 라벨
const CONDITION_LABELS: Record<string, { label: string; emoji: string }> = {
  LOCKDOWN: { label: "봉쇄", emoji: "\u{1F512}" },
  CURFEW: { label: "통금", emoji: "\u{1F6D1}" },
  FESTIVAL: { label: "축제", emoji: "\u{1F389}" },
  BLACK_MARKET: { label: "암시장", emoji: "\u{1F4B0}" },
  RIOT: { label: "소요", emoji: "\u26A0\uFE0F" },
  MARTIAL_LAW: { label: "계엄", emoji: "\u2694\uFE0F" },
};

// LOCATION 정보 (클라이언트 표시용)
const LOCATION_INFO: Record<
  string,
  { name: string; description: string; dangerLevel: number; icon: typeof MapPin; imagePath: string }
> = {
  go_market: {
    name: "시장 거리",
    description: "상인과 여행자가 북적이는 번화가. 소문과 거래가 오간다.",
    dangerLevel: 1,
    icon: MapPin,
    imagePath: "/locations/market_day_safe.webp",
  },
  go_guard: {
    name: "경비대 지구",
    description: "엄격한 질서가 유지되는 구역. 협력하거나 경계를 살필 수 있다.",
    dangerLevel: 2,
    icon: Shield,
    imagePath: "/locations/guard_day_safe.webp",
  },
  go_harbor: {
    name: "항만 부두",
    description: "밤이면 위험해지는 부두. 밀수품과 정보가 은밀히 오간다.",
    dangerLevel: 3,
    icon: AlertTriangle,
    imagePath: "/locations/harbor_day_safe.webp",
  },
  go_slums: {
    name: "빈민가",
    description: "법의 손길이 닿지 않는 골목. 암흑가의 심장부.",
    dangerLevel: 4,
    icon: Skull,
    imagePath: "/locations/slums_day_safe.webp",
  },
};

const DANGER_COLORS = [
  "border-[var(--success-green)]/40",
  "border-[var(--gold)]/40",
  "border-[var(--hp-red)]/40",
  "border-[var(--hp-red)]",
];

function SecurityBar({ value }: { value: number }) {
  const color =
    value >= 70 ? "var(--success-green)" : value >= 40 ? "var(--gold)" : "var(--hp-red)";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-[var(--text-muted)]">치안</span>
      <div className="h-1 w-12 overflow-hidden rounded-full bg-[var(--border-primary)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-[var(--text-muted)]">{value}</span>
    </div>
  );
}

function LocationCard({
  choiceId,
  onSelect,
  disabled,
  locState,
}: {
  choiceId: string;
  onSelect: () => void;
  disabled: boolean;
  locState?: LocationDynamicStateUI;
}) {
  const info = LOCATION_INFO[choiceId];
  if (!info) return null;

  const Icon = info.icon;
  const dangerIdx = Math.min(info.dangerLevel - 1, DANGER_COLORS.length - 1);

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`flex gap-3 rounded-lg border ${DANGER_COLORS[dangerIdx]} bg-[var(--bg-card)] p-3 text-left transition-all hover:bg-[rgba(201,169,98,0.06)] hover:border-[var(--gold)]/60 disabled:opacity-50`}
    >
      <div className="relative h-[48px] w-[80px] shrink-0 overflow-hidden rounded">
        <Image
          src={info.imagePath}
          alt={info.name}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-[var(--text-muted)]" />
          <span className="font-display text-sm font-semibold text-[var(--text-primary)]">
            {info.name}
          </span>
          <span className="ml-auto text-xs text-[var(--text-muted)]">
            {"!".repeat(info.dangerLevel)}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          {info.description}
        </p>
        {/* Location Dynamic State */}
        {locState && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <SecurityBar value={locState.security} />
            {locState.unrest > 0 && (
              <span className="text-[10px] text-[var(--hp-red)]">
                불안 {locState.unrest}
              </span>
            )}
            {locState.activeConditions.map((cond) => {
              const label = CONDITION_LABELS[cond.id] ?? { label: cond.id, emoji: "\u{1F7E1}" };
              return (
                <span
                  key={cond.id}
                  className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]"
                >
                  {label.emoji} {label.label}
                </span>
              );
            })}
            {locState.presentNpcs.length > 0 && (
              <span className="text-[10px] text-[var(--info-blue)]">
                {locState.presentNpcs.join(", ")}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function HeatResolutionCard({
  choiceId,
  choice,
  onSelect,
  disabled,
}: {
  choiceId: string;
  choice: Choice;
  onSelect: () => void;
  disabled: boolean;
}) {
  const isAlly = choiceId === "contact_ally";

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className="flex items-center gap-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3 text-left transition-all hover:border-[var(--gold)]/40 hover:bg-[rgba(201,169,98,0.04)] disabled:opacity-50"
    >
      {isAlly ? (
        <Handshake size={16} className="text-[var(--info-blue)]" />
      ) : (
        <Coins size={16} className="text-[var(--gold)]" />
      )}
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {choice.label}
        </span>
      </div>
    </button>
  );
}

export function HubScreen() {
  const choices = useGameStore((s) => s.choices);
  const worldState = useGameStore((s) => s.worldState);
  const messages = useGameStore((s) => s.messages);
  const submitChoice = useGameStore((s) => s.submitChoice);
  const isSubmitting = useGameStore((s) => s.isSubmitting);
  const signalFeed = useGameStore((s) => s.signalFeed);
  const activeIncidents = useGameStore((s) => s.activeIncidents);
  const npcEmotional = useGameStore((s) => s.npcEmotional);
  const pinnedAlerts = useGameStore((s) => s.pinnedAlerts);
  const worldDeltaSummary = useGameStore((s) => s.worldDeltaSummary);
  const notifications = useGameStore((s) => s.notifications);
  const locationDynamicStates = useGameStore((s) => s.locationDynamicStates);

  const locationChoices = choices.filter((c) =>
    c.id.startsWith("go_"),
  );
  const heatChoices = choices.filter(
    (c) => c.id === "contact_ally" || c.id === "pay_cost",
  );

  // 최신 내레이터/시스템 메시지에서 HUB 분위기 텍스트 추출
  const lastNarrator = [...messages].reverse().find((m) => m.type === "NARRATOR" || m.type === "SYSTEM");

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      {/* HUB Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-6 py-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-xl tracking-[2px] text-[var(--text-primary)]">
            그레이마르 거점
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            도시의 소식을 살피고 다음 행선지를 정하라.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {worldState && (
            <>
              <TimePhaseIndicator timePhase={worldState.timePhase} phaseV2={worldState.phaseV2} day={worldState.day} />
              <HeatGauge worldState={worldState} />
            </>
          )}
        </div>
      </div>

      {/* Narrative text */}
      {lastNarrator && (
        <div className="border-b border-[var(--border-primary)] px-6 py-4">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {lastNarrator.text}
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Notification Briefing */}
        <PinnedAlertStack alerts={pinnedAlerts} />
        <WorldDeltaSummaryCard summary={worldDeltaSummary} />

        {/* Location Cards */}
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold tracking-[2px] text-[var(--text-muted)]">
            행선지 선택
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {locationChoices.map((choice) => {
              const locId = CHOICE_TO_LOCATION_ID[choice.id];
              const locState = locId ? locationDynamicStates[locId] : undefined;
              return (
                <LocationCard
                  key={choice.id}
                  choiceId={choice.id}
                  onSelect={() => submitChoice(choice.id)}
                  disabled={isSubmitting}
                  locState={locState}
                />
              );
            })}
          </div>
        </div>

        {/* Heat Resolution Options */}
        {heatChoices.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-semibold tracking-[2px] text-[var(--text-muted)]">
              경계 해소
            </h3>
            <div className="flex flex-col gap-2">
              {heatChoices.map((choice) => (
                <HeatResolutionCard
                  key={choice.id}
                  choiceId={choice.id}
                  choice={choice}
                  onSelect={() => submitChoice(choice.id)}
                  disabled={isSubmitting}
                />
              ))}
            </div>
          </div>
        )}

        {/* Narrative Engine v1 Panels — Collapsible */}
        {activeIncidents.length > 0 && (
          <CollapsibleSection title="진행 중인 사건" badge={activeIncidents.length} defaultOpen={activeIncidents.some(i => !i.resolved)}>
            <IncidentTracker incidents={activeIncidents} />
          </CollapsibleSection>
        )}
        {notifications.length > 0 && (
          <CollapsibleSection title="알림" badge={notifications.length} defaultOpen={notifications.length <= 3}>
            <HubNotificationList notifications={notifications} />
          </CollapsibleSection>
        )}
        {signalFeed.length > 0 && (
          <CollapsibleSection title="시그널" badge={signalFeed.length} defaultOpen={false}>
            <SignalFeedPanel signals={signalFeed} />
          </CollapsibleSection>
        )}
        {npcEmotional.length > 0 && (
          <CollapsibleSection title="인물 관계" badge={npcEmotional.length} defaultOpen={false}>
            <NpcRelationshipCard npcs={npcEmotional} />
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}
