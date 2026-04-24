"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const wasOffline = useRef(false);
  const reconnectToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // P1-C2: 재연결 전환 공통 로직 — cascade setState 대신 microtask 로 defer
  const transitionToOnline = useCallback((markAsReconnected: boolean) => {
    queueMicrotask(() => {
      setIsOffline(false);
      if (markAsReconnected) {
        setShowReconnected(true);
        wasOffline.current = false;
        if (reconnectToastTimerRef.current) {
          clearTimeout(reconnectToastTimerRef.current);
        }
        reconnectToastTimerRef.current = setTimeout(
          () => setShowReconnected(false),
          3000,
        );
      }
    });
  }, []);

  useEffect(() => {
    const handleOnline = () => transitionToOnline(wasOffline.current);
    const handleOffline = () => {
      setIsOffline(true);
      wasOffline.current = true;
      setCountdown(5);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 초기 상태
    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectToastTimerRef.current) {
        clearTimeout(reconnectToastTimerRef.current);
        reconnectToastTimerRef.current = null;
      }
    };
  }, [transitionToOnline]);

  // 카운트다운 (재연결 확인)
  useEffect(() => {
    if (!isOffline) return;
    if (countdown <= 0) {
      // navigator.onLine 으로 재확인 — setState 는 microtask 안에서 처리
      if (navigator.onLine) {
        transitionToOnline(true);
      } else {
        queueMicrotask(() => setCountdown(5));
      }
      return;
    }
    const timer = setTimeout(() => setCountdown((p) => p - 1), 1000);
    return () => clearTimeout(timer);
  }, [isOffline, countdown, transitionToOnline]);

  // 오프라인 오버레이
  if (isOffline) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--hp-red)]/30 bg-[var(--bg-card)] px-8 py-6 shadow-lg animate-[fadeFromBlack_0.5s_ease-out]">
          {/* 끊어진 연결 아이콘 */}
          <div className="flex items-center gap-2 text-2xl" style={{ color: 'var(--hp-red)' }}>
            <span>⛓️‍💥</span>
          </div>
          <p className="font-display text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            연결이 끊어졌습니다
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            재연결 시도 중... {countdown > 0 ? `${countdown}초` : '연결 중...'}
          </p>
          {/* 재연결 프로그레스 */}
          <div className="h-1 w-32 overflow-hidden rounded-full bg-[var(--border-primary)]">
            <div
              className="h-full rounded-full bg-[var(--hp-red)] transition-all duration-1000 ease-linear"
              style={{ width: `${((5 - countdown) / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 재연결 성공 토스트
  if (showReconnected) {
    return (
      <div className="fixed top-4 left-1/2 z-[100] -translate-x-1/2 animate-[fadeIn_0.3s_ease-out]">
        <div
          className="flex items-center gap-2 rounded-lg border px-4 py-2"
          style={{
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            borderColor: 'rgba(76, 175, 80, 0.3)',
            boxShadow: '0 0 12px rgba(76, 175, 80, 0.2)',
          }}
        >
          <span className="text-sm">✅</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--success-green)' }}>
            연결이 복구되었습니다
          </span>
        </div>
      </div>
    );
  }

  return null;
}
