import type { StoryMessage, Choice, ServerResultV1 } from '@/types/game';

const SYSTEM_EVENT_KINDS = new Set([
  'SYSTEM',
  'LOOT',
  'GOLD',
]);

/**
 * Map a ServerResultV1 into an array of StoryMessage objects
 * that the NarrativePanel can render.
 *
 * @param idPrefix - NARRATOR 메시지 id 접두사.
 *   - 'narrator' (기본값): LLM 폴링으로 교체 가능 (`narrator-{turnNo}`)
 *   - 'enter': 노드 진입 서술 (교체 불필요, `enter-{turnNo}`)
 */
export function mapResultToMessages(
  result: ServerResultV1,
  idPrefix: string = 'narrator',
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

  // 2. Narrator summary (장면 묘사 — 시스템 이벤트 후)
  //    idPrefix='narrator' → LLM 폴링 대상 (loading 상태로 시작)
  //    idPrefix='enter'    → 노드 진입 서술 (즉시 표시)
  if (result.summary?.short) {
    const isLlmTarget = idPrefix === 'narrator';
    messages.push({
      id: `${idPrefix}-${result.turnNo}`,
      type: 'NARRATOR',
      text: isLlmTarget ? '' : (result.summary.display ?? result.summary.short),
      loading: isLlmTarget,
    });
  }

  // 3. Choices (if any)
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
