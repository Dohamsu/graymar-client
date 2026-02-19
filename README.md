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
│   ├── layout/          Header (HP/Stamina 바 + HeatGauge + TimePhase)
│   ├── hub/             HubScreen, HeatGauge, TimePhaseIndicator,
│   │                    LocationHeader, ResolveOutcomeInline
│   ├── screens/         StartScreen (프리셋 선택), RunEndScreen
│   ├── side-panel/      SidePanel (Character / Inventory / Quest 탭)
│   └── ui/              ErrorBanner, LlmSettingsModal
├── store/
│   └── game-store.ts    Zustand store (전체 게임 상태 + derivePhase)
├── lib/
│   ├── api-client.ts    서버 API 래퍼
│   ├── result-mapper.ts ServerResultV1 → StoryMessage[] 변환
│   └── hud-mapper.ts    Diff → PlayerHud 업데이트
├── data/
│   ├── presets.ts       4 캐릭터 프리셋 (클라이언트 표시용)
│   └── items.ts         아이템 표시 메타데이터 (ITEM_CATALOG)
└── types/
    └── game.ts          프론트엔드 타입 정의
```

---

## State Machine

```
TITLE → LOADING → HUB → LOCATION ⇄ COMBAT → HUB (순환)
                   ↕         ↕
                 ERROR    RUN_ENDED
```

Phase는 `derivePhase(nodeType, result)` 함수로 도출:

| Phase | 조건 | 화면 |
|-------|------|------|
| `TITLE` | 런 미생성 | StartScreen (프리셋 선택) |
| `LOADING` | 런 생성 중 | 로딩 스피너 |
| `HUB` | nodeType = HUB | HubScreen (4 지역 선택 카드) |
| `LOCATION` | nodeType = LOCATION | NarrativePanel + InputSection |
| `COMBAT` | nodeType = COMBAT | BattlePanel + NarrativePanel |
| `RUN_ENDED` | 런 종료 | RunEndScreen |
| `ERROR` | 에러 발생 | ErrorBanner |

---

## Screens

### StartScreen (TITLE)

프리셋 선택 화면. 4 캐릭터 중 선택하면 서버에 `POST /v1/runs` 요청.

| 프리셋 | 이름 | 컨셉 | 주요 스탯 |
|--------|------|------|----------|
| DOCKWORKER | 부두 노동자 | 근접 탱커 | ATK 16, DEF 14 |
| DESERTER | 탈영병 | 균형 전투 | ATK 17, ACC 7 |
| SMUGGLER | 밀수업자 | 은밀 특화 | EVA 7, SPEED 7 |
| HERBALIST | 약초상 | 방어 유틸 | RESIST 9, Stamina 7 |

### HubScreen (HUB)

도시 거점 화면. 4개 LOCATION 카드와 Heat 해결 옵션 표시.

- **Heat Gauge**: 도시 열기 (0~100) 시각화
- **Time Phase**: DAY / NIGHT 표시
- **Safety Level**: SAFE / ALERT / DANGER 표시

### NarrativePanel (LOCATION)

메시지 스크롤 영역. 서버에서 받은 결과를 StoryBlock으로 렌더링.

**메시지 표시 순서:**
1. `SYSTEM` — 즉시 표시 (이동, 퀘스트 등)
2. `RESOLVE` — 주사위 애니메이션 (1.2s) → 판정 결과 공개
3. `NARRATOR` — LLM 로딩 애니메이션 → 완료 시 텍스트 교체
4. `CHOICE` — narrator 완료 후 flush (선택지 표시)

### InputSection (LOCATION)

- 자유 텍스트 입력 (ACTION)
- 선택지 버튼 (CHOICE)
- 선택 후 `selectedChoiceId` 마킹 → 선택한 것만 표시

### BattlePanel (COMBAT)

적 카드 레이아웃. 거리/각도/HP/상태이상 표시. 전투 선택지 제공.

### SidePanel

3탭 구성:

| 탭 | 내용 |
|----|------|
| Character | 캐릭터 초상화, 능력치 6개, 장비 슬롯 (희귀도별 색상) |
| Inventory | 소지 아이템 목록, 골드 |
| Quest | 퀘스트 진행 상황 |

---

## Equipment Display

장비는 서버의 `ItemInstance`를 클라이언트 `EquipmentItem`으로 매핑:

```typescript
interface EquipmentItem {
  slot: string;        // WEAPON, ARMOR, TACTICAL, ACCESSORY
  name: string;        // displayName (affix 포함)
  baseName: string;    // 원본 아이템 이름
  rarity?: string;     // COMMON, RARE, UNIQUE, LEGENDARY
  icon: string;        // lucide 아이콘 키
  color: string;       // 희귀도별 색상
  prefixName?: string; // affix 접두사
  suffixName?: string; // affix 접미사
  statBonus?: Record<string, number>;
}
```

**희귀도별 색상:**

| 희귀도 | 색상 |
|--------|------|
| COMMON | `var(--text-muted)` |
| RARE | `#4A9EFF` (파랑) |
| UNIQUE | `#A855F7` (보라) |
| LEGENDARY | `var(--gold)` (금) |

