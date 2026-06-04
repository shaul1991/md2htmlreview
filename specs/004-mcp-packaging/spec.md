# Feature Specification: MCP 패키징 — 에이전트가 리뷰 앱을 직접 호출

**Feature Branch**: `004-mcp-packaging`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "현재 copy/paste 수동 핸드오프를 없애고, Claude/Codex 같은 에이전트가 md2htmlreview 를 직접 호출하도록 MCP 서버로 패키징한다. 이 이슈의 범위 = spec 단계만. 가장 얇은 동작 슬라이스(MVP)부터, 명시적 비목표 포함." (MYHA-10)

---

## 배경 · 문제 정의 *(이 spec 이 푸는 것)*

오늘의 핸드오프는 **사람이 손으로 옮기는 왕복**이다:

1. 에이전트(Claude Code/Codex 등)가 `plan.md` 를 만든다.
2. 사람이 그 markdown 을 **복사**해 md2htmlreview 브라우저 앱에 **붙여넣는다**.
3. 사람이 단락별로 검수하고 의견·반박을 단다.
4. 사람이 "핸드오프 복사"로 `원본 + 섹션별 의견` 텍스트를 **복사**해 에이전트 대화창에 **붙여넣는다**.

2번과 4번의 복사/붙여넣기가 마찰의 핵심이다. **이 spec 의 목표는 이 왕복을 에이전트의 직접 호출로 대체**하는 것이다 — 에이전트가 plan 을 제출하고(2번 제거), 사람이 검수를 마치면 그 결정을 에이전트가 다시 읽어온다(4번 제거). 검수 행위 자체(3번)와 그 UI 는 기존 앱을 그대로 쓴다.

핵심 기술 질문은 하나다: **브라우저에서 일어나는 사람의 검수**와 **에이전트가 말하는 MCP 프로토콜**을 어떻게 잇는가. 이 spec 은 그 다리(bridge)의 가장 얇은 형태를 정의한다.

---

## User Scenarios & Testing *(mandatory)*

본 기능의 사용자는 둘이다 — **에이전트**(MCP 클라이언트)와 그 에이전트를 모는 **사람 리뷰어**. 아래 스토리는 가장 얇은 동작 슬라이스부터 쌓아 올린다.

### User Story 1 - 에이전트가 plan 을 제출하고 검수 결과를 회수한다 (Priority: P1)

에이전트가 MCP tool `submit_plan` 으로 plan markdown 을 제출하면, 로컬에 리뷰 세션이 만들어지고 사람이 열 수 있는 localhost 주소가 반환된다. 사람이 검수를 마치고 결정을 제출하면, 에이전트가 MCP tool `get_review` 로 `원본 + 섹션별 의견` 구조화 텍스트를 그대로 받아온다. 복사/붙여넣기가 한 번도 일어나지 않는다.

**Why this priority**: 이 왕복이 이 기능의 본질이자 로드맵 헤드라인(스트림 1)이다. 이것만 구현해도 "수동 핸드오프 → 직접 호출"이라는 핵심 가치가 전달되고, 나머지 스토리(브라우저 검수 UI, 대기 상태)가 얹힐 토대가 된다.

**Independent Test**: 브라우저 없이 MCP/로컬 API 계층만으로 검증 가능 — `submit_plan(샘플 markdown)` 호출 → 반환된 reviewId 로 검수 결정을 로컬 API 에 직접 POST(사람 검수를 시뮬레이트) → `get_review(reviewId)` 가 원본 plan + 해당 섹션 slug 로 키된 의견을 담은 구조화 텍스트를 돌려주는지 확인.

**Acceptance Scenarios**:

1. **Given** MCP 서버가 떠 있다, **When** 에이전트가 `submit_plan` 으로 plan markdown 을 제출한다, **Then** 리뷰 세션이 생성되고 `reviewId` 와 사람이 열 localhost 주소가 반환된다.
2. **Given** 어떤 reviewId 에 대해 검수 결정(섹션별 의견)이 제출되어 있다, **When** 에이전트가 `get_review(reviewId)` 를 호출한다, **Then** `원본 plan + 섹션별 의견` 구조화 텍스트(기존 핸드오프 형식과 동일)가 반환된다.
3. **Given** 입력 plan 에 raw HTML 이 포함되어 있다, **When** 제출·검수·회수를 거친다, **Then** 렌더·회수 결과 어디에서도 raw HTML 이 실행 가능한 형태로 살아남지 않는다(escape 유지).

---

### User Story 2 - 사람이 에이전트가 보낸 plan 을 브라우저에서 검수한다 (Priority: P2)

사람이 `submit_plan` 이 돌려준 localhost 주소를 열면, **붙여넣기 없이** 제출된 plan 이 기존 3-pane 워크스페이스에 로드되어 섹션 카드로 나열된다. 사람은 평소처럼 단락별 의견·반박을 달고, "검수 완료"로 결정을 로컬 서버에 되돌려 보낸다.

