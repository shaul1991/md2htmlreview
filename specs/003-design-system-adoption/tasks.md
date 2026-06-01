---
description: "Task list — 003 design-system-adoption"
---

# Tasks: 디자인 시스템 도입 — 데스크톱 3-pane 리뷰 워크스페이스

**Input**: `specs/003-design-system-adoption/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: 순수 모듈(parse/notes/export/storage)은 CLAUDE.md 규칙상 TDD — 테스트 포함.
UI(render/main)는 Vitest node 환경이라 단위테스트 없이 quickstart.md 의 Playwright 수동검증으로 확인.

**Organization**: 사용자 스토리별 단계. `main.ts`·`render.ts` 는 여러 태스크가 같은 파일을 만지므로 상호 [P] 불가.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 디자인 자산 편입 + 셸 + 아이콘 (UI 스토리들의 토대)

- [x] T001 [P] `design/tokens.css` 를 `src/styles/tokens.css` 로 원본 그대로 복사 (research D-4)
- [x] T002 [P] `design/components.css` 를 `src/styles/components.css` 로 원본 그대로 복사
- [x] T003 [P] `src/icons.ts` 신규: `design/ui.jsx` 의 `ICON_D` 중 사용 아이콘(doc, history, plus, comment, chevronDown, reply, trash, copy, handoff, arrowRight, x)만 포팅 + `createIcon(name, size?)`(`createElementNS` 로 svg+path 생성) export (contracts/modules.md)
- [x] T004 `index.html` 재작성: 인라인 `<style>` 과 기존 단선형 DOM(#input/#convert/#copy/#history/#output) 제거, `<div class="app"><header class="topbar">…브랜드…</header><main id="app"></main></div>` 셸로 교체, `<script type="module" src="/src/main.ts">` 유지 (contracts/ui.md 전체 셸)

**Checkpoint**: 페이지 로드 시 topbar + 빈 `#app` 표시, CSS 토큰 로드됨.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 UI 스토리가 의존하는 코어 데이터모델 변경 + 상태/렌더 골격

**⚠️ CRITICAL**: 이 단계 완료 전 어떤 사용자 스토리도 시작 불가

### Tests first (TDD — 순수 모듈)

- [x] T005 [P] `tests/parse.test.ts`: 모든 `Section` 에 비어있지 않은 `title` (heading 섹션=heading 텍스트, intro=fallback "도입") 검증 케이스 추가 — 먼저 실패 확인
- [x] T006 [P] `tests/notes.test.ts`: `add`/`rebut` 이 `ts` 부여, `delete(noteId)` 가 해당 노트 + 그 노트를 target 으로 한 반박까지 제거, `loadFrom` 이 `ts` 보존 검증 케이스 추가 + 기존 `edit` 케이스 제거 — 먼저 실패 확인
- [x] T007 [P] `tests/export.test.ts`: 픽스처 `Note` 에 `ts` 추가(타입 충족) 후 `buildExport` 출력 형식 **불변** 검증 (SC-003)
- [x] T008 [P] `tests/storage.test.ts`: 픽스처 `Note` 에 `ts` 추가, 저장→복원 라운드트립 정상 검증

### Implementation (테스트 통과)

- [x] T009 [P] `src/parse.ts`: `Section` 에 `title: string` 추가, `parseSections` 에서 채움(heading 텍스트 / intro fallback) — T005 통과 (data-model.md)
- [x] T010 [P] `src/notes.ts`: `Note` 에 `ts: number` 추가; `add`/`rebut` 에 `ts=Date.now()`; `delete(noteId)` 추가(노트+대상반박 제거, `blockOf` 정리); `edit` 제거; `toJSON`/`loadFrom` 가 `ts` 보존 — T006 통과 (research D-5)
- [x] T011 `src/main.ts`: (재작성 시작) 스타일 import(`./styles/tokens.css`, `./styles/components.css`); 부팅 시 `matchMedia('(prefers-color-scheme: dark)')` → `document.documentElement.dataset.theme` 설정 + change 리스너 (research D-3); `AppState` 정의·초기화(활성 문서 있으면 mode='review' else 'empty'); `#app` 에 click 이벤트 위임 골격(`[data-act]`/`data-*-id` 분기) + `render()` 호출 진입점 (data-model.md AppState)
- [x] T012 `src/render.ts`: (재작성 시작) `renderApp(state, store, ctx)` 골격 — `.workspace.workspace--three` 에 3개 빈 `.pane`(history/center/notes) + `.pane__head` 생성, 매 호출 `#app.innerHTML=''` 후 재구성 (contracts/ui.md, research D-1)

