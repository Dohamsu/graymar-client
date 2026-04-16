// ---------------------------------------------------------------------------
// StreamParser — 서버 구조화 이벤트 기반 세그먼트 축적기
//
// 서버가 narration/dialogue 타입 이벤트를 전송하면 그대로 축적한다.
// 기존 token 기반 문장 파싱은 fallback으로 유지 (서버 미지원 시).
//
// 흐름 (구조화 모드):
//   서버 narration 이벤트 → addNarration() → segments[] 축적
//   서버 dialogue 이벤트 → addDialogue() → segments[] 축적
//   → getSegments()로 즉시 읽기
//
// 흐름 (레거시 모드 — token만 올 때):
//   토큰 도착 → feed() → rawBuffer 누적 → flushSentences()
//   → 마커 파싱 → StreamOutput[] 반환
// ---------------------------------------------------------------------------

export type StreamOutputType = 'narration' | 'dialogue';

export interface StreamOutput {
  type: StreamOutputType;
  text: string;
  npcName?: string;
  npcImage?: string;
}

// 문장 구분 패턴 (레거시 모드용)
const SENTENCE_END_RE = /([.!?。]\s|\n)/;

export class StreamParser {
  /** 구조화 모드: 서버에서 narration/dialogue 이벤트를 받은 적 있는지 */
  private structured = false;
  /** 구조화 모드 세그먼트 축적 */
  private segments: StreamOutput[] = [];

  /** 레거시 모드: 원문 토큰 버퍼 */
  private rawBuffer = '';
  private isJsonMode = false;
  private firstToken = true;

  // ── 구조화 모드 API ──

  /** 서버 narration 이벤트 수신 — 연속 narration은 병합 */
  addNarration(text: string): void {
    this.structured = true;
    const last = this.segments[this.segments.length - 1];
    if (last?.type === 'narration') {
      last.text += ' ' + text;
    } else {
      this.segments.push({ type: 'narration', text });
    }
  }

  /** 서버 dialogue 이벤트 수신 */
  addDialogue(text: string, npcName?: string, npcImage?: string): void {
    this.structured = true;
    this.segments.push({ type: 'dialogue', text, npcName, npcImage });
  }

  /** 현재 세그먼트 스냅샷 반환 */
  getSegments(): StreamOutput[] {
    return [...this.segments];
  }

  /** 구조화 모드인지 */
  isStructured(): boolean {
    return this.structured;
  }

  // ── 레거시 모드 API (token 기반 — fallback) ──

  /** SSE 토큰을 버퍼에 누적 */
  feed(token: string): void {
    if (this.firstToken) {
      this.firstToken = false;
      if (token.trimStart().startsWith('{')) {
        this.isJsonMode = true;
      }
    }
    this.rawBuffer += token;
  }

  /** 완성된 문장 추출 (1초 간격 호출) — 구조화 모드에서는 빈 배열 */
  flushSentences(): StreamOutput[] {
    if (this.structured || this.isJsonMode) return [];

    const outputs: StreamOutput[] = [];
    let remaining = this.rawBuffer;

    while (true) {
      const match = remaining.match(SENTENCE_END_RE);
      if (!match || match.index === undefined) break;

      const sentenceEnd = match.index + match[0].length;
      const sentence = remaining.slice(0, sentenceEnd);
      remaining = remaining.slice(sentenceEnd);

      if (!sentence.trim()) continue;
      const parsed = this.parseSentence(sentence);
      outputs.push(...parsed);
    }

    this.rawBuffer = remaining;
    return outputs;
  }

  /** 스트림 종료 시 잔여 버퍼 플러시 */
  flush(): StreamOutput[] {
    if (this.structured || this.isJsonMode) {
      this.reset();
      return [];
    }

    const outputs: StreamOutput[] = [];
    if (this.rawBuffer.trim()) {
      const parsed = this.parseSentence(this.rawBuffer);
      outputs.push(...parsed);
    }
    this.reset();
    return outputs;
  }

  /** JSON 모드 여부 */
  getIsJsonMode(): boolean {
    return this.isJsonMode;
  }

  /** 상태 초기화 */
  reset(): void {
    this.rawBuffer = '';
    this.isJsonMode = false;
    this.firstToken = true;
    this.structured = false;
    this.segments = [];
  }

  // ── 레거시 마커 파싱 ──

  private parseSentence(sentence: string): StreamOutput[] {
    const outputs: StreamOutput[] = [];
    const markerDialogueRe =
      /@\[([^\]|]+)(?:\|([^\]]+))?\]\s*["\u201C]([^"\u201D]*)["\u201D]/g;

    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = markerDialogueRe.exec(sentence)) !== null) {
      if (match.index > lastIdx) {
        const narr = sentence.slice(lastIdx, match.index).trim();
        if (narr) outputs.push({ type: 'narration', text: narr });
      }

      const npcName = match[1].trim();
      const npcImage = match[2]?.trim() || undefined;
      const dialogueText = match[3].trim();

      if (dialogueText) {
        outputs.push({ type: 'dialogue', text: dialogueText, npcName, npcImage });
      }

      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < sentence.length) {
      const remaining = sentence.slice(lastIdx).trim();
      if (remaining) {
        const cleaned = remaining.replace(/@\[[^\]]*$/, '').trim();
        if (cleaned) outputs.push({ type: 'narration', text: cleaned });
      }
    }

    return outputs;
  }
}
