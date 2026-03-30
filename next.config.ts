import type { NextConfig } from "next";

const backendUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  devIndicators: false,
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
    ];
  },
};

export default nextConfig;
