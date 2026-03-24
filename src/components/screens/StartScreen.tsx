"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useGameStore } from "@/store/game-store";
import { useAuthStore } from "@/store/auth-store";
import { PRESETS } from "@/data/presets";
import { STAT_ACTION_HINTS } from "@/data/stat-descriptions";
import { StatTooltip } from "@/components/ui/StatTooltip";
import {
  getActiveCampaign,
  createCampaign,
  getAvailableScenarios,
  type CampaignResponse,
  type ScenarioInfo,
} from "@/lib/api-client";
import type { CharacterPreset } from "@/types/game";

type ScreenPhase = "TITLE" | "AUTH" | "SELECT_PRESET" | "CAMPAIGN" | "CAMPAIGN_SCENARIO" | "CAMPAIGN_PRESET";
type AuthTab = "login" | "register";
type Gender = "male" | "female";

// ---------------------------------------------------------------------------
// 스탯 → 간략 요약 ("체력 높음 · 회피 낮음" 형태)
// ---------------------------------------------------------------------------

// 6개 기본 스탯 기준 (Living World v2)
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
  str: "전투 · 협박",
  dex: "잠입 · 절도 · 회피",
  wit: "조사 · 수색",
  con: "방어 · 저항 · 도움",
  per: "관찰 · 발견",
  cha: "설득 · 뇌물 · 거래",
};

const STAT_THRESHOLDS: Record<string, [number, number, number]> = {
  MaxHP: [110, 95, 85],
  str: [14, 11, 9],
  dex: [10, 7, 6],
  wit: [9, 7, 5],
  con: [12, 10, 8],
  per: [9, 7, 5],
  cha: [9, 7, 5],
};

type StatGrade = "매우 높음" | "높음" | "보통" | "낮음";

function getStatGrade(key: string, value: number): StatGrade {
  const thresholds = STAT_THRESHOLDS[key];
  if (!thresholds) return "보통";
  if (value >= thresholds[0]) return "매우 높음";
  if (value >= thresholds[1]) return "높음";
  if (value >= thresholds[2]) return "보통";
  return "낮음";
}

const SUMMARY_STATS = ["MaxHP", "str", "dex", "wit", "con", "per", "cha"] as const;

/** 눈에 띄는 스탯만 뽑아서 한 줄 요약 ("힘 높음 · 민첩 낮음") */
function buildStatSummary(stats: CharacterPreset["stats"]): Array<{ key: string; label: string; grade: StatGrade; hint?: string }> {
  const items: Array<{ key: string; label: string; grade: StatGrade; hint?: string }> = [];
  for (const key of SUMMARY_STATS) {
    const grade = getStatGrade(key, stats[key] ?? 0);
    if (grade === "매우 높음" || grade === "높음" || grade === "낮음") {
      items.push({ key, label: STAT_LABELS[key], grade, hint: STAT_HINTS[key] });
    }
  }
  return items;
}

const GRADE_COLOR: Record<StatGrade, string> = {
  "매우 높음": "text-[var(--gold)]",
  "높음": "text-[var(--text-primary)]",
  "보통": "text-[var(--text-secondary)]",
  "낮음": "text-[var(--text-muted)]",
};

// ---------------------------------------------------------------------------
// PresetCard
// ---------------------------------------------------------------------------