**Why this priority**: P1 의 왕복이 실제 가치를 내려면 사람이 진짜 UI 로 검수해야 한다. 다만 P1(MCP tool + 로컬 API)이 있어야 성립하고, 검수 UI 자체는 기존 앱의 재사용이므로 P2.

**Independent Test**: 리뷰 세션이 시드된 상태에서 그 리뷰 주소를 연다 → 붙여넣기 없이 섹션 카드가 렌더된다 → 한 섹션에 의견을 단다 → "검수 완료"를 누른다 → 로컬 서버의 해당 세션에 결정이 기록되는지 확인.

**Acceptance Scenarios**:

1. **Given** 에이전트가 제출한 리뷰 세션의 주소, **When** 사람이 그 주소를 연다, **Then** 제출된 plan 이 붙여넣기 없이 자동으로 로드되어 섹션 카드로 나열된다.
2. **Given** 로드된 검수 화면, **When** 사람이 섹션에 의견·반박을 달고 "검수 완료"를 실행한다, **Then** 그 결정이 로컬 서버의 해당 리뷰 세션에 기록되어 `get_review` 로 회수 가능해진다.

---

### User Story 3 - 에이전트가 검수 진행 상태를 확인한다 (대기/완료) (Priority: P3)

사람의 검수는 시간이 걸리므로, 에이전트는 `submit_plan` 직후 결과를 기다리며 블로킹하지 않는다. `get_review` 는 아직 검수가 끝나지 않았으면 `pending` 상태를, 끝났으면 결정을 돌려준다. 에이전트는 폴링으로 완료를 감지한다.

**Why this priority**: 비동기 제출/회수 모델의 사용성을 다듬는 단계. P1 의 두 tool 이 있으면 동작은 하지만, 명시적 상태 구분이 있어야 에이전트가 "아직 안 끝남"과 "의견 0건으로 끝남"을 혼동하지 않는다.

**Independent Test**: `submit_plan` 직후 곧장 `get_review` → `pending` → 결정 제출 후 다시 `get_review` → `completed` + 결정. 의견 0건으로 완료한 경우와 아직 미완료인 경우가 구분되는지 확인.

**Acceptance Scenarios**:

1. **Given** 막 제출되어 아직 사람이 검수하지 않은 리뷰 세션, **When** 에이전트가 `get_review` 를 호출한다, **Then** `pending` 상태가 반환되고 결정 본문은 비어 있다.
2. **Given** 사람이 의견 없이 "검수 완료"만 누른 리뷰 세션, **When** 에이전트가 `get_review` 를 호출한다, **Then** `completed` 상태가 반환되며 "의견 없음"이 미완료(pending)와 명확히 구분된다.

---

### Edge Cases

- **로컬 서버 포트 충돌**: 기본 포트가 이미 점유되어 있을 때 서버가 깨지지 않고 대체 포트로 뜨거나 명확히 실패를 알리는가?
- **알 수 없는 reviewId**: 존재하지 않는 reviewId 로 `get_review` 호출 시 충돌 없이 "없음" 을 알리는가?
- **사람이 검수 없이 브라우저를 닫음**: 세션은 `pending` 으로 남고, 에이전트의 `get_review` 는 영원히 블로킹하지 않는가?
- **빈/공백 plan 제출**: 기존 `parseSections` 의 빈 입력 처리(섹션 0개)와 일관되게 동작하는가?
- **raw HTML 포함 plan**: `markdown-it({ html:false })` 가 제출·렌더·회수 전 구간에서 유지되는가(FR 안전성)?
- **MCP 서버 미기동 / 종료 후 회수**: 호스트가 서버 프로세스를 내린 뒤 `get_review` 가 호출되면 어떻게 되는가(세션은 프로세스 생명주기에 묶임 — 아래 가정 참조)?
- **같은 plan 의 중복 제출**: 매 `submit_plan` 은 독립된 새 reviewId 를 만드는가(덮어쓰기 없음)?

---

## MCP Surface (MVP) *(핵심 결정)*

가장 얇은 동작 슬라이스로 **tool 2개**만 노출한다. resource/prompt 는 MVP 비목표.

| Tool | 입력 | 출력 | 설명 |
| --- | --- | --- | --- |
| `submit_plan` | `markdown` (필수), `title?` | `{ reviewId, url, status: "pending" }` | plan 을 로컬 리뷰 세션으로 등록하고 사람이 열 localhost 주소를 돌려준다. 즉시 반환(논블로킹). |
| `get_review` | `reviewId` (필수) | `{ status: "pending" \| "completed", review?: string }` | 검수 결정을 회수한다. `completed` 면 `review` 에 `원본 + 섹션별 의견` 구조화 텍스트(기존 핸드오프 형식)가 담긴다. |

