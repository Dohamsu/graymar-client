# Graymar Client

LLM 기반 턴제 텍스트 RPG **"그레이마르"** 의 프론트엔드. 서버 API와 통신하며 내러티브 UI, 전투 UI, HUB 탐험 화면을 제공한다.

## Tech Stack

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16 | React 프레임워크 |
| React | 19 | UI 렌더링 |
| Zustand | 5 | 상태 관리 |
| Tailwind CSS | 4 | 스타일링 |
| Lucide React | 0.564 | 아이콘 |

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
app/page.tsx → GamePage (메인 레이아웃, phase 라우팅)
├── components/
│   ├── narrative/       NarrativePanel (메시지 스크롤), StoryBlock (메시지 렌더러)
│   ├── input/           InputSection (텍스트 입력 + 퀵 액션, LOCATION 전용)
│   ├── battle/          BattlePanel (적 카드 표시)
│   ├── layout/          Header (HP/Stamina 바), MobileBottomNav
│   ├── hub/             HubScreen, HeatGauge, TimePhaseIndicator,
│   │                    LocationHeader, ResolveOutcomeBanner,
│   │                    SignalFeedPanel, IncidentTracker, NpcRelationshipCard,
│   │                    HubNotificationList, PinnedAlertStack, WorldDeltaSummaryCard
│   ├── location/        TurnResultBanner, LocationToastLayer
│   ├── screens/         StartScreen (프리셋 선택), RunEndScreen, EndingScreen
│   ├── side-panel/      SidePanel (Character / Inventory / Quest 탭)
│   └── ui/              ErrorBanner, LlmSettingsModal, LlmFailureModal, StatTooltip
├── store/
│   ├── game-store.ts    Zustand store (전체 게임 상태 + derivePhase)
│   ├── auth-store.ts    JWT 인증 상태 (login/register/hydrate)
│   ├── settings-store.ts 텍스트 속도 설정 (localStorage)
│   └── game-selectors.ts Notification 쿼리 셀렉터
├── lib/
│   ├── api-client.ts    서버 API 래퍼 (retryLlm 포함)
│   ├── result-mapper.ts ServerResultV1 → StoryMessage[] 변환
│   ├── hud-mapper.ts    Diff → PlayerHud 업데이트
│   ├── api-errors.ts    ApiError 클래스
│   └── notification-utils.ts 알림 중복 제거, 정렬, 만료 필터링
├── data/
│   ├── presets.ts       4 캐릭터 프리셋 (클라이언트 표시용)
│   ├── items.ts         아이템 표시 메타데이터 (ITEM_CATALOG)
│   └── stat-descriptions.ts 스탯 설명 텍스트
└── types/
    └── game.ts          프론트엔드 타입 정의