function PresetCard({
  preset,
  selected,
  gender,
  onSelect,
  onGenderChange,
}: {
  preset: CharacterPreset;
  selected: boolean;
  gender: Gender;
  onSelect: () => void;
  onGenderChange: (g: Gender) => void;
}) {
  const itemsText = preset.startingItems
    .map((i) => (i.qty > 1 ? `${i.name} x${i.qty}` : i.name))
    .join(", ");

  const portraitSrc = preset.portraits?.[gender];
  const statSummary = buildStatSummary(preset.stats);

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
      {/* Portrait */}
      {portraitSrc ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Image
            src={portraitSrc}
            alt={`${preset.name} ${gender === "male" ? "남" : "여"}`}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          {/* 하단 그라데이션 오버레이 */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
          {/* 이름 오버레이 */}
          <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
            <h3 className="font-display text-xl font-bold text-[var(--text-primary)] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {preset.name}
            </h3>
            <p className="text-sm text-[var(--gold)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {preset.subtitle}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex aspect-[5/3] w-full items-center justify-center bg-[var(--bg-secondary)]">
          <div className="flex flex-col items-center gap-1">
            <span className="font-display text-5xl text-[var(--text-muted)]">
              {preset.name[0]}
            </span>
            <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">
              {preset.name}
            </h3>
            <p className="text-sm text-[var(--gold)]">{preset.subtitle}</p>
          </div>
        </div>
      )}

      {/* 카드 하단 정보 */}
      <div className="flex flex-col gap-3 px-4 py-4">
        {/* 성별 선택 — border-2 고정으로 레이아웃 shift 방지 */}
        {preset.portraits && (
          <div
            className="flex gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {(["male", "female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenderChange(g);
                  onSelect();
                }}
                className={`flex-1 rounded-md border-2 py-2.5 text-sm font-bold tracking-wider transition-colors ${
                  gender === g
                    ? "border-[var(--gold)] bg-[rgba(201,169,98,0.15)] text-[var(--gold)]"
                    : "border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[rgba(201,169,98,0.4)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {g === "male" ? "남성" : "여성"}
              </button>
            ))}
          </div>
        )}

        {/* 설명 */}
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {preset.description}
        </p>

        {/* 스탯 바 그래프 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          {(["str", "dex", "wit", "con", "per", "cha"] as const).map((key) => {
            const value = preset.stats[key] ?? 0;
            const max = 18;
            const pct = Math.min(100, Math.round((value / max) * 100));
            const colors: Record<string, string> = {
              str: 'var(--hp-red)', dex: 'var(--gold)', wit: 'var(--success-green)',
              con: 'var(--info-blue)', per: '#c084fc', cha: '#f472b6',
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

        {/* 골드 & 아이템 */}
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

// ---------------------------------------------------------------------------
// EmailInput — @ 입력 시 도메인 자동완성 드롭다운
// ---------------------------------------------------------------------------

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

  // @ 이후 입력에 따라 필터링
  const updateSuggestions = useCallback((email: string) => {
    const atIdx = email.indexOf("@");
    if (atIdx === -1 || atIdx === 0) {
      setShowDomains(false);
      return;
    }
    const typed = email.slice(atIdx + 1);
    // @ 뒤에 완전한 도메인이 이미 있으면 닫기
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

  // 활성 항목 스크롤
  useEffect(() => {
    if (!showDomains || !listRef.current) return;
    const active = listRef.current.children[activeIdx] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, showDomains]);

  // 외부 클릭 시 닫기
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
        className="h-11 w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectDomain(domain);
                }}
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
    // 이메일 저장 처리
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
    // 성공 여부는 store의 token으로 판단
    const { token } = useAuthStore.getState();
    if (token) {
      onSuccess();
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Tabs */}
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

      {/* Form */}
      <form onSubmit={handleSubmit} autoComplete="on" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-xs text-[var(--text-muted)]">
            이메일
          </label>
          <EmailInput value={email} onChange={setEmail} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-password" className="text-xs text-[var(--text-muted)]">
            비밀번호
          </label>
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
            className="h-11 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
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
              className="h-11 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
            />
          </div>
        )}

        {/* 이메일 저장 체크박스 (로그인 탭에서만) */}
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

        {/* Error */}
        {authError && (
          <p className="text-sm text-[var(--hp-red)]">{authError}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={authLoading}
          className="mt-2 flex h-12 items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-base tracking-[3px] text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)] disabled:opacity-50"
        >
          {authLoading
            ? "처리 중..."
            : tab === "login"
              ? "로그인"
              : "가입하기"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StartScreen
// ---------------------------------------------------------------------------

/** presetId → 프리셋 이름 */
function getPresetName(presetId: string): string {
  return PRESETS.find((p) => p.presetId === presetId)?.name ?? presetId;
}

export function StartScreen() {
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

  useEffect(() => {
    if (authToken) checkActiveRun();
  }, [authToken, checkActiveRun]);

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>("TITLE");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [genderMap, setGenderMap] = useState<Record<string, Gender>>({});

  // Campaign state
  const [activeCampaign, setActiveCampaign] = useState<CampaignResponse | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const handleStartGame = () => {
    if (!selectedPresetId) return;
    startNewGame(selectedPresetId, genderMap[selectedPresetId] ?? "male");
  };

  const handleLogout = () => {
    authLogout();
    gameReset();
    setActiveCampaign(null);
    setCampaignName("");
    setScenarios([]);
    setSelectedScenarioId(null);
    setScreenPhase("TITLE");
  };

  // Campaign: enter campaign mode
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

  // Campaign: create new
  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) return;
    setCampaignLoading(true);
    setCampaignError(null);
    try {
      const campaign = await createCampaign(campaignName.trim());
      setActiveCampaign(campaign);
      setCampaignName("");
      // Load scenarios for the new campaign
      const scenarioList = await getAvailableScenarios(campaign.id);
      setScenarios(scenarioList);
      setScreenPhase("CAMPAIGN_SCENARIO");
    } catch {
      setCampaignError("캠페인 생성에 실패했습니다.");
    } finally {
      setCampaignLoading(false);
    }
  };

  // Campaign: load scenarios for existing campaign
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

  // Campaign: select scenario -> go to preset selection (first scenario) or start directly
  const handleSelectScenario = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    // First scenario needs preset selection
    const scenario = scenarios.find((s) => s.scenarioId === scenarioId);
    if (scenario && scenario.order === 1) {
      setScreenPhase("CAMPAIGN_PRESET");
    } else {
      // Subsequent scenarios: start directly with existing character
      if (activeCampaign) {
        startCampaignRun(activeCampaign.id, scenarioId, "DOCKWORKER", "male");
      }
    }
  };

  // Campaign: start with preset
  const handleStartCampaignWithPreset = () => {
    if (!selectedPresetId || !activeCampaign || !selectedScenarioId) return;
    startCampaignRun(
      activeCampaign.id,
      selectedScenarioId,
      selectedPresetId,
      genderMap[selectedPresetId] ?? "male",
    );
  };

  // Phase: AUTH (로그인/회원가입)
  if (screenPhase === "AUTH") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8 bg-[var(--bg-primary)] px-4">
        {/* Logo (compact) */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center border-2 border-[var(--gold)]">
            <span className="font-display text-2xl font-bold text-[var(--gold)]">
              R
            </span>
          </div>
          <h1 className="font-display text-2xl tracking-[4px] text-[var(--text-primary)]">
            그림자의 왕국
          </h1>
        </div>

        <AuthForm onSuccess={() => setScreenPhase("TITLE")} />

        {/* 뒤로 */}
        <button
          onClick={() => setScreenPhase("TITLE")}
          className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
        >
          &larr; 돌아가기
        </button>
      </div>
    );
  }

  // Phase: TITLE
  if (screenPhase === "TITLE") {
    const isLoggedIn = !!authToken;
    const displayName = authUser?.nickname ?? authUser?.email ?? "";

    return (
      <div className="flex h-full flex-col items-center justify-center gap-12 bg-[var(--bg-primary)]">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center border-2 border-[var(--gold)]">
            <span className="font-display text-3xl font-bold text-[var(--gold)]">
              R
            </span>
          </div>
          <h1 className="font-display text-4xl tracking-[6px] text-[var(--text-primary)]">
            그림자의 왕국
          </h1>
          <p className="text-base text-[var(--text-muted)]">
            그레이마르 항만 — 버티컬 슬라이스
          </p>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col items-center gap-4 px-6">
          {isLoggedIn ? (
            <>
              {/* 로그인 상태: 닉네임 표시 */}
              <p className="mb-2 text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--gold)]">{displayName}</span> 님, 환영합니다
              </p>

              {activeRunInfo && (
                <button
                  onClick={() => resumeRun()}
                  disabled={isLoading}
                  className="flex h-14 w-full max-w-64 flex-col items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)] disabled:opacity-50"
                >
                  <span className="text-lg tracking-[3px]">이어하기</span>
                  <span className="text-xs opacity-70">
                    {getPresetName(activeRunInfo.presetId)} · 턴 {activeRunInfo.currentTurnNo}
                  </span>
                </button>
              )}
              <button
                onClick={() => setScreenPhase("SELECT_PRESET")}
                disabled={isLoading}
                className="flex h-14 w-full max-w-64 items-center justify-center border border-[var(--gold)] bg-transparent font-display text-lg tracking-[3px] text-[var(--gold)] transition-all hover:bg-[var(--gold)] hover:text-[var(--bg-primary)] disabled:opacity-50"
              >
                새 게임
              </button>
              <button
                onClick={handleEnterCampaign}
                disabled={isLoading || campaignLoading}
                className="flex h-14 w-full max-w-64 items-center justify-center border border-[var(--text-muted)] bg-transparent font-display text-lg tracking-[3px] text-[var(--text-secondary)] transition-all hover:border-[var(--gold)] hover:text-[var(--gold)] disabled:opacity-50"
              >
                {campaignLoading ? "불러오는 중..." : "캠페인"}
              </button>
              <button
                onClick={handleLogout}
                className="mt-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
              >
                로그아웃
              </button>
            </>
          ) : (
            /* 미로그인 상태 */
            <button
              onClick={() => setScreenPhase("AUTH")}
              className="flex h-14 w-full max-w-64 items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-lg tracking-[3px] text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)]"
            >
              시작하기
            </button>
          )}
        </div>
      </div>
    );
  }

  // Phase: CAMPAIGN — campaign hub (create or continue)
  if (screenPhase === "CAMPAIGN") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8 bg-[var(--bg-primary)] px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center border-2 border-[var(--gold)]">
            <span className="font-display text-2xl font-bold text-[var(--gold)]">C</span>
          </div>
          <h1 className="font-display text-2xl tracking-[4px] text-[var(--text-primary)]">
            캠페인
          </h1>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-4">
          {activeCampaign ? (
            <>
              <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
                <p className="text-xs text-[var(--text-muted)]">진행 중인 캠페인</p>
                <p className="mt-1 font-display text-lg text-[var(--text-primary)]">
                  {activeCampaign.name}
                </p>
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
              <p className="text-center text-sm text-[var(--text-secondary)]">
                진행 중인 캠페인이 없습니다. 새 캠페인을 시작하세요.
              </p>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="campaign-name" className="text-xs text-[var(--text-muted)]">
                  캠페인 이름
                </label>
                <input
                  id="campaign-name"
                  type="text"
                  maxLength={50}
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateCampaign(); }}
                  placeholder="나의 첫 번째 캠페인"
                  className="h-11 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
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

          {campaignError && (
            <p className="text-sm text-[var(--hp-red)]">{campaignError}</p>
          )}
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

  // Phase: CAMPAIGN_SCENARIO — select scenario
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
            시나리오 선택 — {activeCampaign?.name}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {scenarios.length === 0 ? (
              <p className="text-center text-sm text-[var(--text-muted)]">
                사용 가능한 시나리오가 없습니다.
              </p>
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
                      <h3 className="font-display text-lg text-[var(--text-primary)]">
                        {scenario.name}
                      </h3>
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                      {scenario.description}
                    </p>
                    {!isAvailable && (
                      <p className="text-xs text-[var(--text-muted)]">
                        선행 시나리오를 먼저 완료해야 합니다.
                      </p>
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

  // Phase: CAMPAIGN_PRESET — preset selection for campaign first scenario
  if (screenPhase === "CAMPAIGN_PRESET") {
    return (
      <div className="flex h-full flex-col bg-[var(--bg-primary)]">
        <div className="flex items-center gap-4 border-b border-[var(--border-primary)] px-4 py-3 sm:px-6">
          <button
            onClick={() => {
              setScreenPhase("CAMPAIGN_SCENARIO");
              setSelectedPresetId(null);
              setGenderMap({});
            }}
            className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            &larr; 뒤로
          </button>
          <h2 className="font-display text-base text-[var(--text-primary)]">
            용병의 과거를 선택하세요
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {PRESETS.map((preset) => (
              <PresetCard
                key={preset.presetId}
                preset={preset}
                selected={selectedPresetId === preset.presetId}
                gender={genderMap[preset.presetId] ?? "male"}
                onSelect={() => setSelectedPresetId(preset.presetId)}
                onGenderChange={(g) =>
                  setGenderMap((prev) => ({ ...prev, [preset.presetId]: g }))
                }
              />
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--border-primary)] px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <button
              onClick={handleStartCampaignWithPreset}
              disabled={!selectedPresetId || isLoading}
              className="flex h-12 w-full items-center justify-center border border-[var(--gold)] font-display text-lg tracking-[4px] transition-all disabled:opacity-30 disabled:cursor-not-allowed enabled:bg-[var(--gold)] enabled:text-[var(--bg-primary)] enabled:hover:shadow-[0_0_20px_rgba(201,169,98,0.3)]"
            >
              {isLoading ? "불러오는 중..." : "캠페인 시작"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase: SELECT_PRESET
  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[var(--border-primary)] px-4 py-3 sm:px-6">
        <button
          onClick={() => {
            setScreenPhase("TITLE");
            setSelectedPresetId(null);
            setGenderMap({});
          }}
          className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          &larr; 뒤로
        </button>
        <h2 className="font-display text-base text-[var(--text-primary)]">
          용병의 과거를 선택하세요
        </h2>
      </div>

      {/* Preset Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {PRESETS.map((preset) => (
            <PresetCard
              key={preset.presetId}
              preset={preset}
              selected={selectedPresetId === preset.presetId}
              gender={genderMap[preset.presetId] ?? "male"}
              onSelect={() => setSelectedPresetId(preset.presetId)}
              onGenderChange={(g) =>
                setGenderMap((prev) => ({ ...prev, [preset.presetId]: g }))
              }
            />
          ))}
        </div>
      </div>

      {/* 능력치 영향 안내 */}
      <div className="border-t border-[var(--border-primary)] px-4 pt-3 pb-1 sm:px-6">
        <div className="mx-auto max-w-3xl grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
          <span><span className="font-semibold" style={{color:'var(--hp-red)'}}>힘</span> 전투·협박</span>
          <span><span className="font-semibold" style={{color:'var(--gold)'}}>민첩</span> 잠입·절도</span>
          <span><span className="font-semibold" style={{color:'var(--success-green)'}}>지력</span> 조사·수색</span>
          <span><span className="font-semibold" style={{color:'var(--info-blue)'}}>체질</span> 체력·저항</span>
          <span><span className="font-semibold" style={{color:'#c084fc'}}>지각</span> 관찰·탐색</span>
          <span><span className="font-semibold" style={{color:'#f472b6'}}>매력</span> 설득·거래</span>
        </div>
      </div>

      {/* Start Button */}
      <div className="border-t border-[var(--border-primary)] px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={handleStartGame}
            disabled={!selectedPresetId || isLoading}
            className="flex h-12 w-full items-center justify-center border border-[var(--gold)] font-display text-lg tracking-[4px] transition-all disabled:opacity-30 disabled:cursor-not-allowed enabled:bg-[var(--gold)] enabled:text-[var(--bg-primary)] enabled:hover:shadow-[0_0_20px_rgba(201,169,98,0.3)]"
          >
            {isLoading ? "불러오는 중..." : "시 작 하 기"}
          </button>
        </div>
      </div>
    </div>
  );
}
