"use client";

import { useState } from "react";
import { MapPin, Coins, Menu, Settings, Home } from "lucide-react";
import type { PlayerHud, WorldStateUI } from "@/types/game";
import type { LlmTokenStats } from "@/lib/api-client";
import { LlmSettingsModal } from "@/components/ui/LlmSettingsModal";
import { HeatGauge } from "@/components/hub/HeatGauge";
import { TimePhaseIndicator } from "@/components/hub/TimePhaseIndicator";
import { useGameStore } from "@/store/game-store";

interface HeaderProps {
  location: string;
  hud: PlayerHud;
  worldState?: WorldStateUI | null;
  llmStats?: (LlmTokenStats & { model: string | null }) | null;
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
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
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
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

export function Header({ location, hud, worldState, llmStats }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reset = useGameStore((s) => s.reset);

  return (
    <>
      <header className="flex h-16 w-full items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-8">
        {/* Logo — 클릭 시 타이틀 화면으로 */}
        <button
          onClick={() => setConfirmOpen(true)}
          className="flex cursor-pointer items-center gap-3 transition-opacity hover:opacity-80"
          aria-label="타이틀 화면으로 돌아가기"
        >
          <div className="flex h-9 w-9 items-center justify-center border border-[var(--gold)]">
            <span className="font-display text-sm font-bold text-[var(--gold)]">왕</span>
          </div>
          <span className="font-display text-lg tracking-[2px] text-[var(--text-primary)]">
            그림자의 왕국
          </span>
        </button>

        {/* Location + WorldState */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-[var(--text-muted)]" />
            <span className="font-display text-base text-[var(--text-secondary)]">
              {location}
            </span>
          </div>
          {worldState && (
            <>
              <div className="h-4 w-px bg-[var(--border-primary)]" />
              <TimePhaseIndicator timePhase={worldState.timePhase} />
              <HeatGauge worldState={worldState} />
            </>
          )}
        </div>

        {/* Player HUD + Settings */}
        <div className="flex items-center gap-6">
          <HpBar current={hud.hp} max={hud.maxHp} />
          <StaminaBar current={hud.stamina} max={hud.maxStamina} />
          <div className="flex items-center gap-1.5">
            <Coins size={14} className="text-[var(--gold)]" />
            <span className="text-sm font-semibold text-[var(--gold)]">
              {(hud.gold ?? 0).toLocaleString()}
            </span>
          </div>
          {llmStats && (
            <div className="flex items-center gap-1.5 rounded bg-[var(--bg-card)] px-2 py-1 font-mono text-[10px] text-[var(--text-muted)]" title={`model: ${llmStats.model ?? '?'}\nprompt: ${llmStats.prompt}\ncached: ${llmStats.cached}\ncompletion: ${llmStats.completion}\nlatency: ${llmStats.latencyMs}ms`}>
              <span>P:{llmStats.prompt}</span>
              <span className={llmStats.cached > 0 ? "text-[var(--stamina-green)]" : ""}>C:{llmStats.cached}</span>
              <span>{llmStats.latencyMs}ms</span>
            </div>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
            title="AI 모델 설정"
            aria-label="AI 모델 설정"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>
      <LlmSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {confirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onKeyDown={(e) => e.key === 'Escape' && setConfirmOpen(false)}>
          <div className="mx-4 w-full max-w-xs rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-6 shadow-2xl">
            <h3 id="confirm-title" className="mb-2 text-base font-bold text-[var(--text-primary)]">타이틀로 돌아가기</h3>
            <p className="mb-5 text-sm text-[var(--text-secondary)]">진행 중인 게임은 자동 저장됩니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)} className="flex-1 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">취소</button>
              <button onClick={() => { setConfirmOpen(false); reset(); }} className="flex-1 rounded bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110">확인</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface MobileHeaderProps {
  location?: string;
  visible?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function MobileHeader({ location, visible = true, activeTab, onTabChange }: MobileHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reset = useGameStore((s) => s.reset);

  return (
    <>
      <header
        className="fixed top-[env(safe-area-inset-top)] left-0 z-40 flex h-12 w-full items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 transition-transform duration-300 ease-in-out lg:hidden"
        style={{ transform: visible ? "translateY(0)" : "translateY(-100%)" }}
      >
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-md bg-[var(--bg-card)]"
          title="AI 모델 설정"
          aria-label="AI 모델 설정"
        >
          <Settings size={16} className="text-[var(--text-primary)]" />
        </button>
        <span className="font-display text-xs tracking-[1px] text-[var(--text-secondary)] truncate max-w-[60%] text-center">
          {location ?? ""}
        </span>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-md bg-[var(--bg-card)]"
          aria-label="메뉴 열기"
        >
          <Menu size={16} className="text-[var(--text-primary)]" />
        </button>
      </header>

      {/* 드롭다운 메뉴 */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-3 top-13 w-40 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] py-1 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {([
              { id: "story", label: "이야기", icon: "📖" },
              { id: "character", label: "캐릭터", icon: "👤" },
              { id: "inventory", label: "소지품", icon: "🎒" },
              { id: "quests", label: "퀘스트", icon: "📜" },
            ] as const).map((item) => (
              <button
                key={item.id}
                onClick={() => { onTabChange?.(item.id); setMenuOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                  activeTab === item.id
                    ? "bg-[var(--gold)]/10 text-[var(--gold)] font-semibold"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <div className="mx-2 my-1 border-t border-[var(--border-primary)]" />
            <button
              onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              aria-label="타이틀로 돌아가기"
            >
              <Home size={14} />
              <span>타이틀로 돌아가기</span>
            </button>
          </div>
        </div>
      )}

      <LlmSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {confirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80" role="alertdialog" aria-modal="true" aria-labelledby="mobile-confirm-title" onKeyDown={(e) => e.key === 'Escape' && setConfirmOpen(false)}>
          <div className="mx-4 w-full max-w-xs rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-6 shadow-2xl">
            <h3 id="mobile-confirm-title" className="mb-2 text-base font-bold text-[var(--text-primary)]">타이틀로 돌아가기</h3>
            <p className="mb-5 text-sm text-[var(--text-secondary)]">진행 중인 게임은 자동 저장됩니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)} className="flex-1 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">취소</button>
              <button onClick={() => { setConfirmOpen(false); reset(); }} className="flex-1 rounded bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110">확인</button>
            </div>
          </div>
        </div>
      )}
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
            style={{ width: `${hud.maxHp > 0 ? Math.round((hud.hp / hud.maxHp) * 100) : 0}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-[var(--stamina-green)]">STA</span>
        <div className="h-1.5 w-[60px] overflow-hidden rounded-full bg-[var(--border-primary)]">
          <div
            className="h-full rounded-full bg-[var(--stamina-green)]"
            style={{ width: `${hud.maxStamina > 0 ? Math.round((hud.stamina / hud.maxStamina) * 100) : 0}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Coins size={12} className="text-[var(--gold)]" />
        <span className="text-xs font-semibold text-[var(--gold)]">
          {(hud.gold ?? 0).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
