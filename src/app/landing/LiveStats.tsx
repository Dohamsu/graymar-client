/**
 * 사회적 증명 실데이터 (arch/90 P4) — GET /v1/stats/public (테스터 제외 누적 턴·런).
 * ISR 1시간 revalidate. API 실패·소표본(턴 < 500)이면 기존 콘텐츠 스펙 수치로 fallback —
 * 작은 숫자를 내세우면 역효과라 실데이터는 표본이 쌓인 뒤에만 노출한다.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const MIN_TURNS_TO_SHOW = 500;

interface PublicStats {
  totalTurns: number;
  totalRuns: number;
}

async function fetchPublicStats(): Promise<PublicStats | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/stats/public`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<PublicStats>;
    if (
      typeof data.totalTurns !== "number" ||
      typeof data.totalRuns !== "number"
    ) {
      return null;
    }
    return { totalTurns: data.totalTurns, totalRuns: data.totalRuns };
  } catch {
    return null;
  }
}

export async function LiveStats() {
  const stats = await fetchPublicStats();
  const live = stats !== null && stats.totalTurns >= MIN_TURNS_TO_SHOW;

  const items = live
    ? [
        {
          value: `${stats.totalTurns.toLocaleString("ko-KR")}턴`,
          label: "지금까지 쌓인 이야기",
        },
        {
          value: `${stats.totalRuns.toLocaleString("ko-KR")}번`,
          label: "시작된 첫 밤",
        },
        { value: "40+", label: "당신을 기억할 인물" },
      ]
    : [
        { value: "40+", label: "당신을 기억하는 인물" },
        { value: "7", label: "숨은 거점" },
        { value: "매 런", label: "새로 열리는 도시" },
      ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 sm:mt-16 max-w-4xl mx-auto">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <p
            className="text-2xl sm:text-3xl font-bold mb-2"
            style={{ color: "#ffdea5", fontFamily: "'Noto Serif KR', serif" }}
          >
            {item.value}
          </p>
          <p style={{ color: "#9a8f80" }}>{item.label}</p>
        </div>
      ))}
    </div>
  );
}
