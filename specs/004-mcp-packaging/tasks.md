---
description: "Task list — 004 mcp-packaging"
---

# Tasks: MCP 패키징 — 에이전트가 리뷰 앱을 직접 호출

**Input**: `specs/004-mcp-packaging/` — spec.md(승인 rev `c365b4e7`, MYHA-10), plan.md(승인 rev `fd0cb31c`, MYHA-11)

**Tests**: 순수 모듈 `server/sessions.ts` 는 TDD(테스트 먼저). HTTP 왕복은 브라우저 없는 in-process 통합 테스트(US1 독립 검증). 브라우저측 `main.ts` 가산 분기는 plan 테스트 전략의 수동 스모크로 확인(Vitest node 환경이라 UI 단위테스트 없음 — 003 선례 동일).

**Organization**: 사용자 스토리별 단계. 새 서버 코드는 전부 `server/` 신규 디렉터리(Surgical). 코어 `parse`/`notes`/`export` 는 무변경 재사용.

**범위 경계 (SDD)**: 이 tasks.md 는 **gate 3 산출물(분해)** 이다. 실제 구현 착수는 CEO tasks 승인 후 **별도 구현 게이트(gate 4, 후속 이슈)**. 문서는 로컬 `main` 커밋, 푸시/PR 은 구현 게이트에서. (no work without doc)

## Format: `[ID] [P?] [Story] Description — verify: 닫는 FR/SC`

`[P]` = 다른 파일이고 상호 의존 없음 → 병렬 가능. 같은 파일을 만지는 태스크끼리는 [P] 불가.

---

## Phase 1: Setup (공유 인프라 — 두 빌드 타깃 + 의존성)

