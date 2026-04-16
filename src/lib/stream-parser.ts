// ---------------------------------------------------------------------------
// StreamParser — LLM SSE 토큰을 실시간으로 서술/대사로 분류하는 상태 머신
// @[NPC이름] "대사" 또는 @[NPC이름|URL] "대사" 패턴을 점진 파싱
// ---------------------------------------------------------------------------

export type StreamOutputType = 'narration' | 'dialogue';

export interface StreamOutput {
  type: StreamOutputType;
  text: string;
  npcName?: string;
  npcImage?: string;
}

const enum StreamState {
  NARRATION,
  MARKER_OPEN,
  MARKER_DONE,
  DIALOGUE_OPEN,
}

export class StreamParser {
  private state: StreamState = StreamState.NARRATION;
  private markerBuffer = '';
  private dialogueBuffer = '';
  private markerName = '';
  private markerImage = '';
  private pendingText = ''; // '@'가 나왔지만 '['가 아직 안 온 경우

  /**
   * 새 토큰(문자열 chunk)을 공급하여 파싱 결과를 반환한다.
   * 한 토큰에서 여러 StreamOutput이 나올 수 있다.
   */
  feed(token: string): StreamOutput[] {
    const outputs: StreamOutput[] = [];

    for (const char of token) {
      switch (this.state) {
        case StreamState.NARRATION:
          if (char === '@') {
            // '@' 후보 — 다음 문자가 '['이면 마커 시작
            this.pendingText = '@';
          } else if (this.pendingText === '@' && char === '[') {
            this.state = StreamState.MARKER_OPEN;
            this.markerBuffer = '';
            this.pendingText = '';
          } else {
            if (this.pendingText) {
              outputs.push({ type: 'narration', text: this.pendingText });
              this.pendingText = '';
            }
            outputs.push({ type: 'narration', text: char });
          }
          break;

        case StreamState.MARKER_OPEN:
          if (char === ']') {
            // 마커 완성 — name|image 파싱
            const pipeIdx = this.markerBuffer.indexOf('|');
            if (pipeIdx >= 0) {
              this.markerName = this.markerBuffer.slice(0, pipeIdx).trim();
              this.markerImage = this.markerBuffer.slice(pipeIdx + 1).trim();
            } else {
              this.markerName = this.markerBuffer.trim();
              this.markerImage = '';
            }
            this.state = StreamState.MARKER_DONE;
          } else {
            this.markerBuffer += char;
          }
          break;

        case StreamState.MARKER_DONE:
          // 마커 이후: 공백 무시, 큰따옴표 시 대사 시작, 그 외 마커 폐기
          if (char === '"' || char === '\u201C') {
            this.state = StreamState.DIALOGUE_OPEN;
            this.dialogueBuffer = '';
          } else if (char === ' ' || char === '\n') {
            // 공백/줄바꿈은 무시하며 따옴표 대기
          } else {
            // 마커 후 대사 없이 일반 텍스트 — 마커 폐기, narration 복귀
            this.state = StreamState.NARRATION;
            outputs.push({ type: 'narration', text: char });
            this.markerName = '';
            this.markerImage = '';
          }
          break;

        case StreamState.DIALOGUE_OPEN:
          if (char === '"' || char === '\u201D') {
            // 대사 완성
            if (this.dialogueBuffer.trim()) {
              outputs.push({
                type: 'dialogue',
                text: this.dialogueBuffer,
                npcName: this.markerName,
                npcImage: this.markerImage || undefined,
              });
            }
            this.state = StreamState.NARRATION;
            this.markerName = '';
            this.markerImage = '';
            this.markerBuffer = '';
            this.dialogueBuffer = '';
          } else {
            this.dialogueBuffer += char;
          }
          break;
      }
    }

    return outputs;
  }

  /**
   * 스트림 종료 시 남은 버퍼를 플러시한다.
   */
  flush(): StreamOutput[] {
    const outputs: StreamOutput[] = [];

    if (this.pendingText) {
      outputs.push({ type: 'narration', text: this.pendingText });
      this.pendingText = '';
    }

    if (this.state === StreamState.DIALOGUE_OPEN && this.dialogueBuffer) {
      outputs.push({
        type: 'dialogue',
        text: this.dialogueBuffer,
        npcName: this.markerName,
        npcImage: this.markerImage || undefined,
      });
    } else if (this.state === StreamState.MARKER_OPEN && this.markerBuffer) {
      // 불완전 마커 — narration으로 출력
      outputs.push({ type: 'narration', text: `@[${this.markerBuffer}` });
    }

    this.reset();
    return outputs;
  }

  /**
   * 파서 상태 초기화
   */
  reset(): void {
    this.state = StreamState.NARRATION;
    this.markerBuffer = '';
    this.dialogueBuffer = '';
    this.markerName = '';
    this.markerImage = '';
    this.pendingText = '';
  }
}
