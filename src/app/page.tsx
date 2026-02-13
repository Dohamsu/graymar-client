"use client";

import { useState } from "react";
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
import type { StoryMessage, PlayerHud, CharacterInfo } from "@/types/game";

// ---- Mock Data ----
const MOCK_HUD: PlayerHud = {
  hp: 78,
  maxHp: 100,
  stamina: 3,
  maxStamina: 5,
  gold: 1250,
};

const MOCK_MESSAGES: StoryMessage[] = [
  {
    id: "msg-1",
    type: "SYSTEM",
    text: "You have entered the Abandoned Harbor. The air is thick with the scent of salt and decay. Broken ships creak in the distance.",
  },
  {
    id: "msg-2",
    type: "PLAYER",
    text: "I cautiously approach the nearest ship, keeping my hand on my sword hilt.",
  },
  {
    id: "msg-3",
    type: "NARRATOR",
    text: "As you step onto the weathered gangplank, it groans beneath your weight. Through the fog, you spot a faint golden glow emanating from within the ship's cabin. The sound of rattling chains echoes from somewhere below deck.\n\nA cold wind sweeps across the harbor, carrying whispers of those who came before and never returned.",
  },
  {
    id: "msg-4",
    type: "CHOICE",
    text: "",
    choices: [
      { id: "c1", label: "Investigate the golden glow in the cabin" },
      { id: "c2", label: "Descend below deck toward the chains" },
      { id: "c3", label: "Search the deck for useful items" },
      { id: "c4", label: "Leave the ship and explore elsewhere", disabled: true },
    ],
  },
];

const MOCK_CHARACTER: CharacterInfo = {
  name: "Sir Aldric",
  class: "Wandering Knight",
  level: 12,
  exp: 2450,
  maxExp: 3000,
  stats: [
    { label: "STR", value: 18, color: "var(--hp-red)" },
    { label: "DEX", value: 14, color: "var(--success-green)" },
    { label: "INT", value: 12, color: "var(--info-blue)" },
    { label: "DEF", value: 16, color: "var(--gold)" },
  ],
  equipment: [
    { slot: "Head", name: "Iron Helm", icon: "hard-hat", color: "var(--gold)" },
    { slot: "Body", name: "Chainmail", icon: "shirt", color: "var(--info-blue)" },
    {
      slot: "Weapon",
      name: "Dawnbringer",
      icon: "sword",
      color: "var(--purple)",
      rarity: "Rare",
    },
    { slot: "Accessory", name: "Emerald Ring", icon: "gem", color: "var(--success-green)" },
  ],
};

export default function GamePage() {
  const [mobileTab, setMobileTab] = useState("story");

  const handleSubmit = (text: string) => {
    console.log("Submit:", text);
  };

  const handleQuickAction = (actionId: string) => {
    console.log("Quick action:", actionId);
  };

  const handleChoiceSelect = (choiceId: string) => {
    console.log("Choice:", choiceId);
  };

  return (
    <div className="flex h-full flex-col">
      {/* ===== Desktop Layout ===== */}
      <div className="hidden h-full flex-col lg:flex">
        <Header location="Abandoned Harbor" hud={MOCK_HUD} />
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column - Narrative */}
          <div className="flex flex-1 flex-col bg-[var(--bg-primary)]">
            <NarrativePanel
              messages={MOCK_MESSAGES}
              onChoiceSelect={handleChoiceSelect}
            />
            <InputSection
              onSubmit={handleSubmit}
              onQuickAction={handleQuickAction}
            />
          </div>

          {/* Right Column - Side Panel */}
          <SidePanel character={MOCK_CHARACTER} />
        </div>
      </div>

      {/* ===== Mobile Layout ===== */}
      <div className="flex h-full flex-col lg:hidden">
        <MobileHeader />
        <MobileLocationBar location="Abandoned Harbor" />
        <MobileHudBar hud={MOCK_HUD} />

        <div className="flex-1 overflow-y-auto">
          {mobileTab === "story" && (
            <NarrativePanel
              messages={MOCK_MESSAGES}
              onChoiceSelect={handleChoiceSelect}
            />
          )}
          {mobileTab === "character" && (
            <div className="p-4">
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
          />
        )}

        <MobileBottomNav activeTab={mobileTab} onTabChange={setMobileTab} />
      </div>
    </div>
  );
}
