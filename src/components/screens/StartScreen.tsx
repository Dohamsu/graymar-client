"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useGameStore } from "@/store/game-store";
import { useAuthStore } from "@/store/auth-store";
import { PRESETS } from "@/data/presets";
import type { CharacterPreset } from "@/types/game";

type ScreenPhase = "TITLE" | "AUTH" | "SELECT_PRESET";
type AuthTab = "login" | "register";
type Gender = "male" | "female";

// ---------------------------------------------------------------------------
// 스탯 → 간략 요약 ("체력 높음 · 회피 낮음" 형태)
// ---------------------------------------------------------------------------

const STAT_LABELS: Record<string, string> = {
  MaxHP: "체력",
  ATK: "공격력",
  DEF: "방어력",
  EVA: "회피",
  CRIT: "치명타",
  RESIST: "저항",
  SPEED: "속도",
};

const STAT_THRESHOLDS: Record<string, [number, number, number]> = {
  MaxHP: [110, 95, 85],
  ATK: [16, 14, 12],
  DEF: [12, 10, 8],
  EVA: [6, 4, 3],
  CRIT: [7, 5, 4],
  RESIST: [8, 6, 4],
  SPEED: [7, 5, 4],
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

const SUMMARY_STATS = ["MaxHP", "ATK", "DEF", "EVA", "CRIT", "RESIST", "SPEED"] as const;

/** 눈에 띄는 스탯만 뽑아서 한 줄 요약 ("체력 높음 · 회피 낮음") */
function buildStatSummary(stats: CharacterPreset["stats"]): Array<{ label: string; grade: StatGrade }> {
  const items: Array<{ label: string; grade: StatGrade }> = [];
  for (const key of SUMMARY_STATS) {
    const grade = getStatGrade(key, stats[key]);
    if (grade === "매우 높음" || grade === "높음" || grade === "낮음") {
      items.push({ label: STAT_LABELS[key], grade });
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

        {/* 능력치 한 줄 요약 */}
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm">
          {statSummary.map(({ label, grade }, i) => (
            <span key={label}>
              <span className="text-[var(--text-muted)]">{label}</span>{" "}
              <span className={GRADE_COLOR[grade]}>{grade}</span>
              {i < statSummary.length - 1 && (
                <span className="text-[var(--border-primary)]"> · </span>
              )}
            </span>
          ))}
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

function AuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-email" className="text-xs text-[var(--text-muted)]">
            이메일
          </label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="h-11 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-password" className="text-xs text-[var(--text-muted)]">
            비밀번호
          </label>
          <input
            id="auth-password"
            type="password"
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
              type="text"
              maxLength={30}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="게임에서 사용할 이름"
              className="h-11 rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none"
            />
          </div>
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

  const handleStartGame = () => {
    if (!selectedPresetId) return;
    startNewGame(selectedPresetId, genderMap[selectedPresetId] ?? "male");
  };

  const handleLogout = () => {
    authLogout();
    gameReset();
    setScreenPhase("TITLE");
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
        <div className="flex flex-col items-center gap-4">
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
                  className="flex h-14 w-64 flex-col items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)] disabled:opacity-50"
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
                className="flex h-14 w-64 items-center justify-center border border-[var(--gold)] bg-transparent font-display text-lg tracking-[3px] text-[var(--gold)] transition-all hover:bg-[var(--gold)] hover:text-[var(--bg-primary)] disabled:opacity-50"
              >
                새 게임
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
              className="flex h-14 w-64 items-center justify-center border border-[var(--gold)] bg-[var(--gold)] font-display text-lg tracking-[3px] text-[var(--bg-primary)] transition-all hover:shadow-[0_0_20px_rgba(201,169,98,0.3)]"
            >
              시작하기
            </button>
          )}
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
