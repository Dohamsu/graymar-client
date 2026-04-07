import type { Metadata } from "next";
import GameClient from "../GameClient";

export const metadata: Metadata = {
  title: "DimTale — AI 텍스트 RPG",
  description:
    "AI가 만들어내는 몰입형 판타지 텍스트 RPG. 당신의 선택이 이야기를 바꿉니다.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function PlayPage() {
  return <GameClient />;
}
