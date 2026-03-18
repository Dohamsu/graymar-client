import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Realm of Shadows",
  description: "LLM-powered turn-based text RPG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-ui h-full bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