**Checkpoint**: `npm test` green(순수 모듈), 앱 로드 시 빈 3-pane 골격 렌더.

---

## Phase 3: User Story 1 — 3-pane 워크스페이스에서 plan 검수 시작 (P1) 🎯 MVP

**Goal**: 온보딩 → 붙여넣기 → 변환 → 3-pane + 섹션 카드. 재실행 시 활성 문서 복원.

**Independent Test**: 저장 없음 시 온보딩 표시 → 샘플로 시작 → 변환 → 3개 패널 + 섹션 카드 렌더 (quickstart 1~2).

- [x] T013 [US1] `src/render.ts`: history pane — `listDocs()` 목록을 `.hist-item`(title/meta: stamp·섹션수·의견수, `is-active`), 빈 상태 `.subtle` 안내, `.hist-group-label`, 새 리뷰 `.icon-btn[data-act=new-review]`, 항목 `data-doc-id` + 삭제 `[data-act=del-doc]` (contracts/ui.md 이력 pane, FR-013 보존)
- [x] T014 [US1] `src/render.ts`: center pane 3-모드 — empty(`.empty-hero` 3-step + 샘플/빈화면 버튼), paste(`.paste-wrap` textarea + 변환/샘플채우기 바 + 글자수), review(`.section-stack` > `.section-card` head[chevron/#id/title]·body.md(innerHTML=section.html, FR-015)) (contracts/ui.md 중앙 pane, FR-001/003/004/005)
- [x] T015 [US1] `src/render.ts`: notes pane 컨테이너 + 빈 상태(`.notes-empty`)만 — `.workspace--three` 3단 완성(내용은 US3) (contracts/ui.md 노트 pane head)
- [x] T016 [US1] `src/sample.ts` 신규: 이 기능 산출물 3개(`specs/003-.../{spec,plan,tasks}.md`)를 Vite `?raw` 로 import 해 `SAMPLES` 배열 export (dogfooding, 출처=claude design 결정). 내용이 실제 plan 과 동기.
- [x] T016b [US1] `src/main.ts`: 컨트롤러 로직 — convert(`parseSections`→새 `StoredDoc`→`saveDoc`+`setActive`+`store.clear`, mode='review', selectedSection=첫 섹션), new-review/start-blank, start-sample(=`SAMPLES` 3개를 이력에 시딩 후 첫 문서 열기), fill-sample, 이력 항목 클릭→로드(`loadFrom`)+mode review, 삭제→`removeDoc`+폴백, 부팅 시 `getActive()` 복원 (FR-004/012/013, 기존 main.ts persist/loadDoc/deleteDoc 패턴 재사용)

**Checkpoint**: 붙여넣기→변환→3-pane + 섹션 카드, 새로고침 복원 동작 (US1 독립 검증 가능).

---

## Phase 4: User Story 2 — 섹션 탐색: 선택·접기·노트 보유 표시 (P2)

**Goal**: 섹션 카드 선택 강조, 접기/펼치기, 노트 보유 시각 구분.

**Independent Test**: 다중 섹션 문서에서 카드 접기/펴기, 선택 강조, 노트 달린 섹션 구분 확인 (quickstart 3).

- [x] T017 [US2] `src/main.ts` + `src/render.ts`: 섹션 선택 — `.section-card` 클릭 → `AppState.selectedSectionId` 설정 → 재렌더 시 해당 카드 `is-selected` (FR-007)
- [x] T018 [US2] `src/main.ts` + `src/render.ts`: 접기 토글 — `.section-card__head` 클릭 → `AppState.collapsed`(Set) 토글 → `is-collapsed` 클래스(본문 숨김·chevron 회전) (FR-006)
- [x] T019 [US2] `src/render.ts`: 섹션 카드에 `has-notes`(노트≥1) + comment 카운트 `.badge--accent` — `store.get(sectionId).length` 기반 (FR-008)

**Checkpoint**: US1 + US2 독립 동작. (has-notes/카운트는 노트 존재 시 가시 — US3 와 자연 연동)

---

## Phase 5: User Story 3 — 노트 패널에서 의견·반박 작성 (P2)

**Goal**: 노트 패널 작성기로 의견 추가, 반박 스레딩, 섹션별 카운트, 삭제.

**Independent Test**: 섹션 선택 → 작성기로 의견 추가 → 반박 추가 → 스레드·카운트 확인, 삭제 (quickstart 4~5).

- [x] T020 [US3] `src/render.ts`: notes pane 내용 — `Object` 순회로 노트 보유 섹션마다 `.note-group`(head: `#sid`·title), root note + 그 반박들을 `.note`/`.note--rebuttal`(kind/id/text/`.note__time`=stamp(ts), 액션: reply/del-note) 렌더, pane head 카운트 뱃지 (contracts/ui.md 노트 pane, FR-010/011)
- [x] T021 [US3] `src/render.ts`: `.note-composer` — 선택 섹션 있을 때 표시(섹션 라벨 + `.textarea[data-role=composer]` + 추가 버튼 + ⌘↵ 힌트), `replyTo` 면 반박 안내 row + 취소 (contracts/ui.md 작성기, FR-009)
- [x] T022 [US3] `src/main.ts`: 노트 액션 — add(`[data-act=add-note]` 또는 ⌘/Ctrl+Enter → composer DOM 값 읽어 `store.add`/`store.rebut` → persist → 재렌더), del-note(`store.delete` → persist → 재렌더), reply(`replyTo` 설정+재렌더)/cancel-reply (FR-009/010, 입력값은 상태 아닌 DOM 에서 읽음 — research D-1)

**Checkpoint**: US1~US3 독립 동작. 노트 추가 시 US2 의 has-notes/카운트도 반영.

---

## Phase 6: User Story 4 — 핸드오프 복사 (P3)

**Goal**: 원본 + 섹션별 의견을 클립보드로 복사.

**Independent Test**: 의견 있는 문서에서 핸드오프 복사 → 클립보드 내용 형식 확인 (quickstart 7).

- [x] T023 [US4] `src/main.ts`: 핸드오프 — center pane head `.btn--primary[data-act=handoff]` + notes pane head `.icon-btn[data-act=handoff]` → `buildExport(currentDoc.source, sections, store.toMap())` → `navigator.clipboard.writeText` (FR-014, 기존 copy() 재사용)

**Checkpoint**: 4개 스토리 모두 독립 동작.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: 정리·검증

- [x] T024 본인 변경으로 orphan 된 코드 정리 — 재작성으로 사라진 `render.ts` 구버전 함수(`renderSections`/`renderNotes`/`renderHistory` 의 `.block*` 마크업), `index.html` 구 요소/핸들러, 미사용 import 만 제거 (CLAUDE.md Surgical — 무관 dead code 는 건드리지 않음)
- [x] T025 `npm run build`(tsc + vite) 타입 에러 0·빌드 성공 확인 (quickstart 빌드)
- [x] T026 `npm run dev` + Playwright MCP 로 quickstart.md 수동검증 1~10 수행(FR/SC), `design/index.html` 프로토타입 탭과 시각 대조 (SC-004)
- [x] T027 [P] 회귀 가드 — `npm test` green 재확인 + 002 기능(섹션분할/반박/다중문서/핸드오프/markdown 안전성) 동작 확인 (SC-003)

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup(P1)**: 즉시 시작. T001~T004 모두 [P] 가능(서로 다른 파일).
- **Foundational(P2)**: Setup 후. 모든 UI 스토리를 BLOCK. T005~T010 은 [P], T011/T012 는 그 뒤(데이터모델 의존).
- **US1(P3)**: Foundational 후. MVP.
- **US2/US3/US4**: Foundational 후. US1 의 3-pane 골격 위에 얹힘(같은 render.ts/main.ts 라 순차 권장).
- **Polish(P7)**: 원하는 스토리 완료 후.

### 파일 충돌 주의 (상호 [P] 불가)
- `src/main.ts`: T011, T016, T017, T018, T022, T023 — 순차.
- `src/render.ts`: T012, T013, T014, T015, T019, T020, T021 — 순차.

### Parallel Opportunities
- Setup: T001/T002/T003 동시 (T004 는 셸, 독립).
- Foundational 테스트: T005~T008 동시. 구현 T009/T010 동시(parse/notes 다른 파일).
- Polish: T027 [P].

---

## Implementation Strategy

### MVP First (US1)
1. Phase 1 Setup → 2. Phase 2 Foundational(테스트 green) → 3. Phase 3 US1 → **STOP & VALIDATE**(붙여넣기→3-pane).

### Incremental
US1(MVP) → US2(탐색) → US3(노트) → US4(핸드오프). 각 단계 후 독립 검증·커밋.

---

## Notes
- [P] = 다른 파일·무의존. `main.ts`/`render.ts` 는 단일 파일이라 해당 태스크 간 [P] 금지.
- 순수 모듈은 테스트 먼저 실패 확인 후 구현(TDD). UI 는 Playwright 수동검증.
- 각 태스크/논리 그룹 후 커밋(트레일러 없이 — CLAUDE.md).
- 샘플 plan 출처(확정): claude design 의 `SAMPLE_PLAN` 을 `src/sample.ts` 상수로 포팅(T016).
