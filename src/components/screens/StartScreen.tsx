"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { useGameStore } from "@/store/game-store";
import { useAuthStore } from "@/store/auth-store";
import { PRESETS } from "@/data/presets";
import { TRAITS } from "@/data/traits";
import {
  getActiveCampaign,
  createCampaign,
  getAvailableScenarios,
  generatePortrait,
  uploadPortrait,
  type CampaignResponse,
  type ScenarioInfo,
} from "@/lib/api-client";
import PortraitCropModal from "@/components/ui/PortraitCropModal";
import { DimtaleLogoAnimated } from "@/components/brand/DimtaleLogoAnimated";
import type { CharacterPreset } from "@/types/game";
import {
  Sword,
  Eye,
  MessageCircle,
  Dice5,
  Droplets,
  Moon,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  ImageIcon,
  Loader2,
  Info,
  Users,
  Upload,
} from "lucide-react";

type ScreenPhase =
  | "TITLE"
  | "AUTH"
  | "SELECT_PRESET"
  | "CHARACTER_NAME"
  | "CHARACTER_PORTRAIT"
  | "CHARACTER_STATS"
  | "CHARACTER_TRAIT"
  | "CHARACTER_CONFIRM"
  | "CAMPAIGN"
  | "CAMPAIGN_SCENARIO"
  | "CAMPAIGN_PRESET";
type AuthTab = "login" | "register";
type Gender = "male" | "female";

// ---------------------------------------------------------------------------
// Trait icon mapping
// ---------------------------------------------------------------------------
const TRAIT_ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  sword: Sword,
  eye: Eye,
  "message-circle": MessageCircle,
  "dice-5": Dice5,
  droplets: Droplets,
  moon: Moon,
};

// ---------------------------------------------------------------------------
// Stat config
// ---------------------------------------------------------------------------

const STAT_LABELS: Record<string, string> = {
  MaxHP: "체력",
  str: "힘",
  dex: "민첩",
  wit: "재치",
  con: "체질",
  per: "통찰",
  cha: "카리스마",
};

const STAT_HINTS: Record<string, string> = {
  str: "전투 . 협박",
  dex: "잠입 . 절도 . 회피",
  wit: "조사 . 수색",
  con: "방어 . 저항 . 도움",
  per: "관찰 . 발견",
  cha: "설득 . 뇌물 . 거래",
};




// --- Portrait loading overlay with rotating messages + progress ---
const PORTRAIT_LOADING_MSGS = [
  "초상화를 그리는 중...",
  "붓에 잉크를 묻히는 중...",
  "얼굴의 윤곽을 잡는 중...",
  "눈빛에 깊이를 더하는 중...",
  "그림자를 입히는 중...",
  "마지막 세부 묘사 중...",
];

function PortraitLoadingOverlay() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % PORTRAIT_LOADING_MSGS.length);
    }, 3000);
    const progressTimer = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 90));
    }, 500);
    return () => { clearInterval(msgTimer); clearInterval(progressTimer); };
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
      <div className="flex flex-col items-center gap-4 px-6">
        <Loader2 size={36} className="animate-spin text-[var(--gold)]" />
        <span className="text-sm text-[var(--text-primary)] animate-pulse">
          {PORTRAIT_LOADING_MSGS[msgIdx]}
        </span>
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-[var(--border-primary)]">
          <div
            className="h-full rounded-full bg-[var(--gold)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}


// Stat descriptions for Step 4
const STAT_DESCRIPTIONS: Record<string, string> = {
  str: "전투와 위압 판정, 전투 공격력에 영향",
  dex: "은밀과 손재주 판정, 전투 회피/명중에 영향",
  wit: "조사와 분석 판정, 단서 발견에 직결",
  con: "인내와 봉사 판정, 전투 방어력에 영향",
  per: "관찰과 직감 판정, 숨겨진 상황 감지",
  cha: "설득과 거래 판정, NPC 정보 획득에 핵심",
};

const STAT_COLORS_MAP: Record<string, string> = {
  str: "var(--hp-red)",
  dex: "var(--gold)",
  wit: "var(--success-green)",
  con: "var(--info-blue)",
  per: "#c084fc",
  cha: "#f472b6",
};

const BONUS_POINTS_TOTAL = 6;
const STAT_KEYS = ["str", "dex", "wit", "con", "per", "cha"] as const;

// ---------------------------------------------------------------------------
// PresetCard
// ---------------------------------------------------------------------------

