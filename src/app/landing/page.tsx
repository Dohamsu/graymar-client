import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { FeatureCard } from "./FeatureCard";
import { MobileNav } from "./MobileNav";

/* ─── SEO & AI SEO Metadata ─── */

export const metadata: Metadata = {
  title: "GRAYMAR | 잿빛 항구의 음모 — AI 정치 음모 텍스트 RPG",
  description:
    "왕국의 항만 도시 그레이마르에서 펼쳐지는 AI 기반 정치 음모 텍스트 RPG. 42명의 NPC, 5개의 권력 투쟁, 3가지 결말. 당신의 선택이 역사를 쓴다. 무료 웹 RPG.",
  keywords: [
    "텍스트 RPG",
    "AI RPG",
    "정치 음모 RPG",
    "그레이마르",
    "GRAYMAR",
    "웹 RPG",
    "무료 RPG",
    "인터랙티브 픽션",
    "AI 스토리텔링",
    "턴제 RPG",
    "한국어 RPG",
    "text RPG",
    "AI narrative game",
  ],
  alternates: {
    canonical: "/landing",
  },
  openGraph: {
    title: "GRAYMAR | 잿빛 항구의 음모 — AI 정치 음모 텍스트 RPG",
    description:
      "42명의 NPC와 5개의 권력 투쟁이 얽힌 AI 기반 정치 음모 텍스트 RPG. 당신의 선택이 세계를 바꾼다.",
    siteName: "GRAYMAR",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GRAYMAR — 잿빛 항구의 음모, AI 정치 음모 텍스트 RPG",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GRAYMAR | AI 정치 음모 텍스트 RPG",
    description:
      "42명의 NPC, 5개의 권력 투쟁, 3가지 결말. AI가 만드는 살아있는 세계에서 용병으로 뛰어들어라.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

/* ─── JSON-LD Structured Data for AI SEO ─── */

function JsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "GRAYMAR",
        alternateName: "그레이마르",
        url: "https://graymar.app",
        description:
          "AI 기반 정치 음모 텍스트 RPG. 42명의 NPC와 5개의 권력 투쟁이 얽힌 살아있는 세계.",
        inLanguage: "ko",
      },
      {
        "@type": "VideoGame",
        name: "GRAYMAR — 잿빛 항구의 음모",
        alternateName: ["그레이마르", "Graymar RPG"],
        description:
          "왕국의 항만 도시 그레이마르에서 펼쳐지는 AI 기반 정치 음모 텍스트 RPG. 42명의 NPC, 5개의 독립적 권력 투쟁, 3가지 결말. 이름 없는 용병으로서 당신의 선택이 역사를 쓴다.",
        genre: [
          "텍스트 RPG",
          "인터랙티브 픽션",
          "정치 음모",
          "턴제 전략",
        ],
        gamePlatform: "Web Browser",
        applicationCategory: "Game",
        operatingSystem: "Any",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "KRW",
          availability: "https://schema.org/InStock",
        },
        numberOfPlayers: {
          "@type": "QuantitativeValue",
          value: 1,
        },
        playMode: "SinglePlayer",
        inLanguage: "ko",
        isAccessibleForFree: true,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "GRAYMAR는 어떤 게임인가요?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "GRAYMAR는 AI가 만들어내는 살아있는 세계에서 정치적 음모에 뛰어드는 텍스트 RPG입니다. 42명의 NPC, 5개의 독립적 권력 투쟁, 3가지 결말이 있으며, 플레이어의 선택에 따라 이야기가 달라집니다.",
            },
          },
          {
            "@type": "Question",
            name: "GRAYMAR는 무료인가요?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "네, GRAYMAR는 무료 웹 RPG입니다. 별도의 설치 없이 웹 브라우저에서 바로 플레이할 수 있습니다.",
            },
          },
          {
            "@type": "Question",
            name: "GRAYMAR에서 AI는 어떤 역할을 하나요?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "AI는 플레이어의 선택과 행동을 기억하고, 그에 맞춰 살아있는 내러티브를 생성합니다. 모든 게임 결과는 서버에서 결정론적으로 처리되며, AI는 풍부한 서사 텍스트를 만드는 역할을 합니다.",
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/* ─── Design System: "The Obsidian Ledger" (Gilded Abyss) ───
 * surface:           #131313
 * surface-lowest:    #0e0e0e
 * surface-container: #201f1f
 * surface-high:      #2a2a2a
 * primary:           #ffdea5
 * primary-container: #e9c176
 * on-primary-container: #6a4e0c
 * on-surface:        #e5e2e1
 * on-surface-variant: #d1c5b4
 * outline:           #9a8f80
 * outline-variant:   #4e4639
 * Fonts: Noto Serif (headline), Newsreader (body), Inter (label)
 * Corners: 0px (strict)
 * ─────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#131313",
        color: "#e5e2e1",
        fontFamily: "'Newsreader', serif",
      }}
    >
      <JsonLd />

      {/* ─── Top Nav ─── */}
      <nav
        className="fixed top-0 w-full z-50 border-b"
        style={{
          backgroundColor: "rgba(10, 10, 10, 0.8)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(78, 70, 57, 0.15)",
          boxShadow: "0 10px 30px -15px rgba(0,0,0,0.9)",
        }}
        aria-label="메인 네비게이션"
      >
        <div className="flex justify-between items-center max-w-7xl mx-auto px-4 sm:px-8 h-16 sm:h-20">
          <Link
            href="/landing"
            className="text-xl sm:text-2xl font-bold tracking-tighter uppercase"
            style={{ color: "#e9c176", fontFamily: "'Noto Serif KR', 'Noto Serif', serif" }}
            aria-label="GRAYMAR 홈"
          >
            GRAYMAR
          </Link>
          <div
            className="hidden md:flex items-center gap-10 tracking-tight"
            style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif" }}
          >
            <a href="#world" className="pb-1 border-b-2" style={{ color: "#ffdea5", borderColor: "#e9c176" }}>
              World
            </a>
            <a href="#features" className="hover:opacity-80 transition-colors" style={{ color: "#9a8f80" }}>
              Features
            </a>
            <a href="#story" className="hover:opacity-80 transition-colors" style={{ color: "#9a8f80" }}>
              Lore
            </a>
            <a href="#how-to-play" className="hover:opacity-80 transition-colors" style={{ color: "#9a8f80" }}>
              Guide
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden sm:inline-block px-6 py-2.5 font-bold hover:brightness-110 active:scale-95 transition-all duration-200"
              style={{
                backgroundColor: "#e9c176",
                color: "#6a4e0c",
                fontFamily: "'Noto Serif KR', 'Noto Serif', serif",
              }}
            >
              Play Now
            </Link>
            <MobileNav />
          </div>
        </div>
      </nav>

      <main className="relative">
        {/* ─── Hero Section ─── */}
        <section
          id="world"
          className="relative min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden"
          aria-label="히어로 섹션"
        >
          <div className="absolute inset-0 z-0">
            <Image
              src="/landing/hero.jpg"
              alt="잿빛 항구의 야경 — 안개 낀 중세 부두와 횃불이 비추는 어두운 항만"
              fill
              className="object-cover opacity-40 mix-blend-luminosity"
              priority
              sizes="100vw"
              quality={80}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(19,19,19,0.2), rgba(19,19,19,0.6), #131313)",
              }}
            />
          </div>

          <div className="relative z-10 text-center px-4 max-w-4xl">
            <span
              className="tracking-[0.3em] uppercase mb-4 block animate-pulse text-sm"
              style={{ fontFamily: "'Inter', sans-serif", color: "#ffdea5" }}
            >
              The Shadow of the Kingdom
            </span>
            <h1
              className="text-5xl sm:text-6xl md:text-8xl font-black leading-none tracking-tighter mb-4"
              style={{
                fontFamily: "'Noto Serif KR', 'Noto Serif', serif",
                color: "#ffdea5",
                textShadow: "0 0 15px rgba(233, 193, 118, 0.4)",
              }}
            >
              GRAYMAR
            </h1>
            <p
              className="text-xl sm:text-2xl md:text-3xl mb-8 sm:mb-12 italic"
              style={{
                fontFamily: "'Noto Serif KR', 'Noto Serif', serif",
                color: "#d1c5b4",
              }}
            >
              잿빛 항구의 음모: 당신의 선택이 역사를 쓴다
            </p>
            <div className="flex flex-col items-center gap-4">
              <Link
                href="/"
                className="px-10 sm:px-12 py-3 sm:py-4 font-black text-lg sm:text-xl shadow-xl hover:scale-105 transition-transform"
                style={{
                  backgroundColor: "#e9c176",
                  color: "#6a4e0c",
                  fontFamily: "'Noto Serif KR', 'Noto Serif', serif",
                }}
              >
                지금 플레이
              </Link>
              <p
                className="text-xs tracking-widest uppercase"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9a8f80" }}
              >
                무료 웹 RPG &middot; 설치 불필요
              </p>
            </div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: "rgba(255, 222, 165, 0.5)" }}
            >
              <path
                d="M7 10l5 5 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </section>

        {/* ─── Features Section ─── */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24" aria-label="주요 특징">
          <div className="flex items-center gap-4 sm:gap-8 mb-12 sm:mb-20">
            <div
              className="flex-grow"
              style={{
                height: "1px",
                background: "linear-gradient(90deg, transparent, #4e4639 50%, transparent)",
              }}
              aria-hidden="true"
            />
            <h2
              className="text-2xl sm:text-4xl shrink-0 uppercase tracking-widest"
              style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#ffdea5" }}
            >
              Crucial Artifacts
            </h2>
            <div
              className="flex-grow"
              style={{
                height: "1px",
                background: "linear-gradient(90deg, transparent, #4e4639 50%, transparent)",
              }}
              aria-hidden="true"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <FeatureCard
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              }
              title="정치적 음모"
              desc="5개의 독립적 권력 투쟁이 항구의 운명을 결정짓는다. 밀수, 부패, 절도, 파업, 암살 — 각 사건이 세계를 흔든다."
            />
            <FeatureCard
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              }
              title="42명의 NPC"
              desc="숨겨진 의도와 깊은 배경을 가진 살아있는 캐릭터들. 5축 감정 시스템으로 당신의 행동에 반응한다."
            />
            <FeatureCard
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                </svg>
              }
              title="AI 내러티브"
              desc="플레이어의 선택을 기억하는 AI가 만드는 고유한 이야기. 구조화된 메모리와 토큰 예산으로 일관된 서사를 유지한다."
            />
            <FeatureCard
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 7l6-6 4 4-6 6M3 3l18 18" />
                </svg>
              }
              title="전략적 전투"
              desc="거리와 각도 기반 전술 전투. 근접, 원거리, 방어, 회피 — 모든 선택이 생존에 영향을 미친다."
            />
          </div>
        </section>

        {/* ─── Story Preview Section ─── */}
        <section id="story" className="relative py-20 sm:py-32 overflow-hidden" aria-label="스토리 미리보기">
          <div className="absolute inset-0 z-0">
            <Image
              src="/landing/story-bg.jpg"
              alt="비 오는 중세 골목길을 걷는 망토 입은 인물"
              fill
              className="object-cover opacity-20"
              sizes="100vw"
              quality={75}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to right, #131313, rgba(19,19,19,0.8), transparent)",
              }}
            />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-2 items-center gap-10 sm:gap-16">
            <div className="space-y-6 sm:space-y-8">
              <div className="w-12 h-1" style={{ backgroundColor: "#ffdea5" }} aria-hidden="true" />
              <h2
                className="text-3xl sm:text-5xl"
                style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#e5e2e1" }}
              >
                바다를 건너온 이방인,
                <br />
                잿빛 항구에 도착하다.
              </h2>
              <div className="space-y-6 text-lg sm:text-xl italic leading-relaxed max-w-lg" style={{ color: "#d1c5b4" }}>
                <p>
                  &ldquo;비린내 섞인 해풍이 뺨을 스친다. 이름 없는 용병으로서 당신이 이곳에 발을 딛는
                  순간, 항구의 그림자는 길게 늘어져 당신을 삼킬 준비를 한다.&rdquo;
                </p>
                <p>
                  &ldquo;철문 너머 들리는 속삭임, 은밀한 거래, 그리고 왕좌를 노리는 자들의 피 냄새...
                  GRAYMAR에서 당신은 사냥꾼이 될 것인가, 혹은 먹잇감이 될 것인가?&rdquo;
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-4 text-lg group"
                style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#ffdea5" }}
              >
                지금 시작하기
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="group-hover:translate-x-2 transition-transform"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="hidden md:block relative group">
              <div
                className="absolute inset-0 border -translate-x-4 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500"
                style={{ borderColor: "rgba(255, 222, 165, 0.2)" }}
                aria-hidden="true"
              />
              <Image
                src="/landing/document.jpg"
                alt="봉인된 왕실 문서 — 비밀스러운 정치 음모의 증거"
                width={600}
                height={500}
                className="relative z-10 w-full h-[500px] object-cover border"
                style={{ borderColor: "rgba(78, 70, 57, 0.3)" }}
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={80}
              />
            </div>
          </div>
        </section>

        {/* ─── How to Play Section ─── */}
        <section id="how-to-play" className="py-20 sm:py-32" style={{ backgroundColor: "#0e0e0e" }} aria-label="플레이 가이드">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="text-center mb-12 sm:mb-20">
              <h2
                className="text-3xl sm:text-4xl mb-4"
                style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#ffdea5" }}
              >
                여정의 시작
              </h2>
              <p className="text-lg" style={{ color: "#d1c5b4" }}>
                단 세 번의 숨결로 시작되는 전설
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
              {[
                {
                  step: "01",
                  title: "프리셋 선택",
                  desc: "부두 노동자, 탈영병, 밀수업자, 약초사 — 당신의 출신이 항구에서의 초기 영향력과 위치를 결정한다.",
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  ),
                },
                {
                  step: "02",
                  title: "자유 탐험",
                  desc: "7개 장소를 오가며 NPC와 대화하고, 사건을 조사하고, 동맹을 맺어라. 당신만의 길을 개척한다.",
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z" />
                    </svg>
                  ),
                },
                {
                  step: "03",
                  title: "세 갈래 결말",
                  desc: "부패 폭로, 혼돈에서 이익, 경비대 동맹 — 당신의 결정이 세 가지 역사적 전환점 중 하나로 귀결된다.",
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div key={item.step} className="text-center group">
                  <div className="relative inline-block mb-6 sm:mb-8">
                    <div
                      className="w-20 h-20 rounded-full border flex items-center justify-center transition-colors"
                      style={{
                        borderColor: "rgba(255, 222, 165, 0.3)",
                        backgroundColor: "rgba(53, 53, 52, 0.6)",
                        backdropFilter: "blur(20px)",
                        color: "#ffdea5",
                      }}
                    >
                      {item.icon}
                    </div>
                    <span
                      className="absolute -top-2 -right-2 text-3xl opacity-20"
                      style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#ffdea5" }}
                      aria-hidden="true"
                    >
                      {item.step}
                    </span>
                  </div>
                  <h3
                    className="text-xl sm:text-2xl mb-3 sm:mb-4"
                    style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#e5e2e1" }}
                  >
                    {item.title}
                  </h3>
                  <p className="leading-relaxed" style={{ color: "#d1c5b4" }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA Final ─── */}
        <section className="py-20 sm:py-32 flex flex-col items-center justify-center relative overflow-hidden" aria-label="게임 시작">
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(255, 222, 165, 0.05)",
              maskImage: "radial-gradient(circle, white, transparent)",
              WebkitMaskImage: "radial-gradient(circle, white, transparent)",
            }}
            aria-hidden="true"
          />
          <h2
            className="text-4xl sm:text-5xl md:text-6xl mb-8 sm:mb-12 text-center max-w-2xl px-4"
            style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#e5e2e1" }}
          >
            당신의 연대기를 지금 시작하십시오.
          </h2>
          <Link
            href="/"
            className="px-12 sm:px-16 py-5 sm:py-6 font-black text-xl sm:text-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all"
            style={{
              backgroundColor: "#e9c176",
              color: "#6a4e0c",
              fontFamily: "'Noto Serif KR', 'Noto Serif', serif",
            }}
          >
            PLAY NOW
          </Link>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer
        className="w-full pt-16 sm:pt-20 pb-10 border-t"
        style={{ backgroundColor: "#0e0e0e", borderColor: "rgba(78, 70, 57, 0.1)" }}
        aria-label="푸터"
      >
        <div className="flex flex-col items-center gap-6 sm:gap-8 px-4 text-center">
          <div
            className="text-lg tracking-widest uppercase"
            style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#9a8f80" }}
          >
            GRAYMAR
          </div>
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 italic text-sm">
            <Link href="/landing" className="hover:opacity-80 transition-opacity duration-300" style={{ color: "#9a8f80" }}>
              Home
            </Link>
            <a href="#features" className="hover:opacity-80 transition-opacity duration-300" style={{ color: "#9a8f80" }}>
              Features
            </a>
            <a href="#story" className="hover:opacity-80 transition-opacity duration-300" style={{ color: "#9a8f80" }}>
              Lore
            </a>
            <a href="#how-to-play" className="hover:opacity-80 transition-opacity duration-300" style={{ color: "#9a8f80" }}>
              Guide
            </a>
          </div>
          <p
            className="text-[10px] tracking-[0.2em] mt-6 sm:mt-8 uppercase opacity-50"
            style={{ fontFamily: "'Inter', sans-serif", color: "#9a8f80" }}
          >
            &copy; 2025 GRAYMAR. AI-powered text RPG.
          </p>
        </div>
      </footer>
    </div>
  );
}