**브라우저 ↔ 서버 다리(로컬 API, MCP surface 아님 — 내부 계약)**:

- `GET /api/reviews/{reviewId}` → 제출된 원본 plan(브라우저가 붙여넣기 없이 로드).
- `POST /api/reviews/{reviewId}/decision` → 사람이 "검수 완료" 시 섹션별 의견을 제출.
- 정적 자산: 기존 빌드된 리뷰 앱(`dist/`)을 같은 로컬 서버가 서빙.

---

## Requirements *(mandatory)*

### Functional Requirements

**MCP 노출**

- **FR-001**: 시스템은 MCP tool `submit_plan(markdown, title?)` 을 노출해야 하며, 호출 시 로컬 리뷰 세션을 생성하고 `reviewId` 와 사람이 열 localhost 주소를 반환해야 한다.
- **FR-002**: 시스템은 MCP tool `get_review(reviewId)` 를 노출해야 하며, 해당 세션의 검수 상태(`pending`/`completed`)와, 완료 시 구조화된 검수 결과를 반환해야 한다.
- **FR-003**: `submit_plan` 은 사람의 검수가 끝날 때까지 블로킹하지 않고 즉시 반환해야 한다(비동기 제출 모델).
- **FR-004**: `get_review` 가 돌려주는 완료 시 검수 결과는 기존 핸드오프 형식(`원본 plan + 섹션 slug 별 의견/반박`, 현행 `buildExport` 산출물)과 동일해야 한다.

**브라우저 검수 연결**

- **FR-005**: 사람이 `submit_plan` 이 반환한 주소를 열면, 제출된 plan 이 붙여넣기 없이 기존 검수 워크스페이스에 로드되어야 한다.
- **FR-006**: 사람은 로드된 plan 을 기존과 동일하게 단락별로 검수(의견·반박)할 수 있어야 한다.
- **FR-007**: 사람이 "검수 완료"를 실행하면, 그 섹션별 결정이 로컬 서버의 해당 리뷰 세션에 기록되어 `get_review` 로 회수 가능해져야 한다.

**상태 · 식별**

- **FR-008**: 각 `submit_plan` 호출은 독립된 새 `reviewId` 를 생성해야 하며 기존 세션을 덮어쓰지 않아야 한다.
- **FR-009**: 검수가 제출되기 전 세션은 `pending` 이어야 하고, 의견 0건으로 완료된 세션(`completed`, 의견 없음)과 명확히 구분되어야 한다.
- **FR-010**: 알 수 없는 `reviewId` 에 대한 `get_review` 는 충돌 없이 "없음"을 알려야 한다.

**보존 · 안전 · 경계**

- **FR-011**: plan 의 파싱·렌더는 `markdown-it({ html:false, linkify:true })` 를 유지해 raw HTML 을 무력화해야 한다(제출·렌더·회수 전 구간, XSS 방지).
- **FR-012**: 리뷰 세션 데이터(제출 plan·검수 결정)는 로컬 머신을 떠나지 않아야 한다(local-first). 외부 네트워크 전송·원격 저장은 없어야 한다.
- **FR-013**: 기존 브라우저 앱의 붙여넣기 기반 검수와 클립보드 핸드오프 경로는 그대로 동작해야 한다(MCP 경로는 추가이지 대체가 아님 — 회귀 0건).
- **FR-014**: 섹션 파싱·노트 모델·검수 결과 직렬화는 기존 순수 모듈(`parse`/`notes`/`export`)을 재사용해야 하며, 에이전트 회수 형식의 SSoT 는 `export.buildExport` 여야 한다.

### Key Entities *(include if feature involves data)*

- **리뷰 세션(Review Session)**: 에이전트가 제출한 plan 한 건의 검수 단위. `reviewId`, 원본 markdown, 상태(`pending`/`completed`), 사람의 검수 결정(섹션 slug → 의견들), 생성/완료 시각을 가진다. MVP 에서는 MCP 서버 프로세스 생명주기에 묶인다(아래 가정 참조).
- **MCP Tool**: 에이전트에게 노출되는 동작. MVP 는 `submit_plan` 과 `get_review` 둘뿐.
- **섹션(Section)**: 기존 `parse.ts` 의 검수 단위(slug 식별자·제목·원본·렌더 HTML). 재사용, 변경 없음.
- **노트(Note)**: 기존 `notes.ts` 의 의견/반박. 재사용, 변경 없음 — 검수 결정의 구성 요소.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 에이전트가 plan 제출부터 검수 결과 회수까지를 **복사/붙여넣기 0회**로 완료할 수 있다(왕복 자동화 100%).
- **SC-002**: `get_review` 가 돌려준 검수 결과 텍스트가, 동일 plan·동일 의견을 현행 클립보드 핸드오프로 뽑은 결과와 **문자열 단위로 일치**한다(형식 SSoT 단일).
- **SC-003**: raw HTML 을 포함한 plan 을 제출·검수·회수해도 결과 어디에도 실행 가능한 raw HTML 이 남지 않는다(안전성 회귀 0건).
- **SC-004**: 제출 직후 회수는 `pending`, 사람 완료 후 회수는 `completed` 로, 두 상태가 100% 구분된다(에이전트가 미완료를 "의견 없음"으로 오인하지 않음).
- **SC-005**: 모든 데이터 흐름이 localhost 안에서 끝난다 — 기능 동작에 외부 네트워크 접속이 필요하지 않다(오프라인에서 왕복 성공).
- **SC-006**: 기존 붙여넣기 검수·클립보드 핸드오프가 MCP 경로 도입 후에도 모두 동작한다(회귀 0건).

