"use client";

import { useState } from "react";
import { useGameStore } from "@/store/game-store";
import {
  Header,
  MobileHeader,
  MobileLocationBar,
  MobileHudBar,
} from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NarrativePanel } from "@/components/narrative/NarrativePanel";
import { InputSection, MobileInputSection } from "@/components/input/InputSection";
import { SidePanel } from "@/components/side-panel/SidePanel";
import { BattlePanel } from "@/components/battle/BattlePanel";
import { StartScreen } from "@/components/screens/StartScreen";

import { RunEndScreen } from "@/components/screens/RunEndScreen";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LlmFailureModal } from "@/components/ui/LlmFailureModal";
import { LocationHeader } from "@/components/hub/LocationHeader";
import type { BattleEnemy } from "@/types/game";

export default function GamePage() {
  const phase = useGameStore((s) => s.phase);
  const messages = useGameStore((s) => s.messages);
  const choices = useGameStore((s) => s.choices);
  const hud = useGameStore((s) => s.hud);
  const currentNodeType = useGameStore((s) => s.currentNodeType);
  const inventory = useGameStore((s) => s.inventory);
  const characterInfo = useGameStore((s) => s.characterInfo);
  const battleState = useGameStore((s) => s.battleState);
  const isSubmitting = useGameStore((s) => s.isSubmitting);
  const submitAction = useGameStore((s) => s.submitAction);
  const submitChoice = useGameStore((s) => s.submitChoice);
  const flushPending = useGameStore((s) => s.flushPending);
  const worldState = useGameStore((s) => s.worldState);
  const locationName = useGameStore((s) => s.locationName);
  const llmStats = useGameStore((s) => s.llmStats);

  const [mobileTab, setMobileTab] = useState("story");

  // --- Phase routing ---
  if (phase === "TITLE" || phase === "LOADING") {
    return <StartScreen />;
  }
  if (phase === "RUN_ENDED") {
    return <RunEndScreen />;
  }

  // Extract battle enemies for BattlePanel
  const enemies: BattleEnemy[] =
    battleState && typeof battleState === "object" && "enemies" in battleState
      ? (battleState as { enemies: BattleEnemy[] }).enemies
      : [];

  const location =
    phase === "HUB"
      ? "그레이마르 거점"
      : locationName ?? "그레이마르 항만";

  // Combine choices into the message feed if not already there
  const displayMessages =
    choices.length > 0 &&
    (messages.length === 0 || messages[messages.length - 1]?.type !== "CHOICE")
      ? [
          ...messages,
          {
            id: "live-choices",
            type: "CHOICE" as const,
            text: "",
            choices,
          },
        ]
      : messages;

  const handleSubmit = (text: string) => {
    submitAction(text);
  };

  const handleQuickAction = (actionId: string) => {
    submitAction(actionId);
  };

  const handleChoiceSelect = (choiceId: string) => {
    submitChoice(choiceId);
  };

  return (
    <div className="mx-auto flex h-full max-w-[1440px] flex-col">
      {/* Error banner */}
      <ErrorBanner />
      {/* LLM failure modal */}
      <LlmFailureModal />

      {/* ===== Desktop Layout ===== */}
      <div className="hidden h-full flex-col lg:flex">
        <Header location={location} hud={hud} worldState={worldState} llmStats={llmStats} />

        {/* LOCATION 헤더 (LOCATION phase) */}
        {phase === "LOCATION" && (
          <LocationHeader locationName={location} />
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Left Column - Narrative */}
          <div className="flex flex-1 flex-col bg-[var(--bg-primary)]">
            {/* Battle panel (COMBAT only) */}
            {phase === "COMBAT" &&
              enemies.length > 0 &&
              <BattlePanel enemies={enemies} />}
            <NarrativePanel
              messages={displayMessages}
              onChoiceSelect={handleChoiceSelect}
              onNarrationComplete={flushPending}
            />
            <InputSection
              onSubmit={handleSubmit}
              onQuickAction={handleQuickAction}
              nodeType={currentNodeType}
              disabled={isSubmitting}
            />
          </div>

          {/* Right Column - Side Panel */}
          {characterInfo && <SidePanel character={characterInfo} inventory={inventory} gold={hud.gold} />}
        </div>
      </div>

      {/* ===== Mobile Layout ===== */}
      <div className="flex h-full flex-col lg:hidden">
        <MobileHeader />
        <MobileLocationBar location={location} />
        <MobileHudBar hud={hud} />

        <div className="flex flex-1 flex-col overflow-hidden">
          {mobileTab === "story" && (
            <>
              {phase === "COMBAT" &&
                enemies.length > 0 &&
                <BattlePanel enemies={enemies} />}
              <NarrativePanel
                messages={displayMessages}
                onChoiceSelect={handleChoiceSelect}
                onNarrationComplete={flushPending}
              />
            </>
          )}
          {mobileTab === "character" && (
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-sm text-[var(--text-muted)]">
                Character panel (mobile)
              </p>
            </div>
          )}
        </div>

        {mobileTab === "story" && (
          <MobileInputSection
            onSubmit={handleSubmit}
            onQuickAction={handleQuickAction}
            nodeType={currentNodeType}
            disabled={isSubmitting}
          />
        )}

        <MobileBottomNav activeTab={mobileTab} onTabChange={setMobileTab} />
      </div>
    </div>
  );
}
