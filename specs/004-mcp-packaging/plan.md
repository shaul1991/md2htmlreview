# Implementation Plan: MCP 패키징 — 에이전트가 리뷰 앱을 직접 호출

**Branch**: `004-mcp-packaging` (현재 doc 산출물은 `main` 에 커밋, 푸시는 승인 후) | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md) (승인 rev `c365b4e7`)

**Input**: Feature specification from `specs/004-mcp-packaging/spec.md`

## Summary

오늘의 핸드오프는 사람이 markdown 을 **복사→앱에 붙여넣고**, 검수 후 **결과를 복사→에이전트 대화창에 붙여넣는** 수동 왕복이다(spec 배경 2·4번). 이 plan 은 그 왕복을 **에이전트의 MCP 직접 호출**로 대체한다.

기술 접근: **한 프로세스**가 (1) stdio MCP 서버(`submit_plan`/`get_review` tool 2개)와 (2) 브라우저용 로컬 HTTP 서버(리뷰 조회·결정 제출·정적 자산 서빙)를 함께 띄운다. 리뷰 세션은 그 프로세스 메모리에 산다(영속은 비목표). 핵심 순수 모듈 `parse`/`notes`/`export` 는 DOM 없이 그대로 import 해 재사용하며, **에이전트 회수 형식의 SSoT 는 `export.buildExport`** 다. 브라우저↔서버는 **에이전트 폴링 + 브라우저 POST**(D-2), MCP 프로토콜은 **공식 `@modelcontextprotocol/sdk`**(D-1=a)로 구현한다. 기존 붙여넣기·클립보드 경로는 추가 경로로 그대로 둔다(회귀 0건).

## Technical Context

**Language/Version**: TypeScript (ES2022), strict — 기존 그대로.

**Primary Dependencies**:
- `markdown-it@^14` (`{ html:false, linkify:true }`) — 기존 그대로, 서버가 `parse.ts` 경유 재사용.
- **신규**: `@modelcontextprotocol/sdk` — MCP 프로토콜(stdio 트랜스포트) 구현 라이브러리. D-1=(a) CEO 승인. 손수 JSON-RPC 구현 안 함.
- 로컬 HTTP 는 **Node 내장 `http`** — 웹 프레임워크(Express 등) 미도입.

**Storage**: 없음(영속 비목표). 리뷰 세션 = 서버 프로세스 메모리(`Map<reviewId, ReviewSession>`). 브라우저의 기존 `localStorage`(`md2htmlreview/v2`) 경로는 무변경.

**Testing**: Vitest(node 환경). 신규 순수 모듈 `server/sessions.ts` 는 TDD. HTTP 왕복은 in-process 통합 테스트(브라우저 불요 — US1 독립 검증).

**Target Platform**: 두 표면 — (1) MCP 호스트(Claude Code/Codex)가 stdio 로 스폰하는 Node 프로세스, (2) 그 프로세스가 서빙하는 데스크톱 브라우저(localhost).

**Project Type**: 단일 저장소, 두 빌드 타깃 — 기존 브라우저 번들(Vite → `dist/`) + 신규 서버 번들(`tsc` → `dist-server/`). 백엔드 프레임워크 없음.

**Performance Goals**: 비차단 제출(`submit_plan` 즉시 반환), 폴링 응답은 인메모리 조회 — 수 ms.

**Constraints**: 프런트 프레임워크 미도입(MCP SDK 는 프로토콜 라이브러리라 예외 — D-1), local-first(SC-005, FR-012 — 모든 흐름 localhost), `markdown-it { html:false }` 유지(FR-011, SC-003).

**Scale/Scope**: 로컬 단일 사용자. 동시 다중 에이전트 조율은 비목표. 세션 수는 한 호스트 세션 동안 소수.

NEEDS CLARIFICATION: 없음 — D-1/D-2 가 CEO 승인으로 확정됨. 잔여 세부(서버 빌드 수단, 기본 포트값)는 tasks 단계 결정으로 명시.

## Constitution Check

*GATE: Phase 0 전 통과 필수, Phase 1 설계 후 재확인.*

`.specify/memory/constitution.md` 는 아직 템플릿 placeholder 다(003 과 동일). 정식 constitution 수립은 범위 밖이므로 **프로젝트 CLAUDE.md 의 karpathy 4원칙 + 헌장 기술 제약**을 게이트로 적용:

