"use client";
// [arch/93] 장소 배경 지속화 — 현재 장소 이미지를 서술 패널 뒤에 옅게 유지한다.
//
// 배경: 장소 이미지는 진입 턴 SYSTEM 메시지에 1회 붙고 스크롤 위로 사라져,
// 대화가 이어지는 동안 화면에 장면이 전혀 없는 구간이 생긴다 (실측 2,117턴
// 기준 중앙값 3턴·p90 6턴·최장 23턴). 같은 이미지를 배경으로 유지해 그 공백을
// 메운다 — 신규 에셋 0장, 서버·LLM 0줄.
//
// 앵커는 worldState의 하드 상태(장소·시간대·안전도)뿐이라 LLM 서술 내용과
// 무관하다. 따라서 npcPortrait처럼 "서술 최종본과 대조해 교체/제거"하는
// 정합 로직이 필요 없다 (arch/93 §부작용 격리).
import { useEffect, useState } from "react";
import Image from "next/image";
import { getLocationImagePath } from "@/data/location-images";
import { useGameStore } from "@/store/game-store";

/**
 * 배경 농도. 서술 가독성과 직결되므로 조정은 이 상수 한 곳에서만.
 * 서술 카드가 알파 0.75로 덮으므로 본문 뒤 실효 농도는 이 값의 약 1/4이다
 * (카드 사이 여백에서는 이 값 그대로 보인다).
 */
const BACKDROP_OPACITY = 0.3;
/** 장소·시간대 변경 시 크로스페이드 길이 (CSS duration과 일치시킬 것) */
const CROSSFADE_MS = 600;
/** 진입 턴 인라인 이미지(StoryBlock)와 동일 — 최적화 변형 캐시 히트 유도 */
const SIZES = "(max-width: 768px) 100vw, 800px";

export function LocationBackdrop() {
  // 셀렉터 안에서 경로까지 파생한다. worldState 객체는 매 턴 새로 갱신되지만
  // 장소·시간대가 그대로면 경로 문자열이 같아 리렌더가 발생하지 않는다.
  const imagePath = useGameStore((s) => {
    const ws = s.worldState;
    if (!ws) return null;
    return getLocationImagePath(
      ws.currentLocationId,
      ws.timePhase,
      ws.hubSafety,
      ws.phaseV2,
    );
  });

  const [seen, setSeen] = useState(imagePath);
  const [current, setCurrent] = useState(imagePath);
  const [next, setNext] = useState<string | null>(null);
  const [showNext, setShowNext] = useState(false);

  // 경로 변경을 렌더 중에 반영 (effect 경유 시 한 프레임 늦게 반응한다).
  if (imagePath !== seen) {
    setSeen(imagePath);
    if (imagePath === current) {
      // 왕복 이동 등으로 원래 이미지로 되돌아옴 → 진행 중인 전환 취소
      setNext(null);
      setShowNext(false);
    } else if (current === null || imagePath === null) {
      // 최초 표시 / 이미지 없는 팩·장소로 이동 → 전환 없이 즉시 교체
      setCurrent(imagePath);
      setNext(null);
      setShowNext(false);
    } else {
      setNext(imagePath);
      setShowNext(false);
    }
  }

  // 새 이미지 페이드인 완료 → 현재 이미지로 승격
  useEffect(() => {
    if (!showNext || next === null) return;
    const timer = setTimeout(() => {
      setCurrent(next);
      setNext(null);
      setShowNext(false);
    }, CROSSFADE_MS);
    return () => clearTimeout(timer);
  }, [showNext, next]);

  // 이미지 에셋이 없는 팩(silverdeen 등)은 아무것도 렌더하지 않는다.
  // 타 팩 이미지로 fallback 하지 않는다 — 세계관 오염 (architecture/63 ⑥).
  if (current === null && next === null) return null;

  // -z-10: 부모 배경색 위·본문 아래에 깔린다 (형제에 z-index 부여 불필요).
  // z-0 으로 두면 positioned 요소가 정적 형제 위에 그려져 서술을 덮는다.
  //
  // 전제: 부모에 `isolate`(isolation: isolate)가 있어야 한다. 없으면 부모가
  // stacking context를 만들지 않아 음수 z-index가 조상 기준으로 해석되고,
  // 부모의 bg-[var(--bg-primary)] 뒤로 밀려 완전히 가려진다 (실측 확인).
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {current && (
        <Image
          src={current}
          alt=""
          fill
          sizes={SIZES}
          className="scale-105 object-cover blur-[2px]"
          style={{ opacity: BACKDROP_OPACITY }}
          onError={() => setCurrent(null)}
        />
      )}
      {next && (
        <Image
          src={next}
          alt=""
          fill
          sizes={SIZES}
          className="scale-105 object-cover blur-[2px] transition-opacity duration-[600ms] ease-in-out"
          style={{ opacity: showNext ? BACKDROP_OPACITY : 0 }}
          onLoad={() => setShowNext(true)}
          onError={() => {
            setNext(null);
            setShowNext(false);
          }}
        />
      )}
      {/* 하단 스크림 — 선택지·힌트 등 muted 텍스트가 몰리는 영역의 대비 확보 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent from-60% to-[var(--bg-primary)]" />
    </div>
  );
}
