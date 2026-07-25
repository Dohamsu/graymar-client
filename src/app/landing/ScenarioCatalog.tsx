import Image from "next/image";
import Link from "next/link";
import { getScenarioBannerImage } from "@/data/location-images";

/**
 * 랜딩 시나리오 카탈로그 (arch/90 P2) — 4팩 카드.
 * 배너는 getScenarioBannerImage 정본 리졸버 재사용, null 팩은 그라데이션 fallback.
 * 카피 톤은 arch/90 §1.2 원칙 5 (구체 사물 + 구어 마무리).
 */
const SCENARIOS = [
  {
    id: "graymar_v1",
    name: "그레이마르 항구",
    copy: "도착 첫날 밤, 총독의 부하가 돈주머니를 내밉니다. 받으면 공범, 거절하면 적.",
    tags: ["#정치음모", "#느와르"],
    fallbackGradient: "linear-gradient(135deg, #2a2419, #131313)",
  },
  {
    id: "star_sand_v1",
    name: "극야해안과 별고래의 무덤",
    copy: "죽은 별고래가 해안에 떠밀려 온 뒤, 실종자들의 꿈이 남의 잠으로 흘러듭니다. 오늘 밤은 당신 차례일지도요.",
    tags: ["#극야", "#미스터리"],
    fallbackGradient: "linear-gradient(135deg, #16203a, #0e0e0e)",
  },
  {
    id: "karnholt_v1",
    name: "카른홀트",
    copy: "위조 주화가 돌고, 광부들이 사라졌습니다. 범인은 이미 정해져 있어요 — 아직 아무도 모를 뿐.",
    tags: ["#자율서사", "#추리"],
    fallbackGradient: "linear-gradient(135deg, #33261a, #131313)",
  },
  {
    id: "silverdeen_v1",
    name: "실버딘 은광 마을",
    copy: "무너진 3번 갱도엔 이유가 있습니다. 짧게 한 바퀴 — 여기서 감을 잡고 가세요.",
    tags: ["#입문", "#미니"],
    fallbackGradient: "linear-gradient(135deg, #1f2a26, #0e0e0e)",
  },
] as const;

export function ScenarioCatalog() {
  return (
    <section
      id="worlds"
      className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24"
      aria-label="시나리오 카탈로그"
    >
      <div className="text-center mb-12 sm:mb-16">
        <h2
          className="text-3xl sm:text-4xl mb-4"
          style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#ffdea5" }}
        >
          지금 열려 있는 세계들
        </h2>
        <p className="text-lg break-keep" style={{ color: "#d1c5b4" }}>
          네 개의 도시, 네 가지 골칫거리. 어디부터 발을 담글지만 고르세요.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {SCENARIOS.map((s) => {
          const banner = getScenarioBannerImage(s.id);
          return (
            <Link
              key={s.id}
              href="/play"
              className="group border transition-all duration-500 overflow-hidden hover:border-[rgba(233,193,118,0.4)]"
              style={{
                backgroundColor: "#1c1b1b",
                borderColor: "rgba(78, 70, 57, 0.15)",
              }}
            >
              <div className="relative h-44 sm:h-52 overflow-hidden">
                {banner ? (
                  <Image
                    src={banner}
                    alt={`${s.name} 배경`}
                    fill
                    className="object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    quality={75}
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: s.fallbackGradient }}
                    aria-hidden="true"
                  />
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to top, rgba(19,19,19,0.9), transparent 60%)",
                  }}
                  aria-hidden="true"
                />
                <h3
                  className="absolute bottom-4 left-5 text-xl sm:text-2xl"
                  style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#ffdea5" }}
                >
                  {s.name}
                </h3>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-sm sm:text-base leading-relaxed mb-4 break-keep" style={{ color: "#d1c5b4" }}>
                  {s.copy}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {s.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 border"
                      style={{
                        color: "#9a8f80",
                        borderColor: "rgba(78, 70, 57, 0.4)",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