function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: CharacterPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  const itemsText = preset.startingItems
    .map((i) => (i.qty > 1 ? `${i.name} x${i.qty}` : i.name))
    .join(", ");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      className={`flex cursor-pointer flex-col overflow-hidden rounded-lg border text-left transition-all ${
        selected
          ? "border-[var(--gold)] bg-[rgba(201,169,98,0.08)] shadow-[0_0_20px_rgba(201,169,98,0.18)]"
          : "border-[var(--border-primary)] bg-[var(--bg-card)] hover:border-[rgba(201,169,98,0.4)] hover:bg-[rgba(201,169,98,0.04)]"
      }`}
    >
      <div className="flex flex-col gap-3 px-4 py-4">
        {/* Title */}
        <div>
          <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">{preset.name}</h3>
          <p className="text-sm text-[var(--gold)]">{preset.subtitle}</p>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{preset.description}</p>

        {/* Playstyle hint */}
        <p className="rounded-md bg-[var(--bg-secondary)] px-3 py-2 text-xs leading-relaxed text-[var(--text-muted)]">
          {preset.playstyleHint}
        </p>

        {/* Stat bars */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          {(["str", "dex", "wit", "con", "per", "cha"] as const).map((key) => {
            const value = preset.stats[key] ?? 0;
            const max = 18;
            const pct = Math.min(100, Math.round((value / max) * 100));
            const colors: Record<string, string> = {
              str: "var(--hp-red)", dex: "var(--gold)", wit: "var(--success-green)",
              con: "var(--info-blue)", per: "#c084fc", cha: "#f472b6",
            };
            return (
              <div key={key} className="flex items-center gap-1.5" title={STAT_HINTS[key]}>
                <span className="w-8 text-right font-semibold text-[var(--text-muted)]">{STAT_LABELS[key]}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[key] }} />
                </div>
                <span className="w-5 text-center font-medium text-[var(--text-secondary)]">{value}</span>
              </div>
            );
          })}
        </div>

        {/* Starting gold & items */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-primary)] pt-3 text-sm text-[var(--text-muted)]">
          <span className="text-[var(--gold)]">{preset.startingGold}G</span>
          {itemsText && (
            <>
              <span className="text-[var(--border-primary)]">|</span>
              <span>{itemsText}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RadarChart (SVG)
// ---------------------------------------------------------------------------

function RadarChart({
  baseStats,
  bonusStats,
  size = 200,
}: {
  baseStats: Record<string, number>;
  bonusStats: Record<string, number>;
  size?: number;
}) {
  const labels = ["STR", "DEX", "WIT", "CON", "PER", "CHA"];
  const keys = ["str", "dex", "wit", "con", "per", "cha"];
  const maxVal = 22; // max possible with bonus
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const ratio = Math.min(value / maxVal, 1);
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    };
  };

  const basePoints = keys.map((k, i) => getPoint(i, baseStats[k] ?? 0));
  const totalPoints = keys.map((k, i) => getPoint(i, (baseStats[k] ?? 0) + (bonusStats[k] ?? 0)));

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  // Grid lines
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Grid */}
      {gridLevels.map((level) => {
        const pts = Array.from({ length: 6 }, (_, i) => getPoint(i, maxVal * level));
        return (
          <polygon
            key={level}
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--border-primary)"
            strokeWidth={0.5}
          />
        );
      })}
      {/* Axis lines */}
      {Array.from({ length: 6 }, (_, i) => {
        const p = getPoint(i, maxVal);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border-primary)" strokeWidth={0.5} />;
      })}
      {/* Base fill */}
      <polygon points={basePoints.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(136,136,136,0.15)" stroke="rgba(136,136,136,0.4)" strokeWidth={1} />
      {/* Total fill (with bonus) */}
      <path d={toPath(totalPoints)} fill="rgba(201,169,98,0.2)" stroke="var(--gold)" strokeWidth={1.5} />
      {/* Dots */}
      {totalPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--gold)" />
      ))}
      {/* Labels */}
      {labels.map((label, i) => {
        const p = getPoint(i, maxVal * 1.22);
        return (
          <text
            key={label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--text-secondary)"
            fontSize={11}
            fontWeight={600}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// AuthForm
// ---------------------------------------------------------------------------

const SAVED_EMAIL_KEY = "graymar_saved_email";
const REMEMBER_EMAIL_KEY = "graymar_remember_email";

const EMAIL_DOMAINS = [
  "naver.com",
  "gmail.com",
  "kakao.com",
  "daum.net",
  "hanmail.net",
  "nate.com",
  "outlook.com",
  "icloud.com",
];

function EmailInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [showDomains, setShowDomains] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [filteredDomains, setFilteredDomains] = useState(EMAIL_DOMAINS);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const updateSuggestions = useCallback((email: string) => {
    const atIdx = email.indexOf("@");
    if (atIdx === -1 || atIdx === 0) {
      setShowDomains(false);
      return;
    }
    const typed = email.slice(atIdx + 1);
    if (EMAIL_DOMAINS.includes(typed)) {
      setShowDomains(false);
      return;
    }
    const filtered = typed
      ? EMAIL_DOMAINS.filter((d) => d.startsWith(typed.toLowerCase()))
      : EMAIL_DOMAINS;
    setFilteredDomains(filtered);
    setActiveIdx(0);
    setShowDomains(filtered.length > 0);
  }, []);

  const selectDomain = useCallback(
    (domain: string) => {
      const local = value.split("@")[0];
      onChange(`${local}@${domain}`);
      setShowDomains(false);
    },
    [value, onChange],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    updateSuggestions(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDomains) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % filteredDomains.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => (prev - 1 + filteredDomains.length) % filteredDomains.length);
    } else if (e.key === "Enter" && filteredDomains.length > 0) {
      e.preventDefault();
      selectDomain(filteredDomains[activeIdx]);
    } else if (e.key === "Escape") {
      setShowDomains(false);
    } else if (e.key === "Tab" && filteredDomains.length > 0) {
      e.preventDefault();
      selectDomain(filteredDomains[activeIdx]);
    }
  };

  useEffect(() => {
    if (!showDomains || !listRef.current) return;
    const active = listRef.current.children[activeIdx] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, showDomains]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDomains(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id="auth-email"
        name="email"
        type="text"
        inputMode="email"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        required
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => updateSuggestions(value)}
        placeholder="email@example.com"
        className="h-11 w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
      />
      {showDomains && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-40 overflow-y-auto rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] py-1 shadow-lg shadow-black/40"
        >
          {filteredDomains.map((domain, idx) => {
            const local = value.split("@")[0];
            return (
              <li
                key={domain}
                role="option"
                aria-selected={idx === activeIdx}
                onMouseDown={(e) => { e.preventDefault(); selectDomain(domain); }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`flex cursor-pointer items-center px-3 py-2 text-sm transition-colors ${
                  idx === activeIdx
                    ? "bg-[rgba(201,169,98,0.15)] text-[var(--gold)]"
                    : "text-[var(--text-secondary)] hover:bg-[rgba(201,169,98,0.08)]"
                }`}
              >
                <span className="text-[var(--text-muted)]">{local}@</span>
                <span className="font-medium">{domain}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    const remember = localStorage.getItem(REMEMBER_EMAIL_KEY) === "true";
    const saved = localStorage.getItem(SAVED_EMAIL_KEY);
    return remember && saved ? saved : "";
  });
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [rememberEmail, setRememberEmail] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(REMEMBER_EMAIL_KEY) === "true";
  });

  const authLogin = useAuthStore((s) => s.login);
  const authRegister = useAuthStore((s) => s.register);
  const authLoading = useAuthStore((s) => s.isLoading);
  const authError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const handleTabChange = (newTab: AuthTab) => {
    setTab(newTab);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rememberEmail) {
      localStorage.setItem(SAVED_EMAIL_KEY, email);
      localStorage.setItem(REMEMBER_EMAIL_KEY, "true");
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY);
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }

    if (tab === "login") {
      await authLogin(email, password);
    } else {
      await authRegister(email, password, nickname || undefined);
    }
    const { token } = useAuthStore.getState();
    if (token) {
      onSuccess();
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex border-b border-[var(--border-primary)]">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTabChange(t)}
            className={`flex-1 pb-3 text-center font-display text-sm tracking-wider transition-colors ${
              tab === t
                ? "border-b-2 border-[var(--gold)] text-[var(--gold)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {t === "login" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} autoComplete="on" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-xs text-[var(--text-muted)]">이메일</label>
          <EmailInput value={email} onChange={setEmail} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-password" className="text-xs text-[var(--text-muted)]">비밀번호</label>
          <input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            required
            minLength={tab === "register" ? 8 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tab === "register" ? "8자 이상" : "비밀번호"}
            className="h-11 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
          />
        </div>

        {tab === "register" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-nickname" className="text-xs text-[var(--text-muted)]">
              닉네임 <span className="text-[var(--text-muted)]">(선택)</span>
            </label>
            <input
              id="auth-nickname"
              name="nickname"
              type="text"
              autoComplete="username"
              maxLength={30}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="게임에서 사용할 이름"
              className="h-11 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
            />
          </div>
        )}

        {tab === "login" && (
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[var(--gold)]"
            />
            <span className="text-sm text-[var(--text-muted)]">이메일 저장</span>
          </label>
        )}

        {authError && <p className="text-sm text-[var(--hp-red)]">{authError}</p>}

        <button
          type="submit"
          disabled={authLoading}
          className="mt-2 flex h-12 items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-base tracking-[3px] text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)] disabled:opacity-50"
        >
          {authLoading ? "처리 중..." : tab === "login" ? "로그인" : "가입하기"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEP_LABELS = ["출신", "초상화", "이름", "스탯", "특성", "확인"];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              i < current
                ? "w-6 bg-[var(--gold)]"
                : i === current
                  ? "w-6 bg-[var(--gold)] opacity-60"
                  : "w-4 bg-[var(--border-primary)]"
            }`}
          />
          <span className={`text-[9px] leading-none ${
            i <= current ? "text-[var(--gold)]" : "text-[var(--text-muted)]"
          }`}>
            {STEP_LABELS[i] ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creation step layout wrapper
// ---------------------------------------------------------------------------

function CreationLayout({
  title,
  step,
  totalSteps,
  onBack,
  children,
  footer,
}: {
  title: string;
  step: number;
  totalSteps: number;
  onBack: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <div className="flex items-center gap-4 border-b border-[var(--border-primary)] px-4 py-3 sm:px-6">
        <button
          onClick={onBack}
          className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ChevronLeft size={18} className="inline" /> 뒤로
        </button>
        <h2 className="flex-1 font-display text-base text-[var(--text-primary)]">{title}</h2>
        <StepIndicator current={step} total={totalSteps} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">{children}</div>
      </div>
      {footer && (
        <div className="border-t border-[var(--border-primary)] px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-3xl">{footer}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StartScreen
// ---------------------------------------------------------------------------

function getPresetName(presetId: string): string {
  return PRESETS.find((p) => p.presetId === presetId)?.name ?? presetId;
}

export function StartScreen({ onParty }: { onParty?: () => void } = {}) {
  const startNewGame = useGameStore((s) => s.startNewGame);
  const startCampaignRun = useGameStore((s) => s.startCampaignRun);
  const phase = useGameStore((s) => s.phase);
  const isLoading = phase === "LOADING";
  const activeRunInfo = useGameStore((s) => s.activeRunInfo);
  const checkActiveRun = useGameStore((s) => s.checkActiveRun);
  const resumeRun = useGameStore((s) => s.resumeRun);

  const authToken = useAuthStore((s) => s.token);
  const authUser = useAuthStore((s) => s.user);
  const authLogout = useAuthStore((s) => s.logout);
  const gameReset = useGameStore((s) => s.reset);

  const [checkingRun, setCheckingRun] = useState(!!authToken);

  useEffect(() => {
    if (authToken) {
      setCheckingRun(true);
      checkActiveRun().finally(() => setCheckingRun(false));
    } else {
      setCheckingRun(false);
    }
  }, [authToken, checkActiveRun]);

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>("TITLE");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [selectedGenderState, setSelectedGenderState] = useState<Gender | null>(null);
  // DIMTALE 로고 드로잉 애니메이션 완료 여부 — 완료 전엔 메뉴/폼 비노출
  const [logoReady, setLogoReady] = useState(false);
  // screenPhase 가 TITLE/AUTH 로 전환될 때마다 로고 애니 재생을 위해 리셋
  useEffect(() => {
    if (screenPhase === "TITLE" || screenPhase === "AUTH") {
      setLogoReady(false);
    }
  }, [screenPhase]);

  // Character creation state
  const [characterName, setCharacterName] = useState("");
  const [bonusStats, setBonusStats] = useState<Record<string, number>>({});
  const [selectedTraitId, setSelectedTraitId] = useState<string | null>(null);
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [portraitLoading, setPortraitLoading] = useState(false);
  const [portraitGenCount, setPortraitGenCount] = useState(0);
  const [portraitDescription, setPortraitDescription] = useState("");
  const [showPortraitInput, setShowPortraitInput] = useState(false);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [portraitUploading, setPortraitUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [focusedStat, setFocusedStat] = useState<string | null>(null);

  // Campaign state
  const [activeCampaign, setActiveCampaign] = useState<CampaignResponse | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const selectedPreset = useMemo(
    () => PRESETS.find((p) => p.presetId === selectedPresetId) ?? null,
    [selectedPresetId],
  );
  const selectedGender = selectedGenderState;
  // 실제 API 호출 시 gender 기본값 (선택 안 했으면 male)
  const effectiveGender: Gender = selectedGender ?? "male";
  // 프리셋 + 성별 모두 선택됐는지
  const presetStepComplete = selectedPresetId !== null && selectedGender !== null;

  const bonusPointsUsed = useMemo(
    () => Object.values(bonusStats).reduce((sum, v) => sum + v, 0),
    [bonusStats],
  );
  const bonusPointsRemaining = BONUS_POINTS_TOTAL - bonusPointsUsed;

  // Reset creation state when going back to preset selection
  const resetCreationState = () => {
    setCharacterName("");
    setBonusStats({});
    setSelectedTraitId(null);
    setPortraitUrl(null);
    setPortraitGenCount(0);
    setPortraitDescription("");
    setShowPortraitInput(false);
    setPortraitError(null);
    setFocusedStat(null);
  };

  const handleStartGame = () => {
    if (!selectedPresetId) return;
    const opts: {
      characterName?: string;
      bonusStats?: Record<string, number>;
      traitId?: string;
      portraitUrl?: string;
    } = {};
    if (characterName.trim()) opts.characterName = characterName.trim();
    if (bonusPointsUsed > 0) opts.bonusStats = bonusStats;
    if (selectedTraitId) opts.traitId = selectedTraitId;
    if (portraitUrl) opts.portraitUrl = portraitUrl;
    // 캐릭터 정보를 localStorage에 저장 (새 게임 시 재사용 가능)
    try {
      localStorage.setItem('graymar_last_character', JSON.stringify({
        presetId: selectedPresetId,
        gender: effectiveGender,
        characterName: opts.characterName,
        bonusStats: opts.bonusStats,
        traitId: opts.traitId,
        portraitUrl: opts.portraitUrl,
      }));
    } catch { /* ignore */ }
    startNewGame(selectedPresetId, effectiveGender, Object.keys(opts).length > 0 ? opts : undefined);
  };

  // 이전 캐릭터 정보 복원
  const [lastCharacter, setLastCharacter] = useState<{
    presetId: string; gender: string;
    characterName?: string; bonusStats?: Record<string, number>;
    traitId?: string; portraitUrl?: string;
  } | null>(null);
  const [showNewGameChoice, setShowNewGameChoice] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('graymar_last_character');
      if (saved) setLastCharacter(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const handleNewGameClick = () => {
    if (lastCharacter) {
      setShowNewGameChoice(true);
    } else {
      setScreenPhase("SELECT_PRESET");
    }
  };

  const handleQuickStart = () => {
    setShowNewGameChoice(false);
    if (!lastCharacter) return;
    const opts: Record<string, unknown> = {};
    if (lastCharacter.characterName) opts.characterName = lastCharacter.characterName;
    if (lastCharacter.bonusStats) opts.bonusStats = lastCharacter.bonusStats;
    if (lastCharacter.traitId) opts.traitId = lastCharacter.traitId;
    if (lastCharacter.portraitUrl) opts.portraitUrl = lastCharacter.portraitUrl;
    startNewGame(lastCharacter.presetId, lastCharacter.gender as 'male' | 'female', Object.keys(opts).length > 0 ? opts as any : undefined);
  };

  const handleLogout = () => {
    authLogout();
    gameReset();
    setActiveCampaign(null);
    setCampaignName("");
    setScenarios([]);
    setSelectedScenarioId(null);
    setScreenPhase("TITLE");
    resetCreationState();
  };

  // Portrait generation
  const handleGeneratePortrait = async () => {
    if (!selectedPresetId || portraitGenCount >= 3) return;
    setPortraitLoading(true);
    setPortraitError(null);
    try {
      const result = await generatePortrait(selectedPresetId, effectiveGender, portraitDescription);
      // Next.js rewrites로 /portraits/generated/* 프록시 설정됨 → 상대 경로 사용
      setPortraitUrl(result.imageUrl);
      setPortraitGenCount((c) => c + 1);
      setShowPortraitInput(false);
    } catch (err) {
      setPortraitError(err instanceof Error ? err.message : "초상화 생성에 실패했습니다.");
    } finally {
      setPortraitLoading(false);
    }
  };

  // Portrait upload — 파일 선택 → 크롭 모달 표시
  const handleUploadPortrait = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPortraitError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 크롭 확인 → 서버 업로드
  const handleCropConfirm = async (croppedBlob: Blob) => {
    setCropImageSrc(null);
    setPortraitUploading(true);
    setPortraitError(null);
    try {
      const file = new File([croppedBlob], "portrait.webp", { type: "image/webp" });
      const result = await uploadPortrait(file);
      setPortraitUrl(result.imageUrl);
      setShowPortraitInput(false);
    } catch (err) {
      setPortraitError(
        err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.",
      );
    } finally {
      setPortraitUploading(false);
    }
  };

  // Campaign handlers
  const handleEnterCampaign = async () => {
    setCampaignLoading(true);
    setCampaignError(null);
    try {
      const campaign = await getActiveCampaign();
      setActiveCampaign(campaign);
      setScreenPhase("CAMPAIGN");
    } catch {
      setCampaignError("캠페인 조회에 실패했습니다.");
    } finally {
      setCampaignLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) return;
    setCampaignLoading(true);
    setCampaignError(null);
    try {
      const campaign = await createCampaign(campaignName.trim());
      setActiveCampaign(campaign);
      setCampaignName("");
      const scenarioList = await getAvailableScenarios(campaign.id);
      setScenarios(scenarioList);
      setScreenPhase("CAMPAIGN_SCENARIO");
    } catch {
      setCampaignError("캠페인 생성에 실패했습니다.");
    } finally {
      setCampaignLoading(false);
    }
  };

  const handleContinueCampaign = async () => {
    if (!activeCampaign) return;
    setCampaignLoading(true);
    setCampaignError(null);
    try {
      const scenarioList = await getAvailableScenarios(activeCampaign.id);
      setScenarios(scenarioList);
      setScreenPhase("CAMPAIGN_SCENARIO");
    } catch {
      setCampaignError("시나리오 목록 조회에 실패했습니다.");
    } finally {
      setCampaignLoading(false);
    }
  };

  const handleSelectScenario = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    const scenario = scenarios.find((s) => s.scenarioId === scenarioId);
    if (scenario && scenario.order === 1) {
      setScreenPhase("CAMPAIGN_PRESET");
    } else {
      if (activeCampaign) {
        startCampaignRun(activeCampaign.id, scenarioId, "DOCKWORKER", "male");
      }
    }
  };

  const handleStartCampaignWithPreset = () => {
    if (!selectedPresetId || !activeCampaign || !selectedScenarioId) return;
    startCampaignRun(
      activeCampaign.id,
      selectedScenarioId,
      selectedPresetId,
      effectiveGender,
    );
  };

  // =========================================================================
  // AUTH
  // =========================================================================
  if (screenPhase === "AUTH") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[var(--bg-primary)] px-4">
        <div className="flex flex-col items-center gap-2">
          <DimtaleLogoAnimated width={220} height={88} onReady={() => setLogoReady(true)} />
          <h1 className="sr-only">DimTale</h1>
        </div>
        <div
          className="w-full overflow-hidden"
          style={{
            maxHeight: logoReady ? 600 : 0,
            opacity: logoReady ? 1 : 0,
            pointerEvents: logoReady ? "auto" : "none",
            transition:
              "max-height 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease 0.15s",
          }}
        >
          <div className="flex w-full flex-col items-center gap-8 pt-8">
            <AuthForm onSuccess={() => setScreenPhase("TITLE")} />
            <button
              onClick={() => setScreenPhase("TITLE")}
              className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
            >
              &larr; 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TITLE
  // =========================================================================
  if (screenPhase === "TITLE") {
    const isLoggedIn = !!authToken;
    const displayName = authUser?.nickname ?? authUser?.email ?? "";

    return (
      <div className="flex h-full flex-col items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <DimtaleLogoAnimated width={320} height={128} onReady={() => setLogoReady(true)} />
          <h1 className="sr-only">DimTale</h1>
          <p
            className="max-w-sm text-center text-sm leading-relaxed text-[var(--text-muted)] transition-opacity duration-500"
            style={{ opacity: logoReady ? 1 : 0 }}
          >
            AI가 만들어내는 살아있는 판타지 세계.
            <br />
            당신의 선택이 이야기를 바꿉니다.
          </p>
        </div>

        <div
          className="w-full overflow-hidden"
          style={{
            maxHeight: logoReady ? 600 : 0,
            opacity: logoReady ? 1 : 0,
            pointerEvents: logoReady ? "auto" : "none",
            transition:
              "max-height 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease 0.15s",
          }}
        >
          <div className="flex w-full flex-col items-center gap-4 px-6 pt-12">
          {isLoggedIn ? (
            checkingRun ? (
              <div className="flex gap-1.5 py-6">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]"
                    style={{
                      animation: "dotPulse 1.2s ease-in-out infinite",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <>
                <div
                  className="mb-2"
                  style={{ animation: "fadeSlideIn 0.4s ease-out forwards", opacity: 0 }}
                >
                  <p className="text-sm text-[var(--text-secondary)]">
                    <span className="text-[var(--gold)]">{displayName}</span> 님, 환영합니다
                  </p>
                </div>

                {activeRunInfo && (
                  <div
                    className="w-full max-w-64"
                    style={{
                      animation: "fadeSlideIn 0.4s ease-out forwards",
                      animationDelay: "0.1s",
                      opacity: 0,
                    }}
                  >
                    <button
                      onClick={() => resumeRun()}
                      disabled={isLoading}
                      className="flex h-14 w-full flex-col items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)] disabled:opacity-50"
                    >
                      <span className="text-lg tracking-[3px]">이어하기</span>
                      <span className="text-xs opacity-70">
                        {getPresetName(activeRunInfo.presetId)} · 턴 {activeRunInfo.currentTurnNo}
                      </span>
                    </button>
                  </div>
                )}
                <div
                  className="w-full max-w-64"
                  style={{
                    animation: "fadeSlideIn 0.4s ease-out forwards",
                    animationDelay: activeRunInfo ? "0.2s" : "0.1s",
                    opacity: 0,
                  }}
                >
                  <button
                    onClick={handleNewGameClick}
                    disabled={isLoading}
                    className="flex h-14 w-full items-center justify-center border border-[var(--gold)] bg-transparent font-display text-lg tracking-[3px] text-[var(--gold)] transition-all hover:bg-[var(--gold)] hover:text-[var(--bg-primary)] disabled:opacity-50"
                  >
                    새 게임
                  </button>
                </div>
                {/* 캠페인 버튼 — 시나리오 2+ 준비될 때까지 숨김 */}
                {onParty && (
                  <div
                    className="w-full max-w-64"
                    style={{
                      animation: "fadeSlideIn 0.4s ease-out forwards",
                      animationDelay: activeRunInfo ? "0.35s" : "0.25s",
                      opacity: 0,
                    }}
                  >
                    <button
                      onClick={onParty}
                      disabled={isLoading}
                      className="flex h-14 w-full items-center justify-center gap-2 border border-[var(--text-muted)] bg-transparent font-display text-lg tracking-[3px] text-[var(--text-secondary)] transition-all hover:border-[var(--gold)] hover:text-[var(--gold)] disabled:opacity-50"
                    >
                      <Users size={18} />
                      파티
                    </button>
                  </div>
                )}
                <div
                  style={{
                    animation: "fadeSlideIn 0.4s ease-out forwards",
                    animationDelay: activeRunInfo ? (onParty ? "0.45s" : "0.4s") : (onParty ? "0.35s" : "0.3s"),
                    opacity: 0,
                  }}
                >
                  <button
                    onClick={handleLogout}
                    className="mt-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
                  >
                    로그아웃
                  </button>
                </div>

                {/* 새 게임 선택 모달 */}
                {showNewGameChoice && lastCharacter && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowNewGameChoice(false)}>
                    <div className="mx-4 w-full max-w-sm rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-6" onClick={e => e.stopPropagation()}>
                      <h3 className="mb-4 text-center font-display text-lg text-[var(--gold)]">새 게임</h3>
                      <p className="mb-5 text-center text-sm text-[var(--text-secondary)]">
                        이전 캐릭터 <span className="text-[var(--gold)]">{lastCharacter.characterName || getPresetName(lastCharacter.presetId)}</span>(으)로 바로 시작하거나, 새 캐릭터를 생성할 수 있습니다.
                      </p>
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={handleQuickStart}
                          className="h-12 w-full rounded border border-[var(--gold)] bg-[var(--gold)] font-display tracking-wider text-[var(--bg-primary)] transition-all hover:shadow-[0_0_15px_rgba(201,169,98,0.3)]"
                        >
                          이전 캐릭터로 시작
                        </button>
                        <button
                          onClick={() => { setShowNewGameChoice(false); setScreenPhase("SELECT_PRESET"); }}
                          className="h-12 w-full rounded border border-[var(--border-primary)] font-display tracking-wider text-[var(--text-secondary)] transition-all hover:border-[var(--gold)] hover:text-[var(--gold)]"
                        >
                          새 캐릭터 생성
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <button
              onClick={() => setScreenPhase("AUTH")}
              className="flex h-14 w-full max-w-64 items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-lg tracking-[3px] text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)]"
            >
              시작하기
            </button>
          )}
        </div>
      </div>
      </div>
    );
  }

  // =========================================================================
  // CAMPAIGN
  // =========================================================================
  if (screenPhase === "CAMPAIGN") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8 bg-[var(--bg-primary)] px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center border-2 border-[var(--gold)]">
            <span className="font-display text-2xl font-bold text-[var(--gold)]">C</span>
          </div>
          <h1 className="font-display text-2xl tracking-[4px] text-[var(--text-primary)]">캠페인</h1>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-4">
          {activeCampaign ? (
            <>
              <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
                <p className="text-xs text-[var(--text-muted)]">진행 중인 캠페인</p>
                <p className="mt-1 font-display text-lg text-[var(--text-primary)]">{activeCampaign.name}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  시나리오 {activeCampaign.currentScenarioOrder}단계
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    {activeCampaign.status === "COMPLETED" ? "완료" : "진행 중"}
                  </span>
                </p>
              </div>
              <button
                onClick={handleContinueCampaign}
                disabled={campaignLoading || activeCampaign.status === "COMPLETED"}
                className="flex h-12 w-full items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-base tracking-[3px] text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)] disabled:opacity-50"
              >
                {campaignLoading ? "불러오는 중..." : "다음 시나리오 시작"}
              </button>
            </>
          ) : (
            <>
              <p className="text-center text-sm text-[var(--text-secondary)]">진행 중인 캠페인이 없습니다. 새 캠페인을 시작하세요.</p>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="campaign-name" className="text-xs text-[var(--text-muted)]">캠페인 이름</label>
                <input
                  id="campaign-name"
                  type="text"
                  maxLength={50}
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateCampaign(); }}
                  placeholder="나의 첫 번째 캠페인"
                  className="h-11 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
                />
              </div>
              <button
                onClick={handleCreateCampaign}
                disabled={campaignLoading || !campaignName.trim()}
                className="flex h-12 w-full items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-base tracking-[3px] text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)] disabled:opacity-50"
              >
                {campaignLoading ? "생성 중..." : "캠페인 생성"}
              </button>
            </>
          )}

          {campaignError && <p className="text-sm text-[var(--hp-red)]">{campaignError}</p>}
        </div>

        <button
          onClick={() => { setScreenPhase("TITLE"); setCampaignError(null); }}
          className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
        >
          &larr; 돌아가기
        </button>
      </div>
    );
  }

  // =========================================================================
  // CAMPAIGN_SCENARIO
  // =========================================================================
  if (screenPhase === "CAMPAIGN_SCENARIO") {
    return (
      <div className="flex h-full flex-col bg-[var(--bg-primary)]">
        <div className="flex items-center gap-4 border-b border-[var(--border-primary)] px-4 py-3 sm:px-6">
          <button
            onClick={() => setScreenPhase("CAMPAIGN")}
            className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            &larr; 뒤로
          </button>
          <h2 className="font-display text-base text-[var(--text-primary)]">
            시나리오 선택 -- {activeCampaign?.name}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {scenarios.length === 0 ? (
              <p className="text-center text-sm text-[var(--text-muted)]">사용 가능한 시나리오가 없습니다.</p>
            ) : (
              scenarios.map((scenario) => {
                const isAvailable = scenario.prerequisites.length === 0;
                return (
                  <button
                    key={scenario.scenarioId}
                    onClick={() => isAvailable && handleSelectScenario(scenario.scenarioId)}
                    disabled={!isAvailable || isLoading}
                    className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-all ${
                      isAvailable
                        ? "border-[var(--border-primary)] bg-[var(--bg-card)] hover:border-[var(--gold)] hover:bg-[rgba(201,169,98,0.04)]"
                        : "cursor-not-allowed border-[var(--border-primary)] bg-[var(--bg-secondary)] opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--gold)] font-display text-sm text-[var(--gold)]">
                        {scenario.order}
                      </span>
                      <h3 className="font-display text-lg text-[var(--text-primary)]">{scenario.name}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{scenario.description}</p>
                    {!isAvailable && (
                      <p className="text-xs text-[var(--text-muted)]">선행 시나리오를 먼저 완료해야 합니다.</p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CAMPAIGN_PRESET
  // =========================================================================
  if (screenPhase === "CAMPAIGN_PRESET") {
    return (
      <div className="flex h-full flex-col bg-[var(--bg-primary)]">
        <div className="flex items-center gap-4 border-b border-[var(--border-primary)] px-4 py-3 sm:px-6">
          <button
            onClick={() => { setScreenPhase("CAMPAIGN_SCENARIO"); setSelectedPresetId(null); setSelectedGenderState(null); }}
            className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            &larr; 뒤로
          </button>
          <h2 className="font-display text-base text-[var(--text-primary)]">용병의 과거를 선택하세요</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {PRESETS.map((preset) => (
              <PresetCard
                key={preset.presetId}
                preset={preset}
                selected={selectedPresetId === preset.presetId}
                onSelect={() => { setSelectedPresetId(preset.presetId); setSelectedGenderState(null); }}
              />
            ))}
          </div>
        </div>

        {/* Gender selection bar for campaign */}
        <div className="border-t-2 border-[var(--gold)]/30 bg-[var(--bg-card)] px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <span className="shrink-0 text-sm font-bold text-[var(--text-secondary)]">성별 <span className="text-[var(--hp-red)] text-xs">*필수</span></span>
            <div className="flex flex-1 gap-2">
              <button
                type="button"
                onClick={() => setSelectedGenderState("male")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md border-2 py-2.5 text-sm font-bold tracking-wider transition-all ${
                  selectedGender === "male"
                    ? "border-[#60A5FA] bg-[rgba(96,165,250,0.15)] text-[#60A5FA] shadow-[0_0_10px_rgba(96,165,250,0.2)]"
                    : "border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[#60A5FA]/50 hover:text-[#60A5FA]/70"
                }`}
              >
                <span className="text-lg">♂</span> 남성
              </button>
              <button
                type="button"
                onClick={() => setSelectedGenderState("female")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md border-2 py-2.5 text-sm font-bold tracking-wider transition-all ${
                  selectedGender === "female"
                    ? "border-[#F472B6] bg-[rgba(244,114,182,0.15)] text-[#F472B6] shadow-[0_0_10px_rgba(244,114,182,0.2)]"
                    : "border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[#F472B6]/50 hover:text-[#F472B6]/70"
                }`}
              >
                <span className="text-lg">♀</span> 여성
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border-primary)] px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <button
              onClick={handleStartCampaignWithPreset}
              disabled={!presetStepComplete || isLoading}
              className="flex h-12 w-full items-center justify-center border border-[var(--gold)] font-display text-lg tracking-[4px] transition-all disabled:opacity-30 disabled:cursor-not-allowed enabled:bg-[var(--gold)] enabled:text-[var(--bg-primary)] enabled:hover:shadow-[0_0_20px_rgba(201,169,98,0.3)]"
            >
              {isLoading ? "불러오는 중..." : "캠페인 시작"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Step 1: SELECT_PRESET (출신 + 성별)
  // =========================================================================
  if (screenPhase === "SELECT_PRESET") {
    return (
      <div className="flex h-full flex-col bg-[var(--bg-primary)]">
        <div className="flex items-center gap-4 border-b border-[var(--border-primary)] px-4 py-3 sm:px-6">
          <button
            onClick={() => { setScreenPhase("TITLE"); setSelectedPresetId(null); setSelectedGenderState(null); resetCreationState(); }}
            className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ChevronLeft size={18} className="inline" /> 뒤로
          </button>
          <h2 className="flex-1 font-display text-base text-[var(--text-primary)]">용병의 과거를 선택하세요</h2>
          <StepIndicator current={0} total={6} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
            {PRESETS.map((preset) => (
              <PresetCard
                key={preset.presetId}
                preset={preset}
                selected={selectedPresetId === preset.presetId}
                onSelect={() => { setSelectedPresetId(preset.presetId); setSelectedGenderState(null); }}
              />
            ))}
          </div>
        </div>

        {/* Bottom panel: 범례 + 성별 — 구분된 박스 */}
        <div className="border-t-2 border-[var(--gold)]/30 bg-[var(--bg-card)] px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-3xl flex flex-col gap-3">
            {/* 스탯 범례 */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
              <span><span className="font-semibold" style={{color:'var(--hp-red)'}}>힘</span> 전투/협박</span>
              <span><span className="font-semibold" style={{color:'var(--gold)'}}>민첩</span> 잠입/절도</span>
              <span><span className="font-semibold" style={{color:'var(--success-green)'}}>지력</span> 조사/수색</span>
              <span><span className="font-semibold" style={{color:'var(--info-blue)'}}>체질</span> 체력/저항</span>
              <span><span className="font-semibold" style={{color:'#c084fc'}}>지각</span> 관찰/탐색</span>
              <span><span className="font-semibold" style={{color:'#f472b6'}}>매력</span> 설득/거래</span>
            </div>

            {/* 성별 선택 */}
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-sm font-bold text-[var(--text-secondary)]">성별 <span className="text-[var(--hp-red)] text-xs">*필수</span></span>
              <div className="flex flex-1 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGenderState("male")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md border-2 py-2.5 text-sm font-bold tracking-wider transition-all ${
                    selectedGender === "male"
                      ? "border-[#60A5FA] bg-[rgba(96,165,250,0.15)] text-[#60A5FA] shadow-[0_0_10px_rgba(96,165,250,0.2)]"
                      : "border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[#60A5FA]/50 hover:text-[#60A5FA]/70"
                  }`}
                >
                  <span className="text-lg">♂</span> 남성
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGenderState("female")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md border-2 py-2.5 text-sm font-bold tracking-wider transition-all ${
                    selectedGender === "female"
                      ? "border-[#F472B6] bg-[rgba(244,114,182,0.15)] text-[#F472B6] shadow-[0_0_10px_rgba(244,114,182,0.2)]"
                      : "border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[#F472B6]/50 hover:text-[#F472B6]/70"
                  }`}
                >
                  <span className="text-lg">♀</span> 여성
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border-primary)] px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <button
              onClick={() => {
                if (!selectedPresetId) return;
                resetCreationState();
                setScreenPhase("CHARACTER_PORTRAIT");
              }}
              disabled={!presetStepComplete || isLoading}
              className="flex h-12 w-full items-center justify-center border border-[var(--gold)] font-display text-lg tracking-[4px] transition-all disabled:opacity-30 disabled:cursor-not-allowed enabled:bg-[var(--gold)] enabled:text-[var(--bg-primary)] enabled:hover:shadow-[0_0_20px_rgba(201,169,98,0.3)]"
            >
              다 음 <ChevronRight size={20} className="ml-2" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Step 3: CHARACTER_NAME
  // =========================================================================
  if (screenPhase === "CHARACTER_NAME") {
    return (
      <CreationLayout
        title="캐릭터 이름"
        step={2}
        totalSteps={6}
        onBack={() => setScreenPhase("CHARACTER_PORTRAIT")}
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => { setCharacterName(""); setScreenPhase("CHARACTER_STATS"); }}
              className="flex h-12 flex-1 items-center justify-center rounded-md border border-[var(--border-primary)] font-display text-sm tracking-wider text-[var(--text-muted)] transition-all hover:border-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              건너뛰기
            </button>
            <button
              onClick={() => setScreenPhase("CHARACTER_STATS")}
              className="flex h-12 flex-[2] items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-base tracking-[3px] text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)]"
            >
              다 음 <ChevronRight size={18} className="ml-1" />
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-8 py-8">
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm text-[var(--text-muted)]">{selectedPreset?.name} ({selectedGender === "male" ? "남" : selectedGender === "female" ? "여" : "미선택"})</p>
          </div>

          <div className="w-full max-w-sm">
            <label htmlFor="char-name" className="mb-2 block text-xs text-[var(--text-muted)]">
              캐릭터 이름 (선택사항)
            </label>
            <input
              id="char-name"
              type="text"
              maxLength={8}
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="h-14 w-full rounded-lg border-2 border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 text-center font-display text-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none transition-colors"
              autoFocus
            />
            <p className="mt-2 text-right text-xs text-[var(--text-muted)]">
              {characterName.length}/8
            </p>
          </div>

          <p className="max-w-sm text-center text-xs leading-relaxed text-[var(--text-muted)]">
            이름을 정하지 않으면 &quot;이름 없는 용병&quot;으로 불립니다.
          </p>
        </div>
      </CreationLayout>
    );
  }

  // =========================================================================
  // Step 2: CHARACTER_PORTRAIT
  // =========================================================================
  if (screenPhase === "CHARACTER_PORTRAIT") {
    const defaultPortrait = selectedPreset?.portraits?.[effectiveGender];
    const displayPortrait = portraitUrl || defaultPortrait;

    return (
      <CreationLayout
        title="초상화"
        step={1}
        totalSteps={6}
        onBack={() => setScreenPhase("SELECT_PRESET")}
        footer={
          <button
            onClick={() => setScreenPhase("CHARACTER_NAME")}
            className="flex h-12 w-full items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-base tracking-[3px] text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)]"
          >
            {portraitUrl ? "이 초상화로 진행" : "이 초상화로 진행"} <ChevronRight size={18} className="ml-1" />
          </button>
        }
      >
        <div className="flex flex-col items-center gap-6 py-4">
          {/* Description text */}
          <p className="text-center text-sm text-[var(--text-secondary)]">
            당신의 모습입니다. 원한다면 새로운 모습을 만들 수 있습니다.
          </p>

          {/* Portrait display -- 4:5 비율, 상단 정렬 */}
          <div className="relative aspect-[4/5] w-72 max-w-full overflow-hidden rounded-lg border-2 border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            {displayPortrait ? (
              portraitUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element -- AI-generated external URL */
                <img src={displayPortrait} alt="캐릭터 초상화" className="h-full w-full object-cover object-top" />
              ) : (
                <Image src={displayPortrait} alt="캐릭터 초상화" fill sizes="288px" className="object-cover object-top" />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon size={48} className="text-[var(--text-muted)]" />
              </div>
            )}
            {portraitLoading && <PortraitLoadingOverlay />}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-3 w-full max-w-sm">
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={portraitUploading}
                className="flex items-center gap-1.5 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload size={14} />
                {portraitUploading ? "처리 중..." : "내 이미지 업로드"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/gif"
                onChange={handleUploadPortrait}
                className="hidden"
              />
              <p className="text-[10px] text-[var(--text-muted)] text-center">
                JPEG, PNG, WebP, HEIC, GIF · 최대 20MB
              </p>
              {portraitUrl && (
                <button
                  onClick={() => { setPortraitUrl(null); }}
                  className="text-xs text-[var(--text-muted)] underline underline-offset-4 transition-colors hover:text-[var(--text-secondary)]"
                >
                  기본 초상화로 되돌리기
                </button>
              )}
            </>
          </div>

          {portraitError && (
            <p className="text-sm text-[var(--hp-red)]">{portraitError}</p>
          )}

          {cropImageSrc && (
            <PortraitCropModal
              imageSrc={cropImageSrc}
              onConfirm={handleCropConfirm}
              onCancel={() => setCropImageSrc(null)}
            />
          )}
        </div>
      </CreationLayout>
    );
  }

  // =========================================================================
  // Step 4: CHARACTER_STATS
  // =========================================================================
  if (screenPhase === "CHARACTER_STATS") {
    // 칭호: 스탯 합계(기본+보너스)가 임계값 이상이면 활성화
    const STAT_TITLES: Record<string, Array<{ threshold: number; title: string; desc: string }>> = {
      str: [
        { threshold: 14, title: "강력한 팔", desc: "웬만한 싸움은 주먹 한 방이면 된다." },
        { threshold: 18, title: "전투의 화신", desc: "적은 당신 앞에서 무릎을 꿇는다." },
      ],
      dex: [
        { threshold: 14, title: "날쌘 발", desc: "그림자처럼 빠르게 움직인다." },
        { threshold: 18, title: "유령 걸음", desc: "아무도 당신을 잡을 수 없다." },
      ],
      wit: [
        { threshold: 14, title: "예리한 눈", desc: "숨겨진 단서를 놓치지 않는다." },
        { threshold: 18, title: "천재 분석가", desc: "모든 퍼즐의 답이 보인다." },
      ],
      con: [
        { threshold: 14, title: "단단한 몸", desc: "웬만한 타격에도 끄떡없다." },
        { threshold: 18, title: "철벽", desc: "어떤 고통도 버텨낸다." },
      ],
      per: [
        { threshold: 12, title: "직감", desc: "남들이 놓치는 것을 본다." },
        { threshold: 16, title: "천리안", desc: "숨겨진 것은 없다." },
      ],
      cha: [
        { threshold: 14, title: "매력적인 화술", desc: "사람들이 자연스레 귀를 기울인다." },
        { threshold: 18, title: "타고난 지도자", desc: "모두가 당신을 따른다." },
      ],
    };
    const activeTitles = STAT_KEYS.map((key) => {
      const total = (selectedPreset?.stats[key] ?? 0) + (bonusStats[key] ?? 0);
      const tiers = STAT_TITLES[key] ?? [];
      // 가장 높은 임계값 달성한 칭호
      for (let i = tiers.length - 1; i >= 0; i--) {
        if (total >= tiers[i].threshold) return { key, ...tiers[i] };
      }
      return null;
    }).filter(Boolean) as Array<{ key: string; threshold: number; title: string; desc: string }>;

    return (
      <CreationLayout
        title="보너스 스탯 배분"
        step={3}
        totalSteps={6}
        onBack={() => setScreenPhase("CHARACTER_NAME")}
        footer={
          <button
            onClick={() => setScreenPhase("CHARACTER_TRAIT")}
            className="flex h-12 w-full items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-base tracking-[3px] text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)]"
          >
            다 음 <ChevronRight size={18} className="ml-1" />
          </button>
        }
      >
        <div className="flex flex-col gap-6">
          {/* Remaining points */}
          <div className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3">
            <span className="text-sm text-[var(--text-secondary)]">보너스 포인트</span>
            <div className="flex items-center gap-2">
              <span className={`font-display text-2xl font-bold ${bonusPointsRemaining > 0 ? "text-[var(--gold)]" : "text-[var(--text-muted)]"}`}>
                {bonusPointsRemaining}
              </span>
              <span className="text-sm text-[var(--text-muted)]">/ {BONUS_POINTS_TOTAL}</span>
            </div>
          </div>

          {/* Active titles */}
          {activeTitles.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {activeTitles.map((t) => (
                <div key={t.key} className="rounded-md border border-[rgba(201,169,98,0.3)] bg-[rgba(201,169,98,0.06)] px-4 py-2 text-sm">
                  <span className="font-bold text-[var(--gold)]">{t.title}</span>
                  <span className="ml-2 text-[var(--text-secondary)]">{t.desc}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stat rows */}
          <div className="flex flex-col gap-3">
            {STAT_KEYS.map((key) => {
              const baseVal = selectedPreset?.stats[key] ?? 0;
              const bonus = bonusStats[key] ?? 0;
              const total = baseVal + bonus;
              const canIncrease = bonusPointsRemaining > 0;
              const canDecrease = bonus > 0;

              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    focusedStat === key
                      ? "border-[var(--gold)] bg-[rgba(201,169,98,0.06)]"
                      : "border-[var(--border-primary)] bg-[var(--bg-card)]"
                  }`}
                  onClick={() => setFocusedStat(key)}
                >
                  {/* Color dot + label */}
                  <div className="flex items-center gap-2 w-20 sm:w-24">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: STAT_COLORS_MAP[key] }} />
                    <span className="font-display text-sm font-bold text-[var(--text-primary)]">
                      {STAT_LABELS[key]}
                    </span>
                  </div>

                  {/* Base value */}
                  <span className="w-6 text-center text-sm text-[var(--text-muted)]">{baseVal}</span>

                  {/* Bonus */}
                  {bonus > 0 && (
                    <span className="w-8 text-center text-sm font-bold text-[var(--gold)]">+{bonus}</span>
                  )}
                  {bonus === 0 && <span className="w-8" />}

                  {/* Total */}
                  <span className="w-8 text-center font-display text-lg font-bold text-[var(--text-primary)]">{total}</span>

                  {/* +/- buttons */}
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); if (canDecrease) setBonusStats((prev) => ({ ...prev, [key]: bonus - 1 })); }}
                      disabled={!canDecrease}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-primary)] text-[var(--text-muted)] transition-colors hover:border-[var(--text-secondary)] hover:text-[var(--text-secondary)] disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (canIncrease) setBonusStats((prev) => ({ ...prev, [key]: bonus + 1 })); }}
                      disabled={!canIncrease}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--gold)] text-[var(--gold)] transition-colors hover:bg-[rgba(201,169,98,0.1)] disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Focused stat description */}
          <div className="min-h-[48px] rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-3">
            {focusedStat ? (
              <div className="flex items-start gap-2">
                <Info size={14} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                <div>
                  <span className="text-sm font-bold" style={{ color: STAT_COLORS_MAP[focusedStat] }}>
                    {STAT_LABELS[focusedStat]}
                  </span>
                  <span className="ml-2 text-sm text-[var(--text-secondary)]">
                    {STAT_DESCRIPTIONS[focusedStat]}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">스탯을 클릭하면 설명을 볼 수 있습니다.</p>
            )}
          </div>
        </div>
      </CreationLayout>
    );
  }

  // =========================================================================
  // Step 5: CHARACTER_TRAIT
  // =========================================================================
  if (screenPhase === "CHARACTER_TRAIT") {
    return (
      <CreationLayout
        title="특성 선택"
        step={4}
        totalSteps={6}
        onBack={() => setScreenPhase("CHARACTER_STATS")}
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => { setSelectedTraitId(null); setScreenPhase("CHARACTER_CONFIRM"); }}
              className="flex h-12 flex-1 items-center justify-center rounded-md border border-[var(--border-primary)] font-display text-sm tracking-wider text-[var(--text-muted)] transition-all hover:border-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              건너뛰기
            </button>
            <button
              onClick={() => setScreenPhase("CHARACTER_CONFIRM")}
              disabled={!selectedTraitId}
              className="flex h-12 flex-[2] items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-base tracking-[3px] text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              다 음 <ChevronRight size={18} className="ml-1" />
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-secondary)]">
            캐릭터에게 부여할 특성을 하나 선택하세요. 특성은 판정과 게임플레이에 영향을 줍니다.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TRAITS.map((trait) => {
              const isSelected = selectedTraitId === trait.traitId;
              const IconComp = TRAIT_ICON_MAP[trait.icon];
              return (
                <button
                  key={trait.traitId}
                  onClick={() => setSelectedTraitId(isSelected ? null : trait.traitId)}
                  className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-all ${
                    isSelected
                      ? "border-[var(--gold)] bg-[rgba(201,169,98,0.08)] shadow-[0_0_16px_rgba(201,169,98,0.15)]"
                      : "border-[var(--border-primary)] bg-[var(--bg-card)] hover:border-[rgba(201,169,98,0.4)] hover:bg-[rgba(201,169,98,0.04)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isSelected ? "bg-[rgba(201,169,98,0.2)]" : "bg-[var(--bg-secondary)]"}`}>
                      {IconComp ? (
                        <IconComp size={20} className={isSelected ? "text-[var(--gold)]" : "text-[var(--text-muted)]"} />
                      ) : (
                        <span className="text-lg">{trait.icon}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-display text-sm font-bold ${isSelected ? "text-[var(--gold)]" : "text-[var(--text-primary)]"}`}>
                        {trait.name}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">{trait.description}</p>
                    </div>
                    {isSelected && <Check size={18} className="text-[var(--gold)]" />}
                  </div>
                  <div className={`rounded-md px-3 py-2 text-xs ${isSelected ? "bg-[rgba(201,169,98,0.1)]" : "bg-[var(--bg-secondary)]"}`}>
                    <div className={`mb-1 font-bold ${isSelected ? "text-[var(--gold)]" : "text-[var(--text-secondary)]"}`}>
                      {trait.effectSummary}
                    </div>
                    {isSelected && trait.effectDetails && (
                      <ul className="flex flex-col gap-0.5 text-[var(--text-secondary)]">
                        {trait.effectDetails.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </CreationLayout>
    );
  }

  // =========================================================================
  // Step 6: CHARACTER_CONFIRM
  // =========================================================================
  if (screenPhase === "CHARACTER_CONFIRM") {
    const preset = selectedPreset;
    const trait = TRAITS.find((t) => t.traitId === selectedTraitId);
    const displayName = characterName.trim() || "이름 없는 용병";
    const displayPortrait = portraitUrl || preset?.portraits?.[effectiveGender];
    const itemsText = preset?.startingItems.map((i) => (i.qty > 1 ? `${i.name} x${i.qty}` : i.name)).join(", ") ?? "";

    return (
      <CreationLayout
        title="캐릭터 확인"
        step={5}
        totalSteps={6}
        onBack={() => setScreenPhase("CHARACTER_TRAIT")}
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setScreenPhase("SELECT_PRESET")}
              className="flex h-12 flex-1 items-center justify-center rounded-md border border-[var(--border-primary)] font-display text-sm tracking-wider text-[var(--text-muted)] transition-all hover:border-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              수정하기
            </button>
            <button
              onClick={handleStartGame}
              disabled={isLoading}
              className="flex h-12 flex-[2] items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-lg tracking-[4px] text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)] disabled:opacity-50"
            >
              {isLoading ? "불러오는 중..." : "모험 시작"}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {/* Top: portrait + name + preset info */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            {/* Portrait */}
            <div className="relative aspect-[4/5] w-36 shrink-0 overflow-hidden rounded-lg border-2 border-[var(--gold)] bg-[var(--bg-secondary)]">
              {displayPortrait ? (
                portraitUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- AI-generated external URL */
                  <img src={displayPortrait} alt={displayName} className="h-full w-full object-cover object-top" />
                ) : (
                  <Image src={displayPortrait} alt={displayName} fill sizes="144px" className="object-cover object-top" />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="font-display text-4xl text-[var(--text-muted)]">{displayName[0]}</span>
                </div>
              )}
            </div>

            {/* Name + tags */}
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <h3 className="font-display text-2xl font-bold text-[var(--text-primary)]">{displayName}</h3>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md border border-[var(--gold)] bg-[rgba(201,169,98,0.1)] px-2.5 py-1 text-xs font-bold text-[var(--gold)]">
                  {preset?.name}
                </span>
                <span className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
                  {effectiveGender === "male" ? "남성" : "여성"}
                </span>
                {trait && (
                  <span className="rounded-md border border-[rgba(201,169,98,0.4)] bg-[rgba(201,169,98,0.06)] px-2.5 py-1 text-xs text-[var(--gold)]">
                    {trait.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{preset?.description}</p>
            </div>
          </div>

          {/* Radar chart */}
          <div className="flex flex-col items-center gap-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-6">
            <h4 className="font-display text-sm font-bold text-[var(--text-secondary)]">능력치</h4>
            <RadarChart
              baseStats={preset?.stats ?? {}}
              bonusStats={bonusStats}
              size={220}
            />
            {/* Stat summary row */}
            <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-6">
              {STAT_KEYS.map((key) => {
                const base = preset?.stats[key] ?? 0;
                const bonus = bonusStats[key] ?? 0;
                return (
                  <div key={key} className="flex flex-col items-center gap-0.5 rounded-md bg-[var(--bg-secondary)] px-2 py-2">
                    <span className="text-[10px] font-bold" style={{ color: STAT_COLORS_MAP[key] }}>
                      {STAT_LABELS[key]}
                    </span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-display text-lg font-bold text-[var(--text-primary)]">{base + bonus}</span>
                      {bonus > 0 && (
                        <span className="text-xs font-bold text-[var(--gold)]">+{bonus}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trait + items + gold */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Trait */}
            {trait && (
              <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
                <h4 className="mb-2 text-xs font-bold text-[var(--text-muted)]">특성</h4>
                <div className="flex items-center gap-3">
                  {(() => {
                    const IC = TRAIT_ICON_MAP[trait.icon];
                    return IC ? <IC size={20} className="text-[var(--gold)]" /> : <span>{trait.icon}</span>;
                  })()}
                  <div>
                    <p className="font-display text-sm font-bold text-[var(--gold)]">{trait.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{trait.effectSummary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Starting items & gold */}
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
              <h4 className="mb-2 text-xs font-bold text-[var(--text-muted)]">시작 장비</h4>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-[var(--gold)]">{preset?.startingGold ?? 0}G</p>
                {itemsText && <p className="text-sm text-[var(--text-secondary)]">{itemsText}</p>}
              </div>
            </div>
          </div>
        </div>
      </CreationLayout>
    );
  }

  // Fallback (should not reach here)
  return null;
}
