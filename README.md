# Graymar Client

LLM 기반 턴제 텍스트 RPG **"그레이마르"** 의 프론트엔드. 서버 API와 통신하며 내러티브 UI, 전투 UI, HUB 탐험 화면을 제공한다.

## Tech Stack

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.1 | React 프레임워크 |
| React | 19.2 | UI 렌더링 |
| Zustand | 5.0 | 상태 관리 |
| Tailwind CSS | 4 | 스타일링 |
| Lucide React | - | 아이콘 |

## Quick Start

### 1. 설치

```bash
pnpm install
```

### 2. 개발 서버 실행

```bash
pnpm dev -- --port 3001      # http://localhost:3001
```

> 백엔드 서버가 `http://localhost:3000`에서 실행 중이어야 합니다.

### 3. 빌드

```bash
pnpm build                    # 프로덕션 빌드
pnpm lint                     # ESLint
```

---

## Architecture

```
app/
├── page.tsx             → 랜딩 페이지 (SEO)
├── play/page.tsx        → GamePage (메인 SPA, phase 라우팅)
├── components/
│   ├── narrative/       NarrativePanel (메시지 스크롤), StoryBlock, DialogueBubble
│   ├── input/           InputSection (텍스트 입력 + 퀵 액션, LOCATION 전용)
│   ├── battle/          BattlePanel (적 카드 표시)
│   ├── layout/          Header (자동 숨김 HP/Stamina), MobileBottomNav (햄버거)
│   ├── hub/             HubScreen, HeatGauge, TimePhaseIndicator,
│   │                    LocationHeader, ResolveOutcomeBanner,
│   │                    SignalFeedPanel, IncidentTracker, NpcRelationshipCard,
│   │                    HubNotificationList, PinnedAlertStack, WorldDeltaSummaryCard,
│   │                    CollapsibleSection
│   ├── location/        TurnResultBanner, LocationToastLayer
│   ├── screens/         StartScreen (캐릭터 생성 6단계), RunEndScreen, EndingScreen,
│   │                    NodeTransitionScreen
│   ├── side-panel/      SidePanel (Character/Inventory/Quest 탭), SetBonusDisplay
│   └── ui/              ErrorBanner, LlmSettingsModal, LlmFailureModal,
│                        BugReportButton, BugReportModal, StatTooltip
├── store/
│   ├── game-store.ts    Zustand store (전체 게임 상태 + derivePhase)
│   ├── auth-store.ts    JWT 인증 상태 (login/register/hydrate)
│   ├── settings-store.ts 텍스트 속도 설정 (localStorage)
│   └── game-selectors.ts Notification 쿼리 셀렉터
├── lib/
│   ├── api-client.ts    서버 API 래퍼 (retryLlm, portrait generate 포함)
│   ├── result-mapper.ts ServerResultV1 → StoryMessage[] 변환
│   ├── hud-mapper.ts    Diff → PlayerHud 업데이트
│   ├── api-errors.ts    ApiError 클래스
│   └── notification-utils.ts 알림 중복 제거, 정렬, 만료 필터링
├── data/
│   ├── presets.ts       6 캐릭터 프리셋 (클라이언트 표시용)
│   ├── items.ts         아이템 표시 메타데이터 (ITEM_CATALOG)
│   └── stat-descriptions.ts 스탯 설명 텍스트
└── types/
    └── game.ts          프론트엔드 타입 정의
```

### 이미지 에셋 (public/)

| 폴더 | 파일 수 | 내용 |
|------|---------|------|
| `/npc-portraits/` | 17 | NPC 초상화 (CORE 5 + SUB 12) |
| `/locations/` | 25 | 장소 이미지 (7 장소 x 다중 시간대) |
| `/items/` | 26 | 아이템 아이콘 |
| `/` (root) | 15+ | 프리셋 초상화 (6종 x 남/여) + 랜딩 이미지 |

---

## State Machine

```
TITLE → LOADING → HUB → LOCATION ⇄ COMBAT → HUB (순환)
                   ↕         ↕
                 ERROR    RUN_ENDED → EndingScreen
```

