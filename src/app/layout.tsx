import type { Metadata } from "next";
import { IBM_Plex_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

// P3-C1: 폰트 블로킹 요청 제거 — next/font 로 로컬 호스팅 + preload + swap
const ibmPlexSansKR = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
  variable: "--font-ibm-plex-sans-kr",
});
const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
  preload: true,
  variable: "--font-noto-serif-kr",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.dimtale.com"),
  title: "DimTale — AI 텍스트 RPG",
  description:
    "AI가 만들어내는 살아있는 판타지 세계. 중세 항만 도시에서 펼쳐지는 몰입형 텍스트 RPG. 당신의 선택이 이야기를 바꿉니다.",
  openGraph: {
    title: "DimTale — AI 텍스트 RPG",
    description:
      "AI가 만들어내는 살아있는 판타지 세계. 중세 항만 도시에서 펼쳐지는 몰입형 텍스트 RPG. 당신의 선택이 이야기를 바꿉니다.",
    siteName: "DimTale",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DimTale — AI 텍스트 RPG",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DimTale — AI 텍스트 RPG",
    description:
      "AI가 만들어내는 살아있는 판타지 세계. 당신의 선택이 이야기를 바꿉니다.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  // NOTE: google-adsense-account 메타는 layout 전역이 아니라 랜딩 page.tsx 에만
  // 선언한다. /play 등 게임 SPA 전환 화면에 자동 광고가 노출돼 AdSense 정책
  // "게시자 콘텐츠가 없는 화면" 위반으로 반려된 이력이 있음.
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "DimTale",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`h-full ${ibmPlexSansKR.variable} ${notoSerifKR.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, viewport-fit=cover"
        />
        {/* P3-C1: next/font 로 전환 — LCP 블로킹 요청 제거 (2026-04-24) */}
        {/* iOS 네이티브 스플래시 — data URI SVG로 모든 해상도 대응 */}
        <link
          rel="apple-touch-startup-image"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 430 932'%3E%3Crect fill='%230F0F0F' width='430' height='932'/%3E%3Ctext x='50%25' y='45%25' text-anchor='middle' font-family='serif' font-size='42' font-weight='700' fill='%23C8A96E'%3EDimTale%3C/text%3E%3Ctext x='50%25' y='52%25' text-anchor='middle' font-family='sans-serif' font-size='14' letter-spacing='4' fill='%23706050'%3EAI TEXT RPG%3C/text%3E%3C/svg%3E"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 393 852'%3E%3Crect fill='%230F0F0F' width='393' height='852'/%3E%3Ctext x='50%25' y='45%25' text-anchor='middle' font-family='serif' font-size='40' font-weight='700' fill='%23C8A96E'%3EDimTale%3C/text%3E%3Ctext x='50%25' y='52%25' text-anchor='middle' font-family='sans-serif' font-size='13' letter-spacing='4' fill='%23706050'%3EAI TEXT RPG%3C/text%3E%3C/svg%3E"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 390 844'%3E%3Crect fill='%230F0F0F' width='390' height='844'/%3E%3Ctext x='50%25' y='45%25' text-anchor='middle' font-family='serif' font-size='40' font-weight='700' fill='%23C8A96E'%3EDimTale%3C/text%3E%3Ctext x='50%25' y='52%25' text-anchor='middle' font-family='sans-serif' font-size='13' letter-spacing='4' fill='%23706050'%3EAI TEXT RPG%3C/text%3E%3C/svg%3E"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 375 812'%3E%3Crect fill='%230F0F0F' width='375' height='812'/%3E%3Ctext x='50%25' y='45%25' text-anchor='middle' font-family='serif' font-size='38' font-weight='700' fill='%23C8A96E'%3EDimTale%3C/text%3E%3Ctext x='50%25' y='52%25' text-anchor='middle' font-family='sans-serif' font-size='12' letter-spacing='4' fill='%23706050'%3EAI TEXT RPG%3C/text%3E%3C/svg%3E"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPad */}
        <link
          rel="apple-touch-startup-image"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 820 1180'%3E%3Crect fill='%230F0F0F' width='820' height='1180'/%3E%3Ctext x='50%25' y='45%25' text-anchor='middle' font-family='serif' font-size='52' font-weight='700' fill='%23C8A96E'%3EDimTale%3C/text%3E%3Ctext x='50%25' y='51%25' text-anchor='middle' font-family='sans-serif' font-size='16' letter-spacing='5' fill='%23706050'%3EAI TEXT RPG%3C/text%3E%3C/svg%3E"
          media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)"
        />
        {/* iOS Safari 핀치줌 차단 — gesturestart/touchmove 이벤트 방지 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('gesturestart',function(e){e.preventDefault()},{passive:false});document.addEventListener('gesturechange',function(e){e.preventDefault()},{passive:false});document.addEventListener('touchmove',function(e){if(e.touches.length>1){e.preventDefault()}},{passive:false});`,
          }}
        />
        {/* Service Worker 등록 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
      </head>
      <body
        className="font-ui h-full bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
