/**
 * 한국어 조사 선택 유틸 — server/src/common/korean.ts와 동일 로직.
 * 클라이언트 표시 문자열의 "(으)로" 병기 제거용.
 */

/** 받침 유무로 조사 선택: korParticle('장부', '을', '를') → '를' */
export function korParticle(
  word: string,
  withBatchim: string,
  withoutBatchim: string,
): string {
  if (!word) return withBatchim;
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return withBatchim;
  return (last - 0xac00) % 28 !== 0 ? withBatchim : withoutBatchim;
}

/** '으로/로' 선택 — ㄹ받침 예외 처리 ('마을' → '마을로') */
export function korParticleRo(word: string): string {
  if (word) {
    const last = word.charCodeAt(word.length - 1);
    if (last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 === 8) {
      return '로';
    }
  }
  return korParticle(word, '으로', '로');
}
