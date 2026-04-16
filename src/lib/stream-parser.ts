// ---------------------------------------------------------------------------
// StreamParser — 문장 단위 버퍼링 + 마커 파싱
//
// SSE 토큰을 실시간 수신하되, 문장이 완성될 때까지 버퍼에 모은 뒤
// 완성된 문장만 파싱하여 출력한다.
//
// 흐름:
//   토큰 도착 → rawBuffer 누적 → 1초 간격 flushSentences() 호출
//   → 완성된 문장 추출 → 마커 파싱 → StreamOutput[] 반환
//   → 미완성 문장은 버퍼에 유지
// ---------------------------------------------------------------------------

export type StreamOutputType = 'narration' | 'dialogue';

export interface StreamOutput {
  type: StreamOutputType;
  text: string;
  npcName?: string;
  npcImage?: string;
}

// 문장 구분 패턴: 마침표/느낌표/물음표 + 공백 또는 줄바꿈
const SENTENCE_END_RE = /([.!?。]\s|\n)/;

export class StreamParser {
  /** 아직 문장으로 완성되지 않은 원문 토큰 버퍼 */
  private rawBuffer = '';
  /** JSON 모드 감지: 첫 토큰이 { 이면 JSON 모드 */
  private isJsonMode = false;
  private firstToken = true;

  /**
   * SSE 토큰을 버퍼에 누적한다.
   * 이 메서드는 UI를 업데이트하지 않는다.
   */
  feed(token: string): void {
    if (this.firstToken) {
      this.firstToken = false;
      if (token.trimStart().startsWith('{')) {
        this.isJsonMode = true;
      }
    }
    this.rawBuffer += token;
  }

  /**
   * 버퍼에서 완성된 문장을 추출하여 파싱 결과를 반환한다.
   * 1초 간격으로 호출되어야 한다.
   * JSON 모드에서는 아무것도 반환하지 않는다 (done 이벤트의 후처리본만 사용).
   */
  flushSentences(): StreamOutput[] {
    // JSON 모드: 스트리밍 중 표시하지 않음 (후처리 필요)
    if (this.isJsonMode) return [];

    const outputs: StreamOutput[] = [];
    let remaining = this.rawBuffer;

    // 문장 단위로 분리
    while (true) {
      const match = remaining.match(SENTENCE_END_RE);
      if (!match || match.index === undefined) break;

      const sentenceEnd = match.index + match[0].length;
      const sentence = remaining.slice(0, sentenceEnd);
      remaining = remaining.slice(sentenceEnd);

      // 빈 문장 스킵
      if (!sentence.trim()) continue;

      // 문장 내 마커 파싱
      const parsed = this.parseSentence(sentence);
      outputs.push(...parsed);
    }

    this.rawBuffer = remaining;
    return outputs;
  }

  /**
   * 스트림 종료 시 남은 버퍼를 모두 플러시한다.
   */
  flush(): StreamOutput[] {
    if (this.isJsonMode) {
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

  /**
   * JSON 모드 여부 반환 — 호출자가 로딩 표시 등에 활용
   */
  getIsJsonMode(): boolean {
    return this.isJsonMode;
  }

  /**
   * 파서 상태 초기화
   */
  reset(): void {
    this.rawBuffer = '';
    this.isJsonMode = false;
    this.firstToken = true;
  }

  // ── 내부 메서드 ──

  /**
   * 단일 문장을 파싱하여 narration/dialogue로 분류한다.
   * @[NPC이름|URL] "대사" 패턴을 감지한다.
   */
  private parseSentence(sentence: string): StreamOutput[] {
    const outputs: StreamOutput[] = [];

    // @[NPC이름|URL] "대사" 패턴 매칭
    const markerDialogueRe =
      /@\[([^\]|]+)(?:\|([^\]]+))?\]\s*["\u201C]([^"\u201D]*)["\u201D]/g;

    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = markerDialogueRe.exec(sentence)) !== null) {
      // 마커 앞의 narration
      if (match.index > lastIdx) {
        const narr = sentence.slice(lastIdx, match.index).trim();
        if (narr) {
          outputs.push({ type: 'narration', text: narr });
        }
      }

      // 대사
      const npcName = match[1].trim();
      const npcImage = match[2]?.trim() || undefined;
      const dialogueText = match[3].trim();

      if (dialogueText) {
        outputs.push({
          type: 'dialogue',
          text: dialogueText,
          npcName,
          npcImage,
        });
      }

      lastIdx = match.index + match[0].length;
    }

    // 남은 텍스트 (마커가 없거나 마커 뒤 narration)
    if (lastIdx < sentence.length) {
      const remaining = sentence.slice(lastIdx).trim();
      if (remaining) {
        // 불완전 @마커 제거 (문장 끝에 @[... 이 걸려있는 경우)
        const cleaned = remaining.replace(/@\[[^\]]*$/, '').trim();
        if (cleaned) {
          outputs.push({ type: 'narration', text: cleaned });
        }
      }
    }

    return outputs;
  }
}