Phase는 `derivePhase(nodeType, result)` 함수로 도출:

| Phase | 조건 | 화면 |
|-------|------|------|
| `TITLE` | 런 미생성 | StartScreen (캐릭터 생성 6단계) |
| `LOADING` | 런 생성 중 | 로딩 스피너 |
| `HUB` | nodeType = HUB | HubScreen (7 지역 + 알림 + 시그널) |
| `LOCATION` | nodeType = LOCATION | NarrativePanel + InputSection + 판정 배너 |
| `COMBAT` | nodeType = COMBAT | BattlePanel + NarrativePanel |
| `NODE_TRANSITION` | 노드 전이 중 | NodeTransitionScreen |
| `RUN_ENDED` | 런 종료 | EndingScreen (행동 성향 + NPC epilogues) |
| `ERROR` | 에러 발생 | ErrorBanner |

---

## Screens

### StartScreen (캐릭터 생성 6단계)

1. 프리셋 선택 (6종)
2. 성별 선택
3. 이름 입력
4. 특성 선택 (6종)
5. 보너스 스탯 +6 배분
6. AI 초상화 생성 (Gemini)

| 프리셋 | 이름 | 컨셉 |
|--------|------|------|
| DOCKWORKER | 부두 노동자 | 근접 탱커 |
| DESERTER | 탈영병 | 균형 전투 |
| SMUGGLER | 밀수업자 | 은밀 특화 |
| HERBALIST | 약초상 | 방어 유틸 |
| FALLEN_NOBLE | 몰락 귀족 | 정치 특화 |
| GLADIATOR | 검투사 | 공격 특화 |

### HubScreen (HUB)

도시 거점 화면. 7개 LOCATION 카드와 도시 상태 표시.

- **Heat Gauge**: 도시 열기 (0~100) 시각화
- **Time Phase**: DAWN / DAY / DUSK / NIGHT (4상 시간)
- **Safety Level**: SAFE / ALERT / DANGER 표시
- **Signal Feed Panel**: 5채널 시그널 피드
- **Incident Tracker**: 활성 사건 control/pressure 게이지
- **NPC Relationship Card**: NPC 5축 감정 요약
- **Pinned Alert Stack**: 긴급 알림 고정 표시 (최대 3개)
- **WorldDelta Summary Card**: 턴 간 세계 변화 요약
- **Hub Notification List**: 피드형 알림 목록
- **CollapsibleSection**: 접기/펼치기 UI

### NarrativePanel (LOCATION)

메시지 스크롤 영역. StoryBlock + DialogueBubble로 렌더링.

**메시지 표시 순서:**
1. `SYSTEM` — 즉시 표시 (이동, 퀘스트 등)
2. `RESOLVE` — 주사위 애니메이션 → 판정 결과 공개
3. `NARRATOR` — LLM 로딩 애니메이션 → 완료 시 텍스트 교체
4. `CHOICE` — narrator 완료 후 flush (선택지 표시)

**NPC 대화 버블**: CORE/SUB NPC 대사 시 초상화 + 이름 표시, 연속 동일 NPC 대사는 헤더 생략

**LOCATION 알림 레이어:**
- **TurnResultBanner**: 판정 결과 배너 (SUCCESS/PARTIAL/FAIL, 5초 자동 해제)
- **LocationToastLayer**: 플로팅 토스트 알림 (최대 3개, 3초 페이드)

### BattlePanel (COMBAT)

적 카드 레이아웃. 거리/각도/HP/상태이상 표시. 전투 선택지 제공.

### EndingScreen (RUN_ENDED)

- NPC epilogues (high_trust / neutral / hostile)
- City status (STABLE / UNSTABLE / COLLAPSED)
- 행동 성향 요약 (playstyleSummary, dominantVectors 태그)
- 플레이 통계

### SidePanel

