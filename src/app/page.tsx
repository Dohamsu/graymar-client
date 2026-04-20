import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { FeatureCard } from "./landing/FeatureCard";
import { MobileNav } from "./landing/MobileNav";
import { AuthRedirect } from "./landing/AuthRedirect";

/* ─── SEO & AI SEO Metadata ─── */

export const metadata: Metadata = {
  title: "DIMTALE — 잿빛 항구의 음모 | 텍스트 RPG",
  description:
    "부패한 총독, 파업 직전의 부두, 뒷골목의 밀수품. 이름 없는 용병으로 잿빛 항구에 도착한 당신의 첫 밤. 40명이 넘는 인물이 당신의 모든 선택을 기억한다.",
  keywords: [
    "텍스트 RPG",
    "AI RPG",
    "TRPG",
    "DimTale",
    "웹 RPG",
    "무료 RPG",
    "인터랙티브 픽션",
    "AI 스토리텔링",
    "턴제 RPG",
    "한국어 RPG",
    "text RPG",
    "AI narrative game",
    "판타지 RPG",
    "멀티플레이 RPG",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "DIMTALE — 잿빛 항구의 음모",
    description:
      "이름 없는 용병으로 도착한 당신의 첫 밤. 부패한 총독, 파업 직전의 부두, 뒷골목의 밀수품이 기다린다.",
    siteName: "DIMTALE",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DIMTALE — 잿빛 항구의 음모",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DIMTALE — 잿빛 항구의 음모",
    description:
      "이름 없는 용병으로 도착한 당신의 첫 밤. 누구의 손을 잡을지, 등을 돌릴지, 여기선 전부 당신 몫이다.",
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
  // AdSense 자동 광고는 랜딩 페이지에서만 활성화한다. /play 등 게임 SPA의
  // 로딩·전환·에러 화면에 광고가 실려 정책 "게시자 콘텐츠가 없는 화면" 위반
  // 으로 반려된 이력이 있어 전역 layout 대신 이 페이지에서만 선언.
  other: {
    "google-adsense-account": "ca-pub-3400073425613266",
  },
};

/* ─── JSON-LD Structured Data for AI SEO ─── */

function JsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "DIMTALE",
        alternateName: "그레이마르",
        url: "https://www.dimtale.com",
        description:
          "잿빛 항구 그레이마르에서 펼쳐지는 텍스트 RPG. 부패와 밀수, 음모가 얽힌 도시에서 이름 없는 용병의 첫 밤이 시작된다.",
        inLanguage: "ko",
      },
      {
        "@type": "VideoGame",
        name: "DIMTALE — 잿빛 항구의 음모",
        alternateName: ["그레이마르", "Graymar RPG"],
        description:
          "왕국의 항만 도시 그레이마르. 부패한 총독, 파업 직전의 부두, 뒷골목의 밀수품이 동시에 움직인다. 이름 없는 용병으로 도착한 당신의 선택이 도시의 다음 밤을 바꾼다. 40명이 넘는 인물이 당신의 행동을 기억한다.",
        genre: [
          "텍스트 RPG",
          "인터랙티브 픽션",
          "판타지 모험",
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
            name: "어떤 게임인가요?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "이름 없는 용병이 되어 잿빛 항구 그레이마르에 도착하는 텍스트 RPG입니다. 부패한 총독, 파업 직전의 부두, 뒷골목의 밀수품이 동시에 움직이고, 40명이 넘는 인물이 당신의 모든 행동을 기억합니다.",
            },
          },
          {
            "@type": "Question",
            name: "무료인가요?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "네, 전부 무료입니다. 별도 설치 없이 웹 브라우저에서 바로 플레이할 수 있습니다.",
            },
          },
          {
            "@type": "Question",
            name: "AI는 어떤 역할을 하나요?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "상황의 묘사와 NPC 대사를 매 턴 새로 씁니다. 주사위·스탯·판정 같은 게임 규칙은 전부 서버가 결정합니다. AI는 작가, 서버는 게임 마스터라고 보시면 됩니다.",
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

export default function HomePage() {
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
      {/* 로그인 세션 감지 시 /play로 리다이렉트 */}
      <AuthRedirect />

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
            href="/"
            className="text-xl sm:text-2xl font-bold tracking-tighter uppercase"
            style={{ color: "#e9c176", fontFamily: "'Noto Serif KR', 'Noto Serif', serif" }}
            aria-label="DIMTALE 홈"
          >
            DIMTALE
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
            <a href="#gameplay" className="hover:opacity-80 transition-colors" style={{ color: "#9a8f80" }}>
              Gameplay
            </a>
            <a href="#how-to-play" className="hover:opacity-80 transition-colors" style={{ color: "#9a8f80" }}>
              Guide
            </a>
            <a href="#faq" className="hover:opacity-80 transition-colors" style={{ color: "#9a8f80" }}>
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/play"
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
            {/* 배경 영상 (자동 재생, 음소거, 반복) */}
            <video
              autoPlay
              muted
              loop
              playsInline
              poster="/landing/hero.jpg"
              className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-luminosity"
            >
              <source src="/videos/landing-hero-1.mp4" type="video/mp4" />
            </video>
            {/* 영상 미지원 시 fallback 이미지 */}
            <noscript>
              <Image
                src="/landing/hero.jpg"
                alt="잿빛 항구의 야경"
                fill
                className="object-cover opacity-40 mix-blend-luminosity"
                priority
                sizes="100vw"
                quality={80}
              />
            </noscript>
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
              TEXT RPG &middot; 잿빛 항구
            </span>
            <h1
              className="text-5xl sm:text-6xl md:text-8xl font-black leading-none tracking-tighter mb-4"
              style={{
                fontFamily: "'Noto Serif KR', 'Noto Serif', serif",
                color: "#ffdea5",
                textShadow: "0 0 15px rgba(233, 193, 118, 0.4)",
              }}
            >
              DIMTALE
            </h1>
            <p
              className="text-xl sm:text-2xl md:text-3xl mb-4 sm:mb-6"
              style={{
                fontFamily: "'Noto Serif KR', 'Noto Serif', serif",
                color: "#d1c5b4",
              }}
            >
              당신은 방금 막 도착했고, 이 도시는 당신을 시험한다.
            </p>
            <p
              className="text-base sm:text-lg mb-8 sm:mb-12 max-w-xl mx-auto leading-relaxed"
              style={{ color: "#9a8f80" }}
            >
              부패한 총독, 파업 직전의 부두, 뒷골목의 밀수품.
              <br className="hidden sm:block" />
              누구의 손을 잡을지, 등을 돌릴지, 여기선 전부 당신 몫이다.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Link
                href="/play"
                className="px-10 sm:px-12 py-3 sm:py-4 font-black text-lg sm:text-xl shadow-xl hover:scale-105 transition-transform"
                style={{
                  backgroundColor: "#e9c176",
                  color: "#6a4e0c",
                  fontFamily: "'Noto Serif KR', 'Noto Serif', serif",
                }}
              >
                첫 밤을 시작한다
              </Link>
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
              Your World, Your Rules
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
              title="얽힌 음모"
              desc="5개의 사건이 동시에 움직인다. 당신이 한 사건에 개입하는 순간, 다른 넷이 방향을 바꾼다."
            />
            <FeatureCard
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              }
              title="숨 쉬는 인물들"
              desc="40명이 넘는 인물이 각자 원하는 것을 가졌다. 당신이 어제 한 말을 오늘 그들이 꺼낸다."
            />
            <FeatureCard
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                </svg>
              }
              title="두 번 없는 길"
              desc="같은 길은 두 번 열리지 않는다. 지난 런에서 죽은 사람도, 남긴 빚도 다음 런에선 다른 모습이다."
            />
            <FeatureCard
              icon={
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 7l6-6 4 4-6 6M3 3l18 18" />
                </svg>
              }
              title="칼날 위의 선택"
              desc="거리와 각도를 읽어라. 검 한 번의 빗맞음이 도시의 판을 뒤집는다."
            />
          </div>
        </section>

        {/* ─── Game Intro Video Section ─── */}
        <section className="py-16 sm:py-24" aria-label="게임 소개 영상">
          <div className="max-w-5xl mx-auto px-4 sm:px-8">
            <div className="flex items-center gap-4 sm:gap-8 mb-10 sm:mb-16">
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
                Game Preview
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
            <div
              className="relative overflow-hidden shadow-2xl"
              style={{
                border: "1px solid rgba(78, 70, 57, 0.3)",
                backgroundColor: "#0e0e0e",
              }}
            >
              <video
                controls
                playsInline
                preload="metadata"
                poster="/landing/hero.jpg"
                className="w-full aspect-video"
                style={{ backgroundColor: "#0e0e0e" }}
              >
                <source src="/videos/landing-hero-2.mp4" type="video/mp4" />
                브라우저에서 영상을 재생할 수 없습니다.
              </video>
            </div>
            <p
              className="text-center mt-6 text-sm tracking-wide"
              style={{ color: "#9a8f80" }}
            >
              매 플레이마다 다른 이야기 — 같은 길은 두 번 열리지 않는다
            </p>
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
                &ldquo;환영한다, 이방인.
                <br />
                이곳에선 아무도 믿지 마.&rdquo;
              </h2>
              <div className="space-y-6 text-lg sm:text-xl italic leading-relaxed max-w-lg" style={{ color: "#d1c5b4" }}>
                <p>
                  항구에 도착한 첫날, 총독의 부관이 당신에게 묵직한 주머니를 건넨다.
                  거절하면 적이 되고, 받으면 공범이 된다.
                </p>
                <p>
                  부두에서는 노동자들이 파업을 준비하고, 뒷골목에서는 밀수품이 오간다.
                  경비대장은 당신을 이용하려 하고, 밀수업자는 당신의 침묵을 산다.
                  누구의 손을 잡을 것인가?
                </p>
              </div>
              <Link
                href="/play"
                className="inline-flex items-center gap-4 text-lg group"
                style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#ffdea5" }}
              >
                그 첫날부터 시작한다
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
                alt="봉인된 왕실 문서 — 비밀스러운 판타지 모험의 증거"
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

        {/* ─── Screenshot Section ─── */}
        <section id="gameplay" className="py-20 sm:py-32" style={{ backgroundColor: "#0e0e0e" }} aria-label="게임 플레이 화면">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2
                className="text-3xl sm:text-4xl mb-4"
                style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#ffdea5" }}
              >
                실제 게임 화면
              </h2>
              <p className="text-lg" style={{ color: "#d1c5b4" }}>
                한 문장의 선택이 도시의 다음 밤을 바꾼다
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
              {/* Desktop screenshot */}
              <div className="relative max-w-4xl flex-1">
                <div
                  className="absolute inset-0 -m-2 border hidden md:block"
                  style={{ borderColor: "rgba(255, 222, 165, 0.15)" }}
                  aria-hidden="true"
                />
                <Image
                  src="/landing/screenshot-desktop.jpg"
                  alt="DIMTALE 데스크톱 플레이 화면 — NPC 대화, 선택지, 캐릭터 정보 패널"
                  width={1200}
                  height={675}
                  className="relative z-10 w-full border"
                  style={{ borderColor: "rgba(78, 70, 57, 0.3)" }}
                  sizes="(max-width: 1280px) 100vw, 900px"
                  quality={90}
                />
                <p className="text-center mt-3 text-sm" style={{ color: "#9a8f80" }}>데스크톱</p>
              </div>
              {/* Mobile screenshot */}
              <div className="relative w-48 sm:w-56 shrink-0">
                <div
                  className="absolute inset-0 -m-1.5 border rounded-2xl"
                  style={{ borderColor: "rgba(255, 222, 165, 0.15)" }}
                  aria-hidden="true"
                />
                <Image
                  src="/landing/screenshot-mobile.jpg"
                  alt="DIMTALE 모바일 플레이 화면 — 장면 이미지와 NPC 대화가 보이는 스마트폰 화면"
                  width={390}
                  height={844}
                  className="relative z-10 w-full rounded-xl border"
                  style={{ borderColor: "rgba(78, 70, 57, 0.3)" }}
                  sizes="224px"
                  quality={90}
                />
                <p className="text-center mt-3 text-sm" style={{ color: "#9a8f80" }}>모바일</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 sm:mt-16 max-w-4xl mx-auto">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "#ffdea5", fontFamily: "'Noto Serif KR', serif" }}>40+</p>
                <p style={{ color: "#9a8f80" }}>당신을 기억하는 인물</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "#ffdea5", fontFamily: "'Noto Serif KR', serif" }}>7</p>
                <p style={{ color: "#9a8f80" }}>숨은 거점</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "#ffdea5", fontFamily: "'Noto Serif KR', serif" }}>매 런</p>
                <p style={{ color: "#9a8f80" }}>새로 열리는 도시</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FAQ Section ─── */}
        <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-8 py-16 sm:py-24" aria-label="자주 묻는 질문">
          <h2
            className="text-3xl sm:text-4xl mb-12 text-center"
            style={{ fontFamily: "'Noto Serif KR', 'Noto Serif', serif", color: "#ffdea5" }}
          >
            자주 묻는 질문
          </h2>
          <div className="space-y-6">
            {[
              { q: "어떤 게임인가요?", a: "이름 없는 용병이 되어 잿빛 항구 그레이마르에 도착하는 텍스트 RPG입니다. 부패한 총독, 파업 직전의 부두, 뒷골목의 밀수품이 동시에 움직이고, 40명이 넘는 인물이 당신의 모든 행동을 기억합니다. 파티로 함께 도시를 뒤집을 수도 있습니다." },
              { q: "무료인가요?", a: "네, 전부 무료입니다. PC·모바일 브라우저에서 바로 플레이하며, 가입은 30초면 끝납니다." },
              { q: "AI는 어떤 역할을 하나요?", a: "상황의 묘사와 NPC 대사를 매 턴 새로 씁니다. 주사위·스탯·판정 같은 게임 규칙은 전부 서버가 결정합니다. AI는 작가, 서버는 게임 마스터라고 보시면 됩니다." },
              { q: "한 번의 플레이는 얼마나 걸리나요?", a: "한 판은 보통 20~30턴, 30분에서 한 시간 정도입니다. 중간 저장되니 언제든 끊고 돌아오세요. 출신과 선택이 달라지면 도시도 다른 모습으로 열립니다." },
              { q: "모바일에서도 되나요?", a: "네, 모바일 브라우저에 맞춰 있습니다. 선택지는 터치로, 자유 행동은 직접 입력창에 적으면 됩니다." },
              { q: "캐릭터는 어떻게 만드나요?", a: "부두 노동자·탈영병·밀수업자·약초사·몰락 귀족·떠돌이 검투사 중에서 고르고, 이름과 외모를 정한 뒤 보너스 스탯을 나눠 씁니다. 초상화는 직접 그리거나 AI 생성을 쓸 수 있습니다." },
            ].map((item, i) => (
              <details key={i} className="group border-b" style={{ borderColor: "rgba(78, 70, 57, 0.2)" }}>
                <summary
                  className="flex items-center justify-between cursor-pointer py-5 text-lg"
                  style={{ fontFamily: "'Noto Serif KR', serif", color: "#e5e2e1" }}
                >
                  {item.q}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 ml-4 group-open:rotate-180 transition-transform" style={{ color: "#9a8f80" }} aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p className="pb-5 leading-relaxed" style={{ color: "#d1c5b4" }}>{item.a}</p>
              </details>
            ))}
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
                3분이면 잿빛 항구에 선다
              </h2>
              <p className="text-lg" style={{ color: "#d1c5b4" }}>
                출신을 고르고, 이름을 짓고, 첫 밤으로 들어간다
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
              {[
                {
                  step: "01",
                  title: "출신을 고른다",
                  desc: "탈영병, 밀수업자, 몰락 귀족. 어디서 왔는지가 누가 먼저 말을 거는지를 정한다.",
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  ),
                },
                {
                  step: "02",
                  title: "원하는 대로 움직인다",
                  desc: "시장에서 정보를 사고, 뒷골목을 엿보고, 관저에 잠입한다. 입력창에 그대로 적으면 된다.",
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z" />
                    </svg>
                  ),
                },
                {
                  step: "03",
                  title: "그 결과를 살아낸다",
                  desc: "배신은 기억되고, 은혜는 돌아온다. 어떤 선택도 없던 일이 되진 않는다.",
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
            잿빛 항구의 첫 밤이 열려 있다.
          </h2>
          <Link
            href="/play"
            className="px-12 sm:px-16 py-5 sm:py-6 font-black text-xl sm:text-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all"
            style={{
              backgroundColor: "#e9c176",
              color: "#6a4e0c",
              fontFamily: "'Noto Serif KR', 'Noto Serif', serif",
            }}
          >
            첫 밤을 시작한다
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
            DIMTALE
          </div>
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 italic text-sm">
            <Link href="/" className="hover:opacity-80 transition-opacity duration-300" style={{ color: "#9a8f80" }}>
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
            &copy; 2026 DIMTALE. 잿빛 항구에서 만난다.
          </p>
        </div>
      </footer>
    </div>
  );
}
