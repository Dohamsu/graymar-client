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
  images: {
    // 실제 사용 크기에 맞춘 imageSizes (40~320px 범위의 고정 크기 이미지)
    imageSizes: [40, 56, 64, 80, 110, 144, 288, 320],
    // 뷰포트 기반 이미지 (LocationImage 등)
    deviceSizes: [640, 750, 828, 1080, 1200],
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
        source: "/portraits/uploaded/:path*",
        destination: `${backendUrl}/portraits/uploaded/:path*`,
      },
    ];
  },
};

export default nextConfig;