| 탭 | 내용 |
|----|------|
| Character | 캐릭터 초상화, 능력치 6개, 장비 슬롯 (희귀도별 색상), 스탯 툴팁 |
| Inventory | 소지 아이템 목록, 골드 |
| Quest | 퀘스트 진행 상황, 발견된 단서 |

---

## Notification System

서버 `uiBundle`에서 전달된 알림을 scope/presentation 기준으로 분류하여 표시:

| Scope | Presentation | 컴포넌트 | 설명 |
|-------|-------------|---------|------|
| HUB | FEED_ITEM | HubNotificationList | HUB 피드형 알림 |
| HUB/GLOBAL | BANNER (pinned) | PinnedAlertStack | 긴급 고정 알림 (최대 3개) |
| HUB | CARD | WorldDeltaSummaryCard | 세계 변화 요약 |
| TURN_RESULT | BANNER | TurnResultBanner | 판정 결과 (5초 자동 해제) |
| LOCATION | TOAST | LocationToastLayer | 플로팅 토스트 (3초 페이드) |

---

## Server Communication

### API Client (`lib/api-client.ts`)

| 메서드 | 설명 |
|--------|------|
| `createRun(presetId, gender, options)` | 런 생성 (이름, 보너스스탯, 특성, 초상화) |
| `getRun(runId)` | 런 상태 조회 |
| `submitTurn(runId, body)` | 턴 제출 |
| `getTurnDetail(runId, turnNo)` | 턴 상세 (LLM 폴링) |
| `retryLlm(runId, turnNo)` | LLM 재시도 |
| `getLlmSettings()` | LLM 설정 조회 |
| `updateLlmSettings(settings)` | LLM 설정 변경 |
| `generatePortrait(...)` | AI 초상화 생성 |
| `createBugReport(...)` | 버그 리포트 생성 |

### LLM 폴링 흐름

```
1. submitTurn() → serverResult 수신 (즉시)
2. NARRATOR 메시지 = 로딩 애니메이션 표시
3. getTurnDetail() 2초 간격 폴링 (최대 15회, 30초)
4. llm.status === 'DONE' → narrative 텍스트로 교체
5. pending messages (choices 등) flush
6. 실패 시: LlmFailureModal → 재시도 / 서술 건너뛰기 / 닫기
```

---

## Equipment Display

| 희귀도 | 색상 |
|--------|------|
| COMMON | `var(--text-muted)` |
| RARE | `#4A9EFF` (파랑) |
| UNIQUE | `#A855F7` (보라) |
| LEGENDARY | `var(--gold)` (금) |

---

## Mobile UX

- **헤더 자동 숨김**: 스크롤 다운 시 헤더 숨김, 스크롤 업 시 표시
- **하단 네비게이션**: 햄버거 메뉴로 사이드패널 접근
- **대화창 최대화**: 모바일에서 입력 영역 최대 활용
- **핀치 줌 차단**: 게임 UI 일관성 유지
- **PWA 지원**: 홈 화면 추가 가능

---

## CSS Variables (Dark Theme)

```css
--bg-primary: #0F0F0F
--bg-secondary: #0A0A0A
--bg-card: #141414
--text-primary: #FAF8F5
--text-secondary: #888
--text-muted: #666
--gold: #C9A962
--hp-red: #E74C3C
--stamina-green: #27AE60
--info-blue: #60A5FA
--border-primary: #1F1F1F
```

---

## Routes

| 경로 | 용도 |
|------|------|
| `/` | 랜딩 페이지 (SEO, OG 메타데이터) |
| `/play` | 게임 SPA (인증 → 캐릭터 생성 → 플레이) |

---

## Development Notes

- 서버 기본 포트 `3000`, 클라이언트 `3001`로 분리
- 프로덕션: `api.dimtale.com` (서버), `www.dimtale.com` (클라이언트)
- Tailwind v4 사용 — `@theme` 블록에 CSS 변수 정의
- 모든 게임 로직은 서버에 위임, 클라이언트는 표시 전용
- 텍스트 속도 설정: fast / normal / slow / instant (localStorage)

## License

MIT
