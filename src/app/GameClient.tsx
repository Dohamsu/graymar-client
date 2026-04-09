"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useGameStore } from "@/store/game-store";
import { useAuthStore } from "@/store/auth-store";
import {
  Header,
  MobileHeader,
} from "@/components/layout/Header";
import { NarrativePanel } from "@/components/narrative/NarrativePanel";
import { InputSection, MobileInputSection } from "@/components/input/InputSection";
import { SidePanel } from "@/components/side-panel/SidePanel";
import { CharacterTab } from "@/components/side-panel/CharacterTab";
import { InventoryTab } from "@/components/side-panel/InventoryTab";
import { BattlePanel } from "@/components/battle/BattlePanel";
import { StartScreen } from "@/components/screens/StartScreen";
import { PartyMainScreen } from "@/components/party/PartyMainScreen";
import { PartyHUD } from "@/components/party/PartyHUD";
import { PartyTurnStatus } from "@/components/party/PartyTurnStatus";
import { VoteModal } from "@/components/party/VoteModal";
import { usePartyStore } from "@/store/party-store";

import { RunEndScreen } from "@/components/screens/RunEndScreen";
import { EndingScreen } from "@/components/screens/EndingScreen";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { LlmFailureModal } from "@/components/ui/LlmFailureModal";
import { BugReportButton } from "@/components/ui/BugReportButton";
import { QuestTab } from "@/components/side-panel/QuestTab";
import { LocationHeader } from "@/components/hub/LocationHeader";
import { TurnResultBanner } from "@/components/location/TurnResultBanner";
import { LocationToastLayer } from "@/components/location/LocationToastLayer";
import type { BattleEnemy } from "@/types/game";
import { PageTransition } from "@/components/ui/PageTransition";
import { TimePhaseTransition } from "@/components/hub/TimePhaseTransition";
import { NetworkStatus } from "@/components/ui/NetworkStatus";