```

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
| `TITLE` | 런 미생성 | StartScreen (프리셋 선택 + 인증) |
| `LOADING` | 런 생성 중 | 로딩 스피너 |
| `HUB` | nodeType = HUB | HubScreen (4 지역 + 알림 + 시그널) |
| `LOCATION` | nodeType = LOCATION | NarrativePanel + InputSection + 판정 배너 |
| `COMBAT` | nodeType = COMBAT | BattlePanel + NarrativePanel |
| `RUN_ENDED` | 런 종료 | EndingScreen (행동 성향 + NPC epilogues) |
| `ERROR` | 에러 발생 | ErrorBanner |

---

## Screens

### StartScreen (TITLE)

프리셋 선택 + 인증 화면. 이메일 로그인/회원가입 후 4 캐릭터 중 선택.

| 프리셋 | 이름 | 컨셉 | 주요 스탯 |
|--------|------|------|----------|
| DOCKWORKER | 부두 노동자 | 근접 탱커 | ATK 16, DEF 14 |
| DESERTER | 탈영병 | 균형 전투 | ATK 17, ACC 7 |
| SMUGGLER | 밀수업자 | 은밀 특화 | EVA 7, SPEED 7 |
| HERBALIST | 약초상 | 방어 유틸 | RESIST 9, Stamina 7 |

### HubScreen (HUB)

도시 거점 화면. 4개 LOCATION 카드와 도시 상태 표시.

- **Heat Gauge**: 도시 열기 (0~100) 시각화
- **Time Phase**: DAWN / DAY / DUSK / NIGHT (4상 시간)
- **Safety Level**: SAFE / ALERT / DANGER 표시
- **Signal Feed Panel**: 5채널 시그널 피드 (RUMOR/SECURITY/NPC_BEHAVIOR/ECONOMY/VISUAL)
- **Incident Tracker**: 활성 사건 control/pressure 게이지
- **NPC Relationship Card**: NPC 5축 감정 요약
- **Pinned Alert Stack**: 긴급 알림 고정 표시 (최대 3개, 우선도 기반 색상)
- **WorldDelta Summary Card**: 턴 간 세계 변화 요약 (headline + 변화 목록)
- **Hub Notification List**: 피드형 알림 목록 (INCIDENT/WORLD/NPC 아이콘)

### NarrativePanel (LOCATION)

메시지 스크롤 영역. 서버에서 받은 결과를 StoryBlock으로 렌더링.

**메시지 표시 순서:**
1. `SYSTEM` — 즉시 표시 (이동, 퀘스트 등)
2. `RESOLVE` — 주사위 애니메이션 (1.2s) → 판정 결과 공개
3. `NARRATOR` — LLM 로딩 애니메이션 → 완료 시 텍스트 교체
4. `CHOICE` — narrator 완료 후 flush (선택지 표시)

**LOCATION 알림 레이어:**
- **TurnResultBanner**: 판정 결과 배너 (SUCCESS/PARTIAL/FAIL, 5초 자동 해제)
- **LocationToastLayer**: 플로팅 토스트 알림 (최대 3개, 3초 페이드)

### InputSection (LOCATION)

- 자유 텍스트 입력 (ACTION)
- 선택지 버튼 (CHOICE)
- 선택 후 `selectedChoiceId` 마킹 → 선택한 것만 표시

### BattlePanel (COMBAT)

적 카드 레이아웃. 거리/각도/HP/상태이상 표시. 전투 선택지 제공.

### EndingScreen (RUN_ENDED)

- NPC epilogues (high_trust / neutral / hostile)
- City status (STABLE / UNSTABLE / COLLAPSED)
- 행동 성향 요약 (playstyleSummary, dominantVectors 태그)
- 플레이어 스레드 요약 (threadSummary)
- 플레이 통계

### SidePanel

3탭 구성:

| 탭 | 내용 |
|----|------|
| Character | 캐릭터 초상화, 능력치 6개, 장비 슬롯 (희귀도별 색상), 스탯 툴팁 |
| Inventory | 소지 아이템 목록, 골드 |
| Quest | 퀘스트 진행 상황 |

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

알림 유틸 (`notification-utils.ts`):
- `dedupeNotifications()` — dedupeKey 기반 중복 제거
- `sortNotifications()` — 우선도 → turnNo 정렬
- `dropExpired()` — expiresAtTurn 기반 만료 필터링

---

## Server Communication

### API Client (`lib/api-client.ts`)

| 메서드 | 설명 |
|--------|------|
| `createRun(presetId, gender)` | 런 생성 |
| `getRun(runId)` | 런 상태 조회 |
| `submitTurn(runId, body)` | 턴 제출 |
| `getTurnDetail(runId, turnNo)` | 턴 상세 (LLM 폴링) |
| `retryLlm(runId, turnNo)` | LLM 재시도 |
| `getLlmSettings()` | LLM 설정 조회 |
| `updateLlmSettings(settings)` | LLM 설정 변경 |

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

## Result Mapping (`lib/result-mapper.ts`)

서버 `ServerResultV1`을 클라이언트 `StoryMessage[]`로 변환:

| ServerResultV1 필드 | → StoryMessage.type | 설명 |
|---------------------|---------------------|------|
| `events[kind=SYSTEM]` | SYSTEM | 시스템 메시지 (이동, 퀘스트) |
| `ui.resolveOutcome` | RESOLVE | 판정 결과 (주사위 인라인, 1.2s 애니메이션) |
| `summary.display` | NARRATOR | LLM 내러티브 (비동기 교체) |
| `choices[]` | CHOICE | 선택지 목록 |

---

## CSS Variables (Dark Theme)

```css
--bg-primary: #0F0F0F         /* 메인 배경 */
--bg-secondary: #0A0A0A       /* 보조 배경 */
--bg-card: #141414             /* 카드 배경 */
--text-primary: #FAF8F5        /* 주 텍스트 */
--text-secondary: #888         /* 보조 텍스트 */
--text-muted: #666             /* 약한 텍스트 */
--gold: #C9A962                /* 강조/골드 */
--hp-red: #E74C3C              /* HP 바 */
--stamina-green: #27AE60       /* 기력 바 */
--info-blue: #60A5FA           /* 정보 파란색 */
--border-primary: #1F1F1F      /* 기본 테두리 */
```

---

## Key Patterns

### Zustand Store (`store/game-store.ts`)

단일 스토어에 전체 게임 상태 관리:

```typescript
interface GameState {
  phase: GamePhase;
  runId: string | null;
  currentTurnNo: number;
  messages: StoryMessage[];
  playerHud: PlayerHud;
  characterInfo: CharacterInfo;
  worldState: WorldStateUI;
  choices: ChoiceItem[];
  notifications: GameNotification[];
  pinnedAlerts: GameNotification[];
  worldDeltaSummary: WorldDeltaSummaryUI | null;
  // actions
  startNewGame(presetId, gender): void;
  submitAction(text): void;
  submitChoice(choiceId): void;
  pollLlm(): void;
  retryLlmNarrative(): void;
  skipLlmNarrative(): void;
}
```

### 메시지 추가 패턴

```
submitTurn 응답 → resultMapper.map(serverResult)
  → SYSTEM 메시지 즉시 push
  → RESOLVE 메시지 즉시 push (주사위 1.2s 애니메이션)
  → NARRATOR placeholder push (로딩 상태)
  → pollLlm() 시작
  → LLM 완료 → NARRATOR 교체 → pending flush (CHOICE 등)
```

### Notification 셀렉터 (`store/game-selectors.ts`)

```typescript
selectHubNotifications()       // HUB/GLOBAL scope
selectLocationNotifications()  // LOCATION/TURN_RESULT scope
selectBannerNotifications()    // BANNER presentation
selectToastNotifications()     // TOAST presentation
selectFeedNotifications()      // FEED_ITEM presentation
```

---

## Equipment Display

장비는 서버의 `ItemInstance`를 클라이언트 `EquipmentItem`으로 매핑:

| 희귀도 | 색상 |
|--------|------|
| COMMON | `var(--text-muted)` |
| RARE | `#4A9EFF` (파랑) |
| UNIQUE | `#A855F7` (보라) |
| LEGENDARY | `var(--gold)` (금) |

---

## Development Notes

- 서버 기본 포트 `3000`, 클라이언트 `3001`로 분리
- Tailwind v4 사용 — `@theme` 블록에 CSS 변수 정의
- 모든 게임 로직은 서버에 위임, 클라이언트는 표시 전용
- 텍스트 속도 설정: fast / normal / slow / instant (localStorage)

## License

MIT