- **Think Before Coding**: 두 개의 진짜 결정(회수 형식을 서버/브라우저 중 어디서 만드나, 브라우저를 어떻게 붙여넣기 없이 로드하나)을 가정으로 숨기지 않고 아래 「핵심 설계 결정」에 드러냄 → PASS.
- **Simplicity First**: 신규 런타임 의존성은 `@modelcontextprotocol/sdk` **하나**(CEO 승인). HTTP 는 내장 `http`, 세션은 `Map` 하나, 새 추상화는 `ReviewSession` 1종. WebSocket/푸시/영속/멀티유저 전부 비목표 → PASS.
- **Surgical Changes**: 코어 순수 모듈(`parse`/`notes`/`export`)은 **무변경 재사용**. 브라우저는 부팅 로직에 `?review=` 로드 분기 **가산**만(기존 paste/localStorage 경로 보존, FR-013). 서버는 전부 신규 `server/` 디렉터리 → PASS.
- **Goal-Driven**: 변경/신규 모듈마다 테스트 우선(아래 「테스트 전략」). SC-002 문자열 일치·SC-003 안전성·SC-004 상태 구분을 각각 검증 케이스로 고정 → PASS.

> 신규 의존성 1건(`@modelcontextprotocol/sdk`)은 「프레임워크 미도입」 제약과 닿으므로 Complexity Tracking 에 정당화 기록(아래). markdown-it 을 받아들인 것과 같은 결의 결정(D-1=a).

## Project Structure

### Documentation (this feature)

```text
specs/004-mcp-packaging/
├── spec.md              # /speckit-specify 산출 (CEO 승인, rev c365b4e7)
├── plan.md              # 이 파일 (/speckit-plan) — SDD gate 2
└── tasks.md             # /speckit-tasks 산출 (plan 승인 후 별도 게이트, 이 이슈 범위 아님)
```

> Simplicity First: research/data-model/contracts 를 별도 파일로 분리하지 않고, 이 단일 슬라이스에 필요한 결정·계약·테스트를 본 plan.md 에 자족적으로 담는다(이슈 수락 기준 = plan.md 자체). 분리가 필요하면 plan 검수에서 알려주세요.

### Source Code (repository root)

```text
src/                         # 브라우저 번들 (Vite → dist/) — 코어는 무변경
├── parse.ts                 # 무변경: parseSections / Section (서버가 직접 import)
├── notes.ts                 # 무변경: Note 타입 / NoteStore.toJSON (검수 결정 직렬화 형식)
├── export.ts                # 무변경: buildExport ← 회수 형식 SSoT (FR-014)
├── main.ts                  # 가산: 부팅 시 `?review=` 감지 → GET /api/reviews/{id} → enterReview
└── (render/storage/...)     # 무변경 (붙여넣기·클립보드 경로 보존 — FR-013)

server/                      # 신규 — Node 서버 번들 (tsc → dist-server/). DOM 비종속.
├── index.ts                 # 진입점: stdio MCP 서버 + http 서버를 한 프로세스에서 기동
├── sessions.ts              # ReviewSession 인메모리 저장소 (순수, TDD 대상)
├── mcp.ts                   # @modelcontextprotocol/sdk: submit_plan / get_review tool 핸들러
└── http.ts                  # Node http: /api/reviews/:id (GET), /api/reviews/:id/decision (POST), dist/ 정적 서빙

tests/
├── server/
│   ├── sessions.test.ts     # 세션 상태 전이 (FR-008/009/010, SC-004)
│   └── roundtrip.test.ts    # US1 독립 왕복 + SC-002 문자열 일치 + SC-003 html:false (브라우저 불요)
└── export.test.ts           # 기존 — buildExport 결정성(SSoT 기준)
```

**Structure Decision**: 기존 단일 프로젝트 레이아웃 유지. **두 빌드 타깃**으로 분리한다 — 브라우저(`src/` → Vite → `dist/`)와 서버(`server/` → `tsc -p tsconfig.server.json` → `dist-server/`). 서버 코드를 `src/` 밖에 두는 이유: Vite 브라우저 번들에 Node 전용 코드(`http`, MCP SDK)가 끌려 들어가지 않게 경계를 물리적으로 가른다. 서버는 `src/{parse,notes,export}.ts` 를 상대 경로로 직접 import(이미 DOM 비종속). MCP 호스트는 `node dist-server/index.js` 를 stdio 로 스폰한다.

## 핵심 설계 결정 *(plan 검수 포인트)*

### 1. 한 프로세스 = stdio MCP + 로컬 HTTP (아키텍처)

`server/index.ts` 가 부팅 시 두 트랜스포트를 함께 연다:
- **MCP(stdio)**: 호스트(Claude Code/Codex)가 표준입출력으로 말한다. `submit_plan`/`get_review` tool 노출.
- **HTTP(localhost)**: 브라우저가 리뷰를 조회/결정 제출하고, 빌드된 앱(`dist/`)을 받는다.

