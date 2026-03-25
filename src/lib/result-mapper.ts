import type { StoryMessage, Choice, ServerResultV1 } from '@/types/game';
import { getLocationImagePath } from '@/data/location-images';

// ---------------------------------------------------------------------------
// Turn history types & mapper (이어하기 대화 이력 복원용)
// ---------------------------------------------------------------------------

export interface TurnHistoryItem {
  turnNo: number;
  nodeType: string;
  inputType: string;
  rawInput: string;
  summary: string;
  llmStatus: string;
  llmOutput: string | null;
  createdAt: string;
  resolveOutcome: 'SUCCESS' | 'PARTIAL' | 'FAIL' | null;
  eventTexts: string[];
  choices: Array<{ id: string; label: string }>;
  displaySummary: string | null;
}

/**
 * 내레이터 텍스트에서 선택지 잔여물을 제거.
 * - [CHOICES]...[/CHOICES] 태그 (정상 닫힘)
 * - [CHOICES]... (닫힘 태그 누락, 끝까지)
 * - [선택지]... (한국어 변형)
 * - 말미 "무엇을 하겠는가?" + 번호 선택지 목록
 */
export function stripNarratorChoices(text: string): string {
  return text
    .replace(/\s*\[CHOICES\][\s\S]*?\[\/CHOICES\]/g, '')
    .replace(/\s*\[CHOICES\][\s\S]*$/g, '')
    .replace(/\s*\[선택지\][\s\S]*$/g, '')
    .replace(/\n+무엇을 하겠는가\??\s*(\n\s*\d+\.\s*.+)+\s*$/g, '')
    .trim();
}

/**
 * 과거 턴 배열(시간순)을 StoryMessage[]로 변환.
 * 마지막 턴(현재 턴)은 별도로 mapResultToMessages()를 사용하므로 제외하고 전달할 것.
 */
export function mapTurnHistoryToMessages(
  turns: TurnHistoryItem[],
): StoryMessage[] {
  const messages: StoryMessage[] = [];

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];

    // 1. Player input
    if (turn.inputType === 'ACTION' && turn.rawInput) {
      messages.push({
        id: `history-player-${turn.turnNo}`,
        type: 'PLAYER',
        text: turn.rawInput,
      });
    } else if (turn.inputType === 'CHOICE' && turn.rawInput) {
      // 선택지 → 이전 턴의 choices에서 라벨 역참조
      const prevChoices = i > 0 ? turns[i - 1].choices : [];
      const label = prevChoices.find((c) => c.id === turn.rawInput)?.label ?? turn.rawInput;
      messages.push({
        id: `history-player-${turn.turnNo}`,
        type: 'PLAYER',
        text: label,
      });
    }
    // inputType === 'SYSTEM' (노드 전이, 초기화) → PLAYER 메시지 없음

    // 2. System events (전리품, 시스템 공지)
    for (let j = 0; j < turn.eventTexts.length; j++) {
      messages.push({
        id: `history-sys-${turn.turnNo}-${j}`,
        type: 'SYSTEM',
        text: turn.eventTexts[j],
      });
    }

    // 3. Resolve outcome (판정 결과)
    if (turn.resolveOutcome) {
      messages.push({
        id: `history-resolve-${turn.turnNo}`,
        type: 'RESOLVE',
        text: '',
        resolveOutcome: turn.resolveOutcome,
      });
    }

    // 4. Narrator (LLM 텍스트 > display > summary 순 fallback)
    const rawNarrator = (turn.llmStatus === 'DONE' && turn.llmOutput)
      ? turn.llmOutput
      : (turn.displaySummary || turn.summary);
    const narratorText = rawNarrator ? stripNarratorChoices(rawNarrator) : '';
    if (narratorText) {
      messages.push({
        id: `narrator-${turn.turnNo}`,
        type: 'NARRATOR',
        text: narratorText,
        loading: false,
      });
    }
  }

  return messages;
}

const SYSTEM_EVENT_KINDS = new Set([
  'SYSTEM',
  'LOOT',
  'GOLD',
  'INCIDENT_PROGRESS',
  'INCIDENT_RESOLVED',
]);

const COMBAT_EVENT_KINDS = new Set([
  'BATTLE',
  'DAMAGE',
  'MOVE',
  'STATUS',
]);

/**
 * Map a ServerResultV1 into an array of StoryMessage objects
 * that the NarrativePanel can render.
 *
 * @param idPrefix - NARRATOR 메시지 id 접두사.
 *   - 'narrator' (기본값): LLM 폴링으로 교체 가능 (`narrator-{turnNo}`)
 *   - 'enter': 노드 진입 서술 (교체 불필요, `enter-{turnNo}`)
 * @param isLlmSkipped - true이면 전투 이벤트를 SYSTEM 메시지로 표시하고 NARRATOR 생략
 */
export function mapResultToMessages(
  result: ServerResultV1,
  idPrefix: string = 'narrator',
  isLlmSkipped: boolean = false,
): StoryMessage[] {
  const messages: StoryMessage[] = [];

  // 1. System / combat events (먼저 표시 — 공지/전투 로그)
  //    LOCATION_ENTER 이벤트에는 장소 이미지 첨부
  const ws = result.ui?.worldState as { currentLocationId?: string; timePhase?: string; hubSafety?: string; phaseV2?: string } | undefined;
  for (const event of result.events ?? []) {
    const isLocationEnter = event.tags?.includes('LOCATION_ENTER');
    if (SYSTEM_EVENT_KINDS.has(event.kind) || isLocationEnter) {
      messages.push({
        id: crypto.randomUUID(),
        type: 'SYSTEM',
        text: event.text,
        ...(isLocationEnter && ws ? {
          locationImage: getLocationImagePath(
            ws.currentLocationId,
            ws.timePhase,
            ws.hubSafety,
            ws.phaseV2,
          ),
        } : {}),
      });
    }
  }

  // 2. LLM 스킵 시 전투 이벤트도 SYSTEM 메시지로 표시
  if (isLlmSkipped) {
    for (const event of result.events ?? []) {
      if (COMBAT_EVENT_KINDS.has(event.kind)) {
        messages.push({
          id: crypto.randomUUID(),
          type: 'SYSTEM',
          text: event.text,
        });
      }
    }
  }

  // 2.5 Resolve outcome (판정 결과 — 시스템 이벤트 후, 내레이터 전)
  if (result.ui?.resolveOutcome) {
    messages.push({
      id: `resolve-${result.turnNo}`,
      type: 'RESOLVE',
      text: '',
      resolveOutcome: result.ui.resolveOutcome as StoryMessage['resolveOutcome'],
      resolveBreakdown: result.ui.resolveBreakdown ?? undefined,
    });
  }

  // 3. Narrator summary (장면 묘사 — 시스템 이벤트 후)
  //    LLM 스킵이면 NARRATOR 생략
  if (result.summary?.short && !isLlmSkipped) {
    const isLlmTarget = idPrefix === 'narrator';
    messages.push({
      id: `${idPrefix}-${result.turnNo}`,
      type: 'NARRATOR',
      text: isLlmTarget ? '' : (result.summary.display ?? result.summary.short),
      loading: isLlmTarget,
    });
  }

  // 4. Choices (if any)
  if (result.choices && result.choices.length > 0) {
    const mapped: Choice[] = result.choices.map((c) => ({
      id: c.id,
      label: c.label,
      affordance: c.action?.payload?.affordance as string | undefined,
    }));

    messages.push({
      id: crypto.randomUUID(),
      type: 'CHOICE',
      text: '',
      choices: mapped,
    });
  }

  return messages;
}