---

## Server Communication

### API Client (`lib/api-client.ts`)

| 메서드 | 설명 |
|--------|------|
| `createRun(presetId)` | 런 생성 |
| `getRun(runId)` | 런 상태 조회 |
| `submitTurn(runId, body)` | 턴 제출 |
| `getTurnDetail(runId, turnNo)` | 턴 상세 (LLM 폴링) |
| `getLlmSettings()` | LLM 설정 조회 |
| `updateLlmSettings(settings)` | LLM 설정 변경 |

### LLM 폴링 흐름

```
1. submitTurn() → serverResult 수신 (즉시)
2. NARRATOR 메시지 = 로딩 애니메이션 표시
3. getTurnDetail() 2초 간격 폴링 (최대 15회)
4. llm.status === 'DONE' → narrative 텍스트로 교체
5. pending messages (choices 등) flush
```

---

## Result Mapping (`lib/result-mapper.ts`)

서버 `ServerResultV1`을 클라이언트 `StoryMessage[]`로 변환:

| ServerResultV1 필드 | → StoryMessage.type | 설명 |
|---------------------|---------------------|------|
| `events[kind=SYSTEM]` | SYSTEM | 시스템 메시지 (이동, 퀘스트) |
| `ui.resolveOutcome` | RESOLVE | 판정 결과 (주사위 인라인) |
| `summary.display` | NARRATOR | LLM 내러티브 (비동기 교체) |
| `choices[]` | CHOICE | 선택지 목록 |

---

## CSS Variables (Dark Theme)

```css
--bg-primary: #0A0A0F       /* 메인 배경 */
--bg-card: #14141F           /* 카드 배경 */
--bg-input: #1A1A2E          /* 입력 영역 */
--text-primary: #E8E6E3      /* 주 텍스트 */
--text-secondary: #9B9B9B    /* 보조 텍스트 */
--text-muted: #5A5A5A        /* 약한 텍스트 */
--gold: #C9A84C              /* 강조/골드 */
--hp-red: #C0392B            /* HP 바 */
--stamina-blue: #2E86C1      /* 기력 바 */
--border-primary: #2A2A3E    /* 기본 테두리 */
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
  // ... actions
  startNewGame(presetId): void;
  submitAction(text): void;
  submitChoice(choiceId): void;
  pollLlm(): void;
}
```

### 메시지 추가 패턴

```
submitTurn 응답 → resultMapper.map(serverResult)
  → SYSTEM 메시지 즉시 push
  → RESOLVE 메시지 즉시 push (주사위 애니메이션)
  → NARRATOR placeholder push (로딩 상태)
  → pollLlm() 시작
  → LLM 완료 → NARRATOR 교체 → pending flush (CHOICE 등)
```

---

## Development Notes

- 서버 기본 포트 `3000`, 클라이언트 `3001`로 분리
- `next.config.ts`에서 서버 프록시 또는 CORS 설정 필요 시 환경에 맞게 조정
- Tailwind v4 사용 — `@theme` 블록에 CSS 변수 정의
- 모든 게임 로직은 서버에 위임, 클라이언트는 표시 전용

## License

MIT