**Purpose**: 서버 빌드 경계와 MCP 의존성. 이후 모든 서버 태스크의 토대. (CEO 확정 #2)

- [ ] T001 [P] [Setup] 런타임 의존성 추가: `npm i @modelcontextprotocol/sdk`. package.json `dependencies` 에 **1건만** 추가 — verify: plan Complexity Tracking 정당화와 1:1 일치, `node -e "require.resolve('@modelcontextprotocol/sdk')"` 해석 OK (D-1=a).
- [ ] T002 [P] [Setup] `tsconfig.server.json` 신규: include `server/`, outDir `dist-server/`, `module`/`moduleResolution` = Node, `src/{parse,notes,export}.ts` 상대 import 허용, **DOM lib 제외**(Node 전용 — 브라우저 타입 끌어오지 않음) — verify: 빈 `server/index.ts` 로 `tsc -p tsconfig.server.json` 통과, 산출물이 `dist-server/` 에 생성. (plan Structure Decision — 두 빌드 타깃)
- [ ] T003 [Setup] package.json scripts: `"build:server": "tsc -p tsconfig.server.json"` 추가. 기존 `build`(브라우저 Vite)·`test`(vitest) **무변경** — verify: `npm run build:server` 동작, 기존 `npm run build` 영향 없음 (FR-013 빌드 무회귀). (T001 과 같은 파일이라 순차)

**Checkpoint**: 두 빌드 타깃 물리 분리 확립 — `server/`(Node 전용 코드, MCP SDK·`http`)가 Vite 브라우저 번들에 끌려가지 않음.

---

## Phase 2: Foundational (Blocking — 세션 상태 코어, TDD)

**Purpose**: 모든 서버 표면이 공유하는 인메모리 리뷰 세션 저장소. 순수 모듈, 테스트 먼저.

**⚠️ CRITICAL**: 이 단계 완료 전 mcp/http/index 시작 불가 — 셋 다 `sessions` 를 import.

### Tests first (TDD)

- [ ] T004 [Found] `tests/server/sessions.test.ts` 작성(먼저 **실패** 확인):
  - (a) `create(source)` 직후 `status === "pending"` (SC-004)
  - (b) `recordDecision(id, notes)` 후 `status === "completed"`; **의견 0건이어도 `completed`** 이며 `pending` 과 구분 (SC-004, FR-009)
  - (c) 같은 `source` 중복 `create` → 매번 **다른 reviewId**(덮어쓰기 없음) (FR-008)
  - (d) 알 수 없는 id `get` → `undefined`(throw 아님), 충돌 없는 not-found (FR-010)
  — verify: SC-004 / FR-008 / FR-009 / FR-010 케이스가 빨강.

### Implementation

- [ ] T005 [Found] `server/sessions.ts` 작성: `ReviewSession` 타입(`reviewId`, `source`, `status: "pending"|"completed"`, `decision?: Record<string, Note[]>`, `createdAt`, `completedAt?`) + `Map<string, ReviewSession>` 저장소. API: `create(source): ReviewSession`(새 `reviewId` 생성), `get(id): ReviewSession | undefined`, `recordDecision(id, notes): boolean`(존재 시 `completed` 전이·기록, 없으면 `false`). DOM·`http` 비종속 순수 모듈. `Note` 타입은 `../src/notes` 재사용(신규 직렬화 형식 없음) — verify: T004 통과 (FR-008/009/010, SC-004; FR-014 notes 모델 재사용).

**Checkpoint**: `npm test` 세션 케이스 green. 세 상태(pending / completed / 없음) 코드로 100% 구분.

---

## Phase 3: User Story 1 — 에이전트 제출→회수 왕복 (P1) 🎯 MVP

**Goal**: 복붙 0회로 `submit_plan` → (사람 결정) → `get_review`. 회수 텍스트 **SSoT = `buildExport`(서버 계산, CEO 확정 #1)**.

**Independent Test**: 브라우저 없이 in-process http 기동 → `submit_plan` 핸들러 → `POST /decision`(사람 검수 시뮬레이트) → `get_review` 가 원본 + 섹션별 의견 구조화 텍스트 반환.

### Tests first

- [ ] T006 [US1] `tests/server/roundtrip.test.ts` 작성(먼저 **실패**): in-process http 서버 + `sessions` → `submit_plan` 으로 세션 생성 → `POST /api/reviews/{id}/decision`(의견 맵 직접) → `get_review` 반환 문자열에 `# 원본 plan` + `## [slug]` + 의견 라인 존재 — verify: US1 독립 왕복(Acceptance 1·2), FR-001/002/003/007.
- [ ] T007 [US1] roundtrip.test 에 **SC-002** 케이스: 동일 `source`·동일 의견 맵으로 ① `get_review` 결과 와 ② `buildExport(source, parseSections(source), map)`(브라우저 클립보드 경로가 부르는 동일 순수 함수) 결과를 **문자열 완전 일치** assert. 의견 맵이 `Record`→POST→저장→`Object.entries`→`Map` 을 거쳐도 순서·내용 보존 검증 — verify: SC-002, FR-004, FR-014.
- [ ] T008 [US1] roundtrip.test 에 **SC-003** 케이스: `<script>` 등 raw HTML 포함 plan 제출·결정·회수 → `get_review` 회수 텍스트와 `GET /api/reviews/{id}` 응답 **어디에도** 실행 가능 raw HTML 미생존(escape 유지) — verify: SC-003, FR-011.

### Implementation

- [ ] T009 [US1] `server/mcp.ts` 작성: `@modelcontextprotocol/sdk` 로 tool 2개 등록.
  - `submit_plan(markdown, title?)` → `sessions.create` → `{ reviewId, url, status: "pending" }` **즉시 반환**(논블로킹).
  - `get_review(reviewId)` → 세션 조회: 없음 → not-found 신호 / `pending` → `{ status: "pending" }` / `completed` → `{ status: "completed", review: buildExport(session.source, parseSections(session.source), new Map(Object.entries(session.decision))) }`.
  - `parse`·`export` 순수 모듈 import(서버 측 계산 — CEO 확정 #1).
  — verify: FR-001/002/003/004, FR-009/010, FR-014(buildExport SSoT); T006/T007 통과.
- [ ] T010 [P] [US1] `server/http.ts` 작성: Node 내장 `http`, **`127.0.0.1` 바인딩**. 라우트:
  - `GET /api/reviews/:id` → `{ reviewId, source, status }` / 404 (FR-005 원본 로드)
  - `POST /api/reviews/:id/decision` → body `{ notes: Record<slug, Note[]> }`(= `NoteStore.toJSON()` 형식) → `sessions.recordDecision` → `{ ok: true }` / 404 (FR-007)
  - `GET /*` → `dist/` 정적 서빙(기존 리뷰 UI)
  — verify: FR-005/007/010/012(localhost 한정); T008 통과. (T009 와 다른 파일·`sessions` 만 의존 → [P])
- [ ] T011 [US1] `server/index.ts` 작성: **한 프로세스**에서 stdio MCP(`mcp.ts`)와 http(`http.ts`)를 **같은 `sessions` 인스턴스**로 기동. 기본 포트 점유 시 대체 포트 바인딩 후 **실제 바인딩 포트**를 `submit_plan` 의 `url`(`http://127.0.0.1:{port}/?review={id}`)에 반영 — verify: FR-001(url 반환), Edge(포트 충돌), SC-005; `node dist-server/index.js` 기동 확인. (mcp+http 후속)

**Checkpoint**: `npm test` 왕복 + SC-002 + SC-003 green. 브라우저 없이 US1 독립 검증 성립 = MVP 핵심 가치(복붙 0회) 전달.

---

## Phase 4: User Story 2 — 사람이 브라우저에서 검수 (P2)

**Goal**: `?review=` 로 붙여넣기 없이 로드, 기존 UI 로 검수, "검수 완료" → 서버 기록.

**Independent Test**: 리뷰 세션 시드 후 그 주소 열기 → 카드 렌더 → 의견 → "검수 완료" → 서버 세션에 결정 기록.

- [ ] T012 [US2] `src/main.ts` 부팅 **가산 분기**: `getActive()`(localStorage) 보다 **먼저** `?review=` 쿼리 감지 → `GET /api/reviews/{id}` 로 `source` 받아 기존 `enterReview()` 에 태움(서버 세션 기준, localStorage 영속 생략). 쿼리 없으면 현행 부팅 그대로 — verify: FR-005, FR-006(기존 검수 UI 재사용), FR-013(쿼리 없는 경로 무회귀).
- [ ] T013 [US2] `src/main.ts`: 리뷰-세션 모드일 때 "검수 완료" 액션 → `POST /api/reviews/{id}/decision` 에 `store.toJSON()`(= `Record<slug, Note[]>`) 전송. 기존 클립보드 핸드오프(`copyHandoff`)는 **무변경 유지**(추가이지 대체 아님) — verify: FR-007, FR-013(클립보드 경로 보존), SC-001(복붙 0회 왕복 완성). (T012 와 같은 `main.ts` → 순차)

**Checkpoint**: 수동 스모크 — 반환 url 열기 → 카드 로드 → 의견 → "검수 완료" → `get_review` 가 핸드오프 텍스트 반환.

---

## Phase 5: User Story 3 — 검수 상태 확인 (대기/완료) (P3)

**Goal**: 폴링으로 `pending` ↔ `completed` 구분(의견 0건 완료 ≠ 미완료). 상태 코어는 T005/T009 로 이미 구현 — 여기선 회귀 핀.

- [ ] T014 [US3] roundtrip.test 에 상태 분기 회귀 케이스 1건 고정: `submit_plan` 직후 `get_review` → `pending`(결정 본문 비어 있음) / 결정(의견 0건) 후 `get_review` → `completed` 이며 `pending` 과 명확 구분 — verify: SC-004, FR-009, US3 Acceptance 1·2.

**Checkpoint**: 세 상태 100% 구분 — 에이전트가 "미완료"를 "의견 0건 완료"로 오인하지 않음.

---

## Phase 6: Polish & 회귀 검증 (SC-006)

- [ ] T015 [P] [Polish] 기존 `tests/{parse,notes,export,storage}.test.ts` **무변경** 통과 확인(코어 시그니처 불변) — verify: SC-006(코어 회귀 0건).
- [ ] T016 [Polish] 수동 스모크(plan 테스트 전략 말미): `node dist-server/index.js` → `submit_plan` 샘플 제출 → 반환 url 브라우저로 열어 카드 확인 → 의견 + "검수 완료" → `get_review` 핸드오프 텍스트. **외부 네트워크 차단** 상태에서도 성공 — verify: SC-001, SC-005, SC-006(붙여넣기·클립보드 경로 병존).
- [ ] T017 [P] [Polish] plan.md §2 prose 정정: 클립보드 경로 시그니처를 실제 `main.ts copyHandoff` 의 `buildExport(currentDoc.source, sections, store.toMap())`(캐시된 `sections`)로 맞춤. `sections === parseSections(currentDoc.source)` 라 SC-002 일치 논거 불변 — verify: 이슈 「사소한 정정」 반영(차단 아님). (구현 게이트에서 plan 푸시 전 적용)

**Checkpoint**: 전체 수락 기준(SC-001~006) 검증, 기존 경로 회귀 0건.

---

## Dependencies & 실행 순서

- **Setup(T001–003)** → 모든 서버 태스크 선행. T001·T002 상호 [P], T003 은 T001 과 같은 파일이라 순차.
- **Foundational(T004→T005, sessions)** → mcp/http/index 선행(셋 다 import). TDD: T004(빨강) → T005(통과).
- **US1(T006–011)**: 테스트 T006–008 먼저 → 구현 T009(mcp), T010(http, T009 와 [P]), T011(index, mcp+http 후).
- **US2(T012→T013)**: US1 의 http API(T010) 후. 같은 `main.ts` 라 순차([P] 불가).
- **US3(T014)**: T009 후.
- **Polish(T015–017)**: 전부 후. T015·T017 상호 [P], T016 은 빌드 산출물(T011) 후.

## 병렬 가능 묶음

- T001 ∥ T002 (의존성 설치 vs 새 tsconfig 파일)
- T009 ∥ T010 (mcp.ts vs http.ts — 다른 파일, `sessions` 만 의존)
- T015 ∥ T017 (기존 테스트 실행 vs plan 문서 prose 정정)

---

## CEO 확정 3사항 반영 추적 (이슈 명시)

1. **회수 텍스트 = 서버에서 `buildExport` 생성** → T009(get_review)·T007(SC-002 문자열 일치)에 고정.
2. **서버 = 두 번째 빌드 타깃 분리 + 신규 런타임 의존성 1건** → T001(dep)·T002(tsconfig.server)·T003(scripts).
3. **research/data-model/contracts 미분리, plan.md 자족** → 본 tasks.md 도 별도 설계 산출물 없이 plan/spec 직접 참조.

## 다음 게이트 (gate 4 — 구현)

CEO tasks 승인 후 **별도 후속 이슈**로 구현 착수. 그 게이트에서 위 T001–T017 실행 + 푸시/PR. 현재 `e35a96b`(spec)·`54985c3`(plan)·tasks 커밋은 미푸시 `main` 유지.
