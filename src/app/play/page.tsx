import type { Metadata } from "next";
import GameClient from "../GameClient";

export const metadata: Metadata = {
  title: "그레이마르 — AI 정치 음모 텍스트 RPG | GRAYMAR",
  description:
    "왕국의 항만 도시 그레이마르에서 펼쳐지는 AI 기반 정치 음모 텍스트 RPG. 42명의 NPC, 5개의 권력 투쟁, 3가지 결말. 무료 웹 RPG.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function PlayPage() {
  return <GameClient />;
}
