"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-primary, #0F0F0F)",
        color: "var(--text-primary, #FAF8F5)",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "28rem",
          width: "100%",
          border: "1px solid var(--border-primary, #1F1F1F)",
          borderRadius: "0.5rem",
          backgroundColor: "var(--bg-card, #141414)",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "3rem",
            height: "3rem",
            margin: "0 auto 1.25rem",
            borderRadius: "9999px",
            border: "2px solid var(--gold, #C9A962)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.25rem",
            color: "var(--gold, #C9A962)",
          }}
        >
          !
        </div>
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
            color: "var(--gold, #C9A962)",
          }}
        >
          오류가 발생했습니다
        </h2>
        <p
          style={{
            fontSize: "0.875rem",
            lineHeight: 1.6,
            color: "var(--text-muted, #666666)",
            marginBottom: "1.5rem",
          }}
        >
          {error.message || "알 수 없는 오류가 발생했습니다."}
        </p>
        {error.digest && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted, #666666)",
              marginBottom: "1rem",
              fontFamily: "monospace",
            }}
          >
            Digest: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            padding: "0.625rem 1.5rem",
            borderRadius: "0.375rem",
            border: "1px solid var(--gold, #C9A962)",
            backgroundColor: "transparent",
            color: "var(--gold, #C9A962)",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