둘은 같은 `sessions` 인메모리 저장소를 공유한다. 호스트가 프로세스를 내리면 미회수 세션은 사라진다(spec 가정 — 영속 비목표). 포트 충돌 시(엣지 케이스) 대체 포트로 바인딩하고, 실제 바인딩된 포트를 `submit_plan` 의 `url` 에 반영한다.

### 2. 회수 형식은 **서버가** `buildExport` 로 만든다 (SSoT — SC-002/FR-014)

검수 결정 POST 의 본문은 **구조화된 의견 맵**(`Record<sectionSlug, Note[]>` = 브라우저 `NoteStore.toJSON()` 산출물)이다. `get_review(completed)` 시 서버가 다음을 계산한다:

```
buildExport(session.source, parseSections(session.source), new Map(Object.entries(decision.notes)))
```

- **왜 서버에서**: US1 독립 검증(브라우저 없이 `submit_plan` → 로컬 API 에 결정 직접 POST → `get_review` 확인)이 성립하려면 회수 텍스트 생성이 서버 측에서 일어나야 한다. 브라우저가 완성 문자열을 보내면 그 경로를 브라우저 없이 검증할 수 없다.
- **SC-002 문자열 일치 보장**: 클립보드 핸드오프(`main.ts copyHandoff`)도 `buildExport(currentDoc.source, parseSections(source), store.toMap())` 를 호출한다. 서버도 동일 `source`·동일 의견 맵으로 **같은 순수 함수**를 부른다. `parseSections` 는 결정적이고, `Object.entries`/배열은 삽입 순서를 보존하므로 출력은 바이트 단위로 동일하다. `buildExport` 는 `note.id/kind/targetNoteId/text` 만 쓰고 `ts` 는 안 쓰므로 타임스탬프 차이도 영향 없다. → 형식 SSoT 단일.

### 3. 브라우저는 `?review=` 로 붙여넣기 없이 로드한다 (FR-005)

`submit_plan` 이 돌려주는 `url` = `http://127.0.0.1:{port}/?review={reviewId}`. `main.ts` 부팅 로직에 **가산 분기**: `getActive()`(localStorage) 보다 먼저 `?review=` 쿼리를 보고, 있으면 `GET /api/reviews/{id}` 로 원본 plan 을 받아 기존 `enterReview()` 에 그대로 태운다(서버 세션 기준이라 localStorage 영속은 생략). 쿼리가 없으면 현행 부팅 그대로 → 기존 경로 무회귀(FR-013).

### 4. 폴링 + 비차단 제출 (D-2, FR-003)

`submit_plan` 은 세션을 `pending` 으로 만들고 즉시 `{ reviewId, url, status:"pending" }` 반환. 에이전트는 `get_review` 를 폴링한다. 사람이 "검수 완료" → 브라우저가 `POST /decision` → 세션 `completed`. 푸시/WebSocket 없음. 사람이 검수 없이 브라우저를 닫아도 세션은 `pending` 으로 남고 `get_review` 는 블로킹하지 않는다(엣지 케이스).

### 5. 상태 구분: pending / completed(의견 0건) / 없음 (SC-004, FR-009/010)

`ReviewSession.status` 는 `pending | completed`. 결정 POST 시에만 `completed` 로 전이하며 의견 0건이어도 `completed`(빈 의견 맵). 미제출 = `pending`. 알 수 없는 `reviewId` = `get_review` 가 충돌 없이 "없음"(예: `{ status:"pending" }` 이 아닌 명시적 not-found 신호)을 반환. 세 상태가 100% 구분된다.

## 브라우저 ↔ 서버 내부 계약 *(로컬 API — MCP surface 아님)*

| 메서드 · 경로 | 요청 | 응답 | 용도 |
| --- | --- | --- | --- |
| `GET /api/reviews/{reviewId}` | — | `{ reviewId, source, status }` / 404 if unknown | 브라우저가 붙여넣기 없이 원본 plan 로드 (FR-005) |
| `POST /api/reviews/{reviewId}/decision` | `{ notes: Record<sectionSlug, Note[]> }` | `{ ok: true }` / 404 | 사람 "검수 완료" → 세션을 `completed` 로 기록 (FR-007) |
| `GET /*` (정적) | — | 빌드된 앱(`dist/`) | 같은 서버가 기존 리뷰 UI 서빙 |

**MCP surface (호스트용, 변경 없이 spec 표 그대로)**:

| Tool | 입력 | 출력 |
| --- | --- | --- |
| `submit_plan` | `markdown`(필수), `title?` | `{ reviewId, url, status:"pending" }` |
| `get_review` | `reviewId`(필수) | `{ status:"pending"\|"completed", review?: string }` (`completed` 면 `review` = `buildExport` 산출) |

