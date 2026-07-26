import Link from "next/link";

/**
 * 게임플레이 재현 섹션 (arch/90 P3) — Hidden Door식.
 * 실제 턴 사이클(자유 입력 → 1d6 판정 → 서술 → NPC 대사)을 CSS 키프레임만으로
 * 12초 루프 재생한다. 실 게임 컴포넌트 재사용 금지(랜딩 RSC 독립 유지) — 스타일만 이식.
 * 판정 수식은 실제 규칙(1d6 + floor(stat/4), SUCCESS ≥ 5)과 일치시킨다.
 */
const DEMO_CSS = `
.gdm-item { opacity: 0; animation-duration: 12s; animation-iteration-count: infinite; animation-timing-function: ease-out; }
.gdm-i1 { animation-name: gdmI1; }
.gdm-i2 { animation-name: gdmI2; }
.gdm-i3 { animation-name: gdmI3; }
.gdm-i4 { animation-name: gdmI4; }
.gdm-i5 { animation-name: gdmI5; }
@keyframes gdmI1 { 0%,3% { opacity:0; transform:translateY(6px); } 7%,90% { opacity:1; transform:none; } 96%,100% { opacity:0; } }
@keyframes gdmI2 { 0%,16% { opacity:0; transform:translateY(6px); } 20%,90% { opacity:1; transform:none; } 96%,100% { opacity:0; } }
@keyframes gdmI3 { 0%,30% { opacity:0; transform:translateY(6px); } 34%,90% { opacity:1; transform:none; } 96%,100% { opacity:0; } }
@keyframes gdmI4 { 0%,46% { opacity:0; transform:translateY(6px); } 50%,90% { opacity:1; transform:none; } 96%,100% { opacity:0; } }
@keyframes gdmI5 { 0%,62% { opacity:0; transform:translateY(6px); } 66%,90% { opacity:1; transform:none; } 96%,100% { opacity:0; } }
.gdm-caret { display:inline-block; width:2px; height:1em; vertical-align:-0.15em; background:#e9c176; margin-left:2px; animation: gdmCaret 1s step-end infinite; }
@keyframes gdmCaret { 0%,49% { opacity:1; } 50%,100% { opacity:0; } }
@media (prefers-reduced-motion: reduce) {
  .gdm-item { animation: none; opacity: 1; }
  .gdm-caret { animation: none; }
}
`;

export function GameplayDemo() {
  return (
    <section
      id="demo"
      className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24"
      aria-label="게임플레이 미리보기"
    >
      <style>{DEMO_CSS}</style>
      <div className="text-center mb-10 sm:mb-14">
        <h2
          className="text-3xl sm:text-4xl mb-4"
          style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#ffdea5" }}
        >
          이렇게 노는 겁니다
        </h2>
        <p className="text-lg break-keep" style={{ color: "#d1c5b4" }}>
          한 턴이 흘러가는 모습을 그대로 가져왔습니다.
        </p>
      </div>

      <div
        className="max-w-2xl mx-auto border shadow-2xl"
        style={{ backgroundColor: "#0e0e0e", borderColor: "rgba(78, 70, 57, 0.3)" }}
      >
        {/* 창 상단 바 */}
        <div
          className="flex items-center gap-2 px-4 py-2.5 border-b"
          style={{ borderColor: "rgba(78, 70, 57, 0.25)", backgroundColor: "#131313" }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "rgba(233,193,118,0.5)" }} aria-hidden="true" />
          <span
            className="text-xs tracking-wide"
            style={{ fontFamily: "'Inter', sans-serif", color: "#9a8f80" }}
          >
            그레이마르 항구 &mdash; 성문 앞 &middot; 밤
          </span>
        </div>

        <div className="p-5 sm:p-8 space-y-5">
          {/* 1. 플레이어 자유 입력 */}
          <div className="gdm-item gdm-i1 flex justify-end">
            <div
              className="max-w-[85%] px-4 py-3 border text-sm sm:text-base"
              style={{
                backgroundColor: "rgba(233, 193, 118, 0.08)",
                borderColor: "rgba(233, 193, 118, 0.3)",
                color: "#e5e2e1",
              }}
            >
              짐마차 뒤에 숨어 경비 교대 시간을 잰다
              <span className="gdm-caret" aria-hidden="true" />
            </div>
          </div>

          {/* 2. 주사위 판정 배너 */}
          <div className="gdm-item gdm-i2 flex justify-center">
            <div
              className="px-4 py-2 border text-xs sm:text-sm tracking-wide"
              style={{
                fontFamily: "'Inter', sans-serif",
                borderColor: "rgba(233, 193, 118, 0.35)",
                backgroundColor: "rgba(233, 193, 118, 0.05)",
                color: "#d1c5b4",
              }}
            >
              🎲 1d6 = 5 &nbsp;+&nbsp; 관찰 1 &nbsp;=&nbsp; 6 &nbsp;&middot;&nbsp;{" "}
              <strong style={{ color: "#ffdea5" }}>성공</strong>
            </div>
          </div>

          {/* 3~4. AI 서술 */}
          <p
            className="gdm-item gdm-i3 text-sm sm:text-base leading-relaxed break-keep"
            style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#d1c5b4" }}
          >
            짐마차 그늘로 몸을 낮춘다. 부두의 종이 아홉 번 울리자, 성문 앞 횃불이 하나 꺼진다.
          </p>
          <p
            className="gdm-item gdm-i4 text-sm sm:text-base leading-relaxed break-keep"
            style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#d1c5b4" }}
          >
            교대는 종소리 직후 &mdash; 문이 비는 건 그 잠깐이다.
          </p>

          {/* 5. NPC 대사 버블 */}
          <div className="gdm-item gdm-i5">
            <p className="text-xs mb-1.5" style={{ fontFamily: "'Inter', sans-serif", color: "#9a8f80" }}>
              하품하는 경비병
            </p>
            <div
              className="max-w-[85%] px-4 py-3 border-l-2 text-sm sm:text-base break-keep"
              style={{
                backgroundColor: "#1c1b1b",
                borderColor: "rgba(233, 193, 118, 0.5)",
                color: "#e5e2e1",
                fontFamily: "'Noto Serif KR', 'Noto Serif', serif",
              }}
            >
              &ldquo;먼저 들어가라. 오늘 밤은 아무 일도 없다, 아무 일도.&rdquo;
            </div>
          </div>
        </div>
      </div>

      <p className="text-center mt-8 text-sm sm:text-base break-keep" style={{ color: "#9a8f80" }}>
        다음 문장은 당신이 적을 차례예요.{" "}
        <Link
          href="/play"
          className="hover:opacity-80 transition-opacity whitespace-nowrap"
          style={{ color: "#ffdea5", fontFamily: "'Noto Serif KR', 'Noto Serif', serif" }}
        >
          이어서 적으러 가기 &rarr;
        </Link>
      </p>
    </section>
  );
}
