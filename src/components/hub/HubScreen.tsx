"use client";

import { MapPin, Shield, AlertTriangle, Skull, Handshake, Coins } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { HeatGauge } from "./HeatGauge";
import { TimePhaseIndicator } from "./TimePhaseIndicator";
import { SignalFeedPanel } from "./SignalFeedPanel";
import { IncidentTracker } from "./IncidentTracker";
import { NpcRelationshipCard } from "./NpcRelationshipCard";
import type { WorldStateUI, Choice } from "@/types/game";

// LOCATION 정보 (클라이언트 표시용)
const LOCATION_INFO: Record<
  string,
  { name: string; description: string; dangerLevel: number; icon: typeof MapPin }
> = {
  go_market: {
    name: "시장 거리",
    description: "상인과 여행자가 북적이는 번화가. 소문과 거래가 오간다.",
    dangerLevel: 1,
    icon: MapPin,
  },
  go_guard: {
    name: "경비대 지구",
    description: "엄격한 질서가 유지되는 구역. 협력하거나 경계를 살필 수 있다.",
    dangerLevel: 2,
    icon: Shield,
  },
  go_harbor: {
    name: "항만 부두",
    description: "밤이면 위험해지는 부두. 밀수품과 정보가 은밀히 오간다.",
    dangerLevel: 3,
    icon: AlertTriangle,
  },
  go_slums: {
    name: "빈민가",
    description: "법의 손길이 닿지 않는 골목. 암흑가의 심장부.",
    dangerLevel: 4,
    icon: Skull,
  },
};

const DANGER_COLORS = [
  "border-[var(--success-green)]/40",
  "border-[var(--gold)]/40",
  "border-[var(--hp-red)]/40",
  "border-[var(--hp-red)]",
];

function LocationCard({
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
  const info = LOCATION_INFO[choiceId];
  if (!info) return null;

  const Icon = info.icon;
  const dangerIdx = Math.min(info.dangerLevel - 1, DANGER_COLORS.length - 1);

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`flex flex-col gap-2 rounded-lg border ${DANGER_COLORS[dangerIdx]} bg-[var(--bg-card)] p-4 text-left transition-all hover:bg-[rgba(201,169,98,0.06)] hover:border-[var(--gold)]/60 disabled:opacity-50`}
    >
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-[var(--text-muted)]" />
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
        {/* Location Cards */}
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold tracking-[2px] text-[var(--text-muted)]">
            행선지 선택
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {locationChoices.map((choice) => (
              <LocationCard
                key={choice.id}
                choiceId={choice.id}
                choice={choice}
                onSelect={() => submitChoice(choice.id)}
                disabled={isSubmitting}
              />
            ))}
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

        {/* Narrative Engine v1 Panels */}
        <IncidentTracker incidents={activeIncidents} />
        <SignalFeedPanel signals={signalFeed} />
        <NpcRelationshipCard npcs={npcEmotional} />
      </div>
    </div>
  );
}