`POST /decision` 의 `notes` 형식은 기존 `StoredDoc.notes`(= `NoteStore.toJSON()`)와 동일한 `Record<string, Note[]>` 로, 브라우저가 이미 직렬화하는 모양 그대로다 — 신규 직렬화 형식을 만들지 않는다(Surgical).

## 테스트 전략

순수 모듈 TDD + 브라우저 없는 통합 왕복으로 spec 의 측정 가능 기준을 직접 건다.

1. **US1 독립 왕복** (`tests/server/roundtrip.test.ts`, 브라우저 불요): in-process 로 http 서버 기동 → 세션 생성(`submit_plan` 핸들러 직접 호출) → `POST /api/reviews/{id}/decision` 에 의견 맵 직접 POST(사람 검수 시뮬레이트) → `get_review` 가 원본 + 섹션 slug 별 의견 구조화 텍스트를 돌려주는지. **verify**: 반환 문자열에 `# 원본 plan` + `## [slug]` + 의견 라인 존재.
2. **SC-002 문자열 일치** (같은 파일): 동일 `source`·동일 의견 맵으로 ① 서버 `get_review` 결과와 ② 브라우저 클립보드 경로가 부르는 `buildExport(source, parseSections(source), map)` 결과를 비교 → **문자열 완전 일치** assert.
3. **SC-003 / FR-011 `html:false` 회귀** (같은 파일): raw HTML(`<script>` 등) 포함 plan 을 제출·결정·회수 → 회수 텍스트·`GET /api/reviews/{id}` 어디에도 실행 가능한 raw HTML 이 살아남지 않음(escape 유지) assert. 서버가 `parseSections`(=`markdown-it{html:false}`)를 쓰므로 단일 지점 보장.
4. **SC-004 / FR-009 상태 구분** (`tests/server/sessions.test.ts`): 제출 직후 `pending` → 결정(의견 0건) 후 `completed` 인데 `pending` 과 구분 / 결정(의견 N건) 후 `completed`. 세 경우 명확 구분 assert.
5. **FR-008 / FR-010 엣지** (`sessions.test.ts`): 같은 plan 중복 `submit_plan` → 매번 새 `reviewId`(덮어쓰기 없음). 알 수 없는 `reviewId` `get_review`/`GET` → 충돌 없이 not-found.
6. **SC-006 회귀 0건**: 기존 `parse/notes/export/storage` 테스트 무변경 통과 + `main.ts` 가산 분기가 기존 부팅(쿼리 없음) 경로를 바꾸지 않음(수동 스모크: 폴백 페이지 검증). 코어 모듈 시그니처 무변경이므로 회귀 표면 최소.

> 스모크(수동): `node dist-server/index.js` 기동 → `submit_plan` 으로 샘플 plan 제출 → 반환 url 을 브라우저로 열어 카드 로드 확인 → 의견 달고 "검수 완료" → `get_review` 가 핸드오프 텍스트 반환. SC-005 오프라인(외부 네트워크 차단) 상태에서도 성공.

## 기술 제약 유지 확인 *(헌장 / spec)*

- **프런트 프레임워크 미도입**: UI 는 기존 vanilla-ts 앱 그대로. 신규 의존성은 서버측 MCP 프로토콜 라이브러리 1종뿐(프런트 프레임워크 아님 — D-1).
- **로컬-퍼스트(SC-005, FR-012)**: 모든 데이터가 localhost 안에서 끝난다. 외부 전송·원격 저장 없음. 서버 바인딩은 `127.0.0.1`.
- **`markdown-it { html:false, linkify:true }`(FR-011, SC-003)**: 서버가 `parse.ts` 의 동일 인스턴스를 재사용 — 제출·렌더·회수 전 구간 단일 무력화 지점.
- **추가이지 대체 아님(FR-013)**: 붙여넣기 검수·클립보드 핸드오프 경로 무변경 유지.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| 신규 런타임 의존성 `@modelcontextprotocol/sdk` | MCP 프로토콜(stdio JSON-RPC, 버전 협상)을 표준 호환으로 말하기 위함. CEO D-1=(a) 승인. | (b) 손수 JSON-RPC 구현은 프로토콜 버전 대응·호환을 자체 부담 → 더 많은 코드·리스크. SDK 가 더 단순·안전(markdown-it 채택과 같은 결). |
| 두 번째 빌드 타깃(`server/` → `dist-server/`, 별도 tsconfig) | Node 전용 서버 코드를 Vite 브라우저 번들과 물리적으로 분리. | 단일 빌드로 합치면 브라우저 번들에 `http`/MCP SDK 가 끌려 들어가 번들 오염·빌드 실패. 디렉터리·tsconfig 분리가 최소 비용. |
