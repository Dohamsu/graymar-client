"use client";

import { useState } from "react";
import { MapPin, Coins, Menu, Settings } from "lucide-react";
import type { PlayerHud } from "@/types/game";
import { LlmSettingsModal } from "@/components/ui/LlmSettingsModal";

interface HeaderProps {
  location: string;
  hud: PlayerHud;
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.round((current / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold text-[var(--hp-red)]">HP</span>
      <div className="h-[6px] w-[80px] overflow-hidden rounded-full bg-[var(--border-primary)]">
        <div
          className="h-full rounded-full bg-[var(--hp-red)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-[var(--text-secondary)]">
        {current}/{max}
      </span>
    </div>
  );
}

function StaminaBar({ current, max }: { current: number; max: number }) {
  const pct = Math.round((current / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold text-[var(--stamina-green)]">STA</span>
      <div className="h-[6px] w-[60px] overflow-hidden rounded-full bg-[var(--border-primary)]">
        <div
          className="h-full rounded-full bg-[var(--stamina-green)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-[var(--text-secondary)]">
        {current}/{max}
      </span>
    </div>
  );
}

export function Header({ location, hud }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="flex h-16 w-full items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border border-[var(--gold)]">
            <span className="font-display text-sm font-bold text-[var(--gold)]">R</span>
          </div>
          <span className="font-display text-lg tracking-[2px] text-[var(--text-primary)]">
            그림자의 왕국
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-[var(--text-muted)]" />
          <span className="font-display text-base text-[var(--text-secondary)]">
            {location}
          </span>
        </div>

        {/* Player HUD + Settings */}
        <div className="flex items-center gap-6">
          <HpBar current={hud.hp} max={hud.maxHp} />
          <StaminaBar current={hud.stamina} max={hud.maxStamina} />
          <div className="flex items-center gap-1.5">
            <Coins size={14} className="text-[var(--gold)]" />
            <span className="text-sm font-semibold text-[var(--gold)]">
              {hud.gold.toLocaleString()}
            </span>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
            title="AI 모델 설정"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>
      <LlmSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

export function MobileHeader() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 w-full items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center border border-[var(--gold)]">
            <span className="font-display text-xs font-bold text-[var(--gold)]">R</span>
          </div>
          <span className="font-display text-sm tracking-[1px] text-[var(--text-primary)]">
            왕국
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--bg-card)]"
            title="AI 모델 설정"
          >
            <Settings size={16} className="text-[var(--text-primary)]" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--bg-card)]">
            <Menu size={18} className="text-[var(--text-primary)]" />
          </button>
        </div>
      </header>
      <LlmSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

export function MobileLocationBar({ location }: { location: string }) {
  return (
    <div className="flex h-10 w-full items-center justify-center gap-2 bg-[var(--bg-secondary)]">
      <MapPin size={14} className="text-[var(--text-muted)]" />
      <span className="font-display text-sm text-[var(--text-secondary)]">{location}</span>
    </div>
  );
}

export function MobileHudBar({ hud }: { hud: PlayerHud }) {
  return (
    <div className="flex w-full items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-[var(--hp-red)]">HP</span>
        <div className="h-1.5 w-[60px] overflow-hidden rounded-full bg-[var(--border-primary)]">
          <div
            className="h-full rounded-full bg-[var(--hp-red)]"
            style={{ width: `${Math.round((hud.hp / hud.maxHp) * 100)}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-[var(--stamina-green)]">STA</span>
        <div className="h-1.5 w-[60px] overflow-hidden rounded-full bg-[var(--border-primary)]">
          <div
            className="h-full rounded-full bg-[var(--stamina-green)]"
            style={{ width: `${Math.round((hud.stamina / hud.maxStamina) * 100)}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Coins size={12} className="text-[var(--gold)]" />
        <span className="text-xs font-semibold text-[var(--gold)]">
          {hud.gold.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
