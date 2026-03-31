"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "graymar_auth_token";

/**
 * 로그인 세션이 남아있으면 /play로 리다이렉트.
 * 서버 컴포넌트인 랜딩 페이지에 삽입되는 클라이언트 컴포넌트.
 */
export function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    try {
      const token = localStorage.getItem(STORAGE_KEY);
      if (!token) return;

      // JWT 만료 확인 (만료된 토큰이면 리다이렉트하지 않음)
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp;
      if (exp && Date.now() / 1000 > exp) return;

      router.replace("/play");
    } catch {
      // 토큰 파싱 실패 시 무시 — 랜딩 페이지 그대로 표시
    }
  }, [router]);

  return null;
}
