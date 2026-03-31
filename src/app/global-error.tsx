"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F0F0F",
          color: "#FAF8F5",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            width: "100%",
            border: "1px solid #1F1F1F",
            borderRadius: "0.5rem",
            backgroundColor: "#141414",
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
              border: "2px solid #C9A962",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              color: "#C9A962",
            }}
          >
            !
          </div>
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
              color: "#C9A962",
            }}
          >
            치명적 오류
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#666666",
              marginBottom: "1.5rem",
            }}
          >
            {error.message || "앱에 치명적인 오류가 발생했습니다."}
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#666666",
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
              border: "1px solid #C9A962",
              backgroundColor: "transparent",
              color: "#C9A962",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
