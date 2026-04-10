"use client";

import { useState, useEffect } from "react";

/**
 * InstallPrompt — PWA 설치 배너
 * beforeinstallprompt 이벤트를 가로채서 커스텀 UI로 표시
 * 이미 설치됐거나 standalone 모드면 표시 안 함
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 이미 설치된 PWA면 표시 안 함
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // 이전에 닫은 적 있으면 24시간 동안 표시 안 함
    const lastDismissed = localStorage.getItem("pwa-install-dismissed");
    if (lastDismissed && Date.now() - parseInt(lastDismissed) < 24 * 60 * 60 * 1000) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
    setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-sm animate-in slide-in-from-bottom duration-500 md:left-auto md:right-6 md:max-w-xs">
      <div className="rounded-xl border border-[var(--gold)]/20 bg-[var(--bg-secondary)] p-4 shadow-lg shadow-black/40">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon-192.png"
              alt="DimTale"
              className="h-10 w-10 rounded-lg"
            />
            <div>
              <p className="font-display text-sm font-semibold text-[var(--text-primary)]">
                DimTale 앱 설치
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                홈 화면에서 바로 실행
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="닫기"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="w-full rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] transition-colors hover:bg-[var(--gold)]/80"
        >
          설치하기
        </button>
      </div>
    </div>
  );
}