export default function GameClient() {
  const authToken = useAuthStore((s) => s.token);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => { hydrate(); }, [hydrate]);

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
  const inventoryChanges = useGameStore((s) => s.inventoryChanges);
  const clearInventoryChanges = useGameStore((s) => s.clearInventoryChanges);
  const notifications = useGameStore((s) => s.notifications);
  const endingResult = useGameStore((s) => s.endingResult);

  const [mobileTab, setMobileTab] = useState("story");
  const [showPartyScreen, setShowPartyScreen] = useState(false);

  // Party store subscription (for PartyHUD in-game)
  const partyInfo = usePartyStore((s) => s.party);
  const partyMembers = usePartyStore((s) => s.members);
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  // Phase 2: dungeon state
  const partyRunId = usePartyStore((s) => s.partyRunId);
  const dungeonCountdown = usePartyStore((s) => s.dungeonCountdown);
  const turnStatus = usePartyStore((s) => s.turnStatus);
  const currentVote = usePartyStore((s) => s.currentVote);
  const castVote = usePartyStore((s) => s.castVote);

  // --- Mobile header auto-hide on scroll ---
  const [mobileHeaderVisible, setMobileHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      const scrollEl = document.getElementById("mobile-narrative-scroll");
      if (scrollEl) {
        const currentY = scrollEl.scrollTop;
        if (currentY < lastScrollY.current - 8) {
          setMobileHeaderVisible(true);
        } else if (currentY > lastScrollY.current + 8) {
          setMobileHeaderVisible(false);
        }
        lastScrollY.current = currentY;
      }
      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    const scrollEl = document.getElementById("mobile-narrative-scroll");
    if (!scrollEl) {
      // 서술 탭이 아닌 경우 헤더 항상 표시
      // eslint-disable-next-line react-hooks/set-state-in-effect -- scroll listener setup requires sync reset
      setMobileHeaderVisible(true);
      return;
    }
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [handleScroll, mobileTab]);

  // --- Phase transition key for fade animation ---
  const prevPhaseRef = useRef(phase);
  const [phaseKey, setPhaseKey] = useState(0);
  useEffect(() => {
    if (phase !== prevPhaseRef.current) {
      prevPhaseRef.current = phase;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- phase transition key for animation
      setPhaseKey((k) => k + 1);
    }
  }, [phase]);

  // --- Party dungeon countdown → game load ---
  const checkActiveRun = useGameStore((s) => s.checkActiveRun);
  const resumeRun = useGameStore((s) => s.resumeRun);
  const loadGameRef = useRef(false);
  useEffect(() => {
    if (dungeonCountdown === 0 && partyRunId && !loadGameRef.current) {
      loadGameRef.current = true;
      // 파티 런 시작 — checkActiveRun(런 감지) → resumeRun(게임 로드)
      void (async () => {
        await checkActiveRun();
        await resumeRun();
      })();
    }
  }, [dungeonCountdown, partyRunId, checkActiveRun, resumeRun]);

  // --- Phase routing ---
  if (!authToken || phase === "TITLE" || phase === "LOADING") {
    // 파티 카운트다운 중이면 카운트다운 표시 (파티원 프로필 + 진입 연출)
    if (showPartyScreen && authToken && dungeonCountdown !== null && dungeonCountdown > 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-8 bg-[var(--bg-primary)]">
          {/* 파티원 프로필 카드 */}
          <div className="flex gap-4">
            {partyMembers.map((m, i) => (
              <div
                key={m.userId}
                className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom duration-500"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--gold)]/40 bg-[var(--bg-secondary)]">
                  <img
                    src={`/images/presets/${(m.presetId ?? "dockworker").toLowerCase()}.webp`}
                    alt={m.nickname}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {m.nickname}
                </span>
              </div>
            ))}
          </div>

          {/* 카운트다운 숫자 */}
          <div className="relative">
            <div
              key={dungeonCountdown}
              className="font-display text-7xl font-bold text-[var(--gold)] animate-in zoom-in duration-300"
            >
              {dungeonCountdown}
            </div>
          </div>

          {/* 진입 텍스트 */}
          <div className="flex flex-col items-center gap-1">
            <p className="font-display text-lg tracking-wider text-[var(--text-primary)]">
              던전에 진입합니다
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              파티원 {partyMembers.length}명과 함께
            </p>
          </div>

          {/* 하단 로딩 바 */}
          <div className="h-1 w-48 overflow-hidden rounded-full bg-[var(--border-primary)]">
            <div
              className="h-full rounded-full bg-[var(--gold)] transition-all duration-1000 ease-linear"
              style={{ width: `${((3 - dungeonCountdown) / 3) * 100}%` }}
            />
          </div>
        </div>
      );
    }
    if (showPartyScreen && authToken) {
      return <PartyMainScreen onBack={() => setShowPartyScreen(false)} />;
    }
    return <StartScreen onParty={() => setShowPartyScreen(true)} />;
  }
  if (phase === "RUN_ENDED") {
    return (
      <PageTransition phase="RUN_ENDED">
        {endingResult ? <EndingScreen /> : <RunEndScreen />}
      </PageTransition>
    );
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
    <PageTransition phase={phase as "HUB" | "LOCATION" | "COMBAT" | "NODE_TRANSITION" | "RUN_ENDED" | "ERROR" | "TITLE" | "LOADING"}>
    <div className="mx-auto flex h-full max-w-[1440px] flex-col">
      {/* 네트워크 상태 */}
      <NetworkStatus />
      {/* Error banner */}
      <ErrorBanner />
      {/* 시간대 전환 알림 */}
      {worldState && <TimePhaseTransition timePhase={worldState.timePhase} />}
      {/* LLM failure modal */}
      <LlmFailureModal />

      {/* ===== PartyHUD (when in a party) ===== */}
      {partyInfo && partyMembers.length > 0 && (
        <div className="shrink-0 px-2 pt-1 sm:px-4">
          <PartyHUD
            members={partyMembers.map((m) => ({
              userId: m.userId,
              nickname: m.nickname,
              presetId: m.presetId ?? "DOCKWORKER",
              portraitUrl: null,
              hp: m.hp ?? 0,
              maxHp: m.maxHp ?? 0,
              turnStatus: turnStatus?.submitted.includes(m.userId)
                ? "SUBMITTED" as const
                : "CHOOSING" as const,
              isCurrentUser: m.userId === currentUserId,
            }))}
          />
        </div>
      )}

      {/* ===== Desktop Layout (lg+) ===== */}
      <div className="hidden h-full flex-col lg:flex animate-phase-fade" key={`desktop-${phaseKey}`}>
        <Header location={location} hud={hud} worldState={worldState} llmStats={llmStats} />

        {/* LOCATION 헤더 (LOCATION phase) */}
        {phase === "LOCATION" && (
          <>
            <LocationHeader locationName={location} />
            <TurnResultBanner notifications={notifications} />
          </>
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
            {/* Party turn status (above input) */}
            {partyRunId && turnStatus && (
              <div className="shrink-0 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-2">
                <PartyTurnStatus turnStatus={turnStatus} totalMembers={partyMembers.length} />
              </div>
            )}
            <InputSection
              onSubmit={handleSubmit}
              onQuickAction={handleQuickAction}
              nodeType={currentNodeType}
              disabled={isSubmitting}
            />
          </div>

          {/* Right Column - Side Panel */}
          {characterInfo && <SidePanel character={characterInfo} inventory={inventory} gold={hud.gold} inventoryChanges={inventoryChanges} onClearChanges={clearInventoryChanges} />}
        </div>
      </div>

      {/* ===== Mobile & Tablet Layout (<lg) ===== */}
      <div className="flex h-full flex-col lg:hidden" key={`mobile-${phaseKey}`}>
        <MobileHeader location={location} visible={mobileHeaderVisible} activeTab={mobileTab} onTabChange={setMobileTab} />
        {/* 이야기 탭 외에서는 헤더 고정 → 콘텐츠 시작 위치 확보 */}
        {mobileTab !== "story" && <div className="h-12 shrink-0" />}

        <div className="animate-phase-fade flex flex-1 flex-col overflow-hidden">
          {mobileTab === "story" && (
            <>
              {phase === "COMBAT" &&
                enemies.length > 0 &&
                <BattlePanel enemies={enemies} />}
              <NarrativePanel
                messages={displayMessages}
                onChoiceSelect={handleChoiceSelect}
                onNarrationComplete={flushPending}
                scrollId="mobile-narrative-scroll"
              />
            </>
          )}
          {mobileTab === "character" && characterInfo && (
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
              <CharacterTab character={characterInfo} />
            </div>
          )}
          {mobileTab === "character" && !characterInfo && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-[var(--text-muted)]">캐릭터 정보 없음</p>
            </div>
          )}
          {mobileTab === "inventory" && (
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
              <InventoryTab inventory={inventory} gold={hud.gold} changes={inventoryChanges} />
            </div>
          )}
          {mobileTab === "quests" && (
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
              <QuestTab />
            </div>
          )}
        </div>

        {mobileTab === "story" && (
          <>
            {partyRunId && turnStatus && (
              <div className="shrink-0 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2">
                <PartyTurnStatus turnStatus={turnStatus} totalMembers={partyMembers.length} />
              </div>
            )}
            <MobileInputSection
              onSubmit={handleSubmit}
              onQuickAction={handleQuickAction}
              nodeType={currentNodeType}
              disabled={isSubmitting}
            />
          </>
        )}

        {/* 하단 네비 제거 → 햄버거 메뉴로 이동 */}
      </div>

      {/* LOCATION Toast Layer (floating, both desktop & mobile) */}
      {phase === "LOCATION" && (
        <LocationToastLayer notifications={notifications} />
      )}

      {/* Bug Report floating button */}
      <BugReportButton />

      {/* Party Vote Modal (overlay) */}
      {currentVote && (
        <VoteModal
          vote={currentVote}
          currentUserId={currentUserId}
          onCast={(voteId, choice) => castVote(voteId, choice)}
        />
      )}
    </div>
    </PageTransition>
  );
}
