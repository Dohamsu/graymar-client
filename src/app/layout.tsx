import type { Metadata } from "next";
import "./globals.css";

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
  other: {
    "google-adsense-account": "ca-pub-3400073425613266",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "GRAYMAR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, viewport-fit=cover"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router: Google Fonts via link is intentional */}
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
        {/* iOS Safari 핀치줌 차단 — gesturestart/touchmove 이벤트 방지 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('gesturestart',function(e){e.preventDefault()},{passive:false});document.addEventListener('gesturechange',function(e){e.preventDefault()},{passive:false});document.addEventListener('touchmove',function(e){if(e.touches.length>1){e.preventDefault()}},{passive:false});`,
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
