import type { NextConfig } from "next";
import { execSync } from "node:child_process";

const backendUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const clientVersion = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
})();

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_CLIENT_VERSION: clientVersion,
  },
  // 외부 접속 시 /v1/* 요청을 백엔드 서버로 프록시
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: `${backendUrl}/v1/:path*`,
      },
      {
        source: "/scene-images/:path*",
        destination: `${backendUrl}/scene-images/:path*`,
      },
      {
        source: "/portraits/generated/:path*",
        destination: `${backendUrl}/portraits/generated/:path*`,
      },
      {
        source: "/npc-portraits/:path*",
        destination: `${backendUrl}/npc-portraits/:path*`,
      },
    ];
  },
};

export default nextConfig;
