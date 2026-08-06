// vitest — 스토어 순수 로직 유닛 테스트 (하네스 보강 #2, 2026-08-06)
// 대상: src/store/**, src/lib/** 의 순수 함수. 컴포넌트 렌더 테스트는 범위 외
// (그 층은 E2E scripts/e2e/ 가 담당).
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
