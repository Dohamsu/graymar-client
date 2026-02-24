import type { StoryMessage, Choice, ServerResultV1 } from '@/types/game';

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
  for (const event of result.events ?? []) {
    if (SYSTEM_EVENT_KINDS.has(event.kind)) {
      messages.push({
        id: crypto.randomUUID(),
        type: 'SYSTEM',
        text: event.text,
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
