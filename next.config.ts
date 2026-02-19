import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 외부 접속 시 /v1/* 요청을 백엔드 서버로 프록시
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: "http://localhost:3000/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