## 비목표(Non-Goals) *(명시적 범위 제외)*

- **원격/호스팅 서버, 계정, 인증**: MVP 는 로컬 단일 사용자. 멀티 사용자·원격 협업·로그인 없음.
- **블로킹형 long-running tool**: `submit_plan` 이 사람 검수 끝까지 대기하는 방식은 제외(비동기 제출 + 폴링 채택). 실시간 스트리밍/푸시 알림도 제외.
- **사람의 plan 본문 편집**: 검수 = 의견·반박만. 사람이 브라우저에서 plan 자체를 고쳐 돌려보내는 양방향 편집은 제외.
- **세션 영속**: MVP 는 프로세스 메모리 기반 세션(서버가 내려가면 미회수 세션은 사라짐). localStorage/계정 동기화로의 영속은 후속.
- **클립보드 핸드오프 제거**: 기존 경로는 폴백으로 유지. 이 spec 은 대체가 아니라 추가 경로.
- **다중 에이전트 동시 제출 조율, plan 비교/머지, MCP resource·prompt 노출**: 모두 후속.
- **프런트엔드 프레임워크 도입**: 없음. UI 는 기존 vanilla-ts 앱 그대로.

## Assumptions

- **호스트가 서버를 기동**: MCP 서버는 에이전트 호스트(Claude Code/Codex 등)가 stdio 로 스폰하는 로컬 프로세스라고 가정한다. 이 프로세스가 브라우저용 로컬 HTTP 엔드포인트도 함께 띄운다.
- **세션 = 프로세스 생명주기**: MVP 리뷰 세션은 서버 프로세스 메모리에 산다. 호스트 세션 동안 서버가 유지되므로 제출→검수→회수가 같은 생명주기 안에서 일어난다고 가정한다(영속은 비목표).
- **스택 유지**: vanilla-ts + Vite + Vitest + markdown-it 유지. 로컬 HTTP 서버는 Node 내장 `http` 로 충분하며 별도 웹 프레임워크(Express 등)는 도입하지 않는다.
- **코어 모듈 보존**: `parse`/`notes`/`export` 순수 모듈은 그대로 재사용. 서버는 DOM 없이 이 모듈들을 직접 import 한다(이미 DOM 비종속).
- **샘플 데이터**: 기존 한국어 샘플 plan 을 MCP 왕복 데모/테스트 시드로 활용할 수 있다.

## CEO 결정 요청 사항 *(spec 승인 시 함께 판단 필요)*

> Simplicity First 와 "프레임워크 미도입" 제약에 직접 맞닿는 결정이라 침묵으로 고르지 않고 드러낸다.

- **D-1 — MCP 프로토콜 구현 수단**: MCP 를 말하려면 (a) 공식 `@modelcontextprotocol/sdk` 의존성을 추가하거나, (b) stdio JSON-RPC 를 직접 손으로 구현해야 한다. "프레임워크 미도입"은 본래 React 류 프런트엔드 프레임워크를 가리키며, MCP SDK 는 프런트 프레임워크가 아니라 프로토콜 구현 라이브러리다.
  - **권고(기본값)**: (a) 공식 SDK 채택. 프로토콜 호환성·유지보수 측면에서 손수 구현보다 단순하고 안전. markdown-it 을 의존성으로 받아들인 것과 같은 결의 결정.
  - 반대 견해: 의존성 최소주의를 엄격히 본다면 (b) 도 가능하나, JSON-RPC/프로토콜 버전 대응을 자체 부담해야 함.
- **D-2 — 브라우저 ↔ 서버 통신 방식**: 사람 검수 완료를 에이전트가 회수하는 경로. 기본값은 **에이전트 폴링 + 브라우저 POST**(가장 단순, 추가 의존성 0). WebSocket 푸시는 비목표로 둠.
  - **권고(기본값)**: 폴링 모델. 추가 라이브러리 없이 Node 내장 `http` 로 충분.
