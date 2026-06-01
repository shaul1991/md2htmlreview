# Implementation Plan: 디자인 시스템 도입 — 데스크톱 3-pane 리뷰 워크스페이스

**Branch**: `main` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-design-system-adoption/spec.md`

## Summary

현 세로 단선형 UI(인라인 스타일 `index.html` + `src/render.ts` 의 `.block*` 마크업)를 `design/` 프로토타입의
**데스크톱 3-pane 워크스페이스**(`이력 | 섹션 | 노트`)로 전면 재설계한다. React 는 채택하지 않고, design 의
`tokens.css`·`components.css` 를 프로덕션 자산으로 편입하고 `app.jsx` 의 상태 로직·마크업·`ui.jsx` 아이콘을
**vanilla TS 로 포팅**한다. CSS 클래스·DOM 구조를 design 그대로 emit 해 비주얼 동일성을 확보한다.

## Technical Context

**Language/Version**: TypeScript (ES2022), strict
**Primary Dependencies**: `markdown-it@^14` (`{html:false, linkify:true}`) — 기존 그대로. 신규 런타임 의존성 없음.
**Storage**: `localStorage` (`md2htmlreview/v2`) — 기존 `src/storage.ts` 그대로.
**Testing**: Vitest (node 환경), 순수 모듈만. `parse/notes/export/storage` TDD.
**Target Platform**: 데스크톱 브라우저 (GitHub Pages, `base:'/md2htmlreview/'`).
**Project Type**: 단일 프런트엔드 (vanilla-ts + Vite). 백엔드 없음.
**Performance Goals**: 상태 변경 시 패널 재렌더는 사람이 인지하는 지연 없이(수십 ms). 타이핑 중 재렌더 없음(아래 결정).
**Constraints**: 프레임워크 무도입(CLAUDE.md), raw HTML 비실행(FR-015), local-first(서버 전송 없음).
**Scale/Scope**: 단일 사용자 로컬 앱. 화면 1개(3-pane). 섹션 수십 개/문서 규모.

NEEDS CLARIFICATION: 없음 — 스택·의존성·범위 모두 기존 코드와 인터뷰로 확정됨.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` 는 아직 미작성(템플릿 placeholder)이다. 정식 constitution 수립
(`/speckit-constitution`)은 이번 범위 밖이므로, **프로젝트 CLAUDE.md 의 karpathy 4원칙**을 사실상의 게이트로 적용:

- **Think Before Coding**: 노트 모델 분기(아래 ⚠️)를 가정으로 숨기지 않고 결정으로 드러냄 → PASS.
- **Simplicity First**: 신규 의존성 0, 신규 추상화 최소(상태 객체 1 + 아이콘 헬퍼 1). 타이핑 재렌더 회피로 가상 DOM/디핑 불요 → PASS.
- **Surgical Changes**: 순수 모듈(parse/notes/export/storage)은 시그니처 보존 + 가산적 변경(title/ts/delete)만. UI 계층(render/main/index.html)만 재작성 → PASS.
- **Goal-Driven**: 변경 모듈마다 테스트 우선(아래 Verify) → PASS.

> ⚠️ **DECISION NEEDED (plan 검수 시 확인)** — 노트 상호작용 모델 변경:
> 현재(002)는 **인라인 textarea 편집(`NoteStore.edit`, FR-006)** 을 지원하나 **삭제/타임스탬프가 없다**.
> design 프로토타입은 **작성기(composer)로 추가 + 삭제 + 반박 + 타임스탬프** 를 지원하나 **인라인 편집이 없다**.
> "프로토타입 전면 채택" 결정에 따라 **인라인 편집을 제거하고 삭제+타임스탬프를 도입**하는 것을 기본안으로 한다.
> 이는 002 의 편집 기능에 대한 의도적 회귀다. 편집 보존을 원하면 plan 검수에서 알려주세요(편집+삭제 병존도 가능).

## Project Structure

### Documentation (this feature)

```text
specs/003-design-system-adoption/
├── spec.md              # /speckit-specify 산출 (검수 통과)
├── plan.md              # 이 파일 (/speckit-plan)
├── research.md          # Phase 0 — 결정·근거
├── data-model.md        # Phase 1 — 엔티티(Section+title, Note+ts, AppState)
├── quickstart.md        # Phase 1 — 실행·검증 절차
├── contracts/
│   ├── modules.md       # 순수/렌더 모듈 공개 시그니처 계약
│   └── ui.md            # DOM 구조 + CSS 클래스 계약 (design 매핑)
└── checklists/
    └── requirements.md  # spec 품질 체크리스트 (통과)
```

### Source Code (repository root)

```text
index.html               # 재작성: 인라인 <style> 제거, .app>.topbar + #app 마운트
src/
├── main.ts              # 재작성: AppState + 이벤트 위임 + render(state) 컨트롤러
├── render.ts            # 재작성: 3-pane(history|center|notes) 렌더, design 클래스 emit
├── icons.ts             # 신규: ui.jsx 의 ICON_D 포팅 + createIcon(name,size) (createElementNS)
├── parse.ts             # 가산 변경: Section 에 title 추가
├── notes.ts             # 가산 변경: Note 에 ts 추가, NoteStore.delete 추가 (edit 제거 — DECISION)
├── export.ts            # 무변경 (Section.title 가산은 호환)
├── storage.ts           # 무변경 (Note.ts 는 직렬화에 자동 포함)
└── styles/
    ├── tokens.css       # 신규: design/tokens.css 복사 (원본 그대로)
    └── components.css   # 신규: design/components.css 복사 (원본 그대로)
tests/
├── parse.test.ts        # title 추가 케이스
├── notes.test.ts        # delete 케이스 + ts 존재, edit 제거 반영
├── export.test.ts       # 픽스처에 ts 필드 추가(타입 충족), 출력 형식 불변 확인
└── storage.test.ts      # 픽스처에 ts 필드 추가(타입 충족)
```

**Structure Decision**: 기존 단일 프로젝트 레이아웃 유지. 코어(parse/notes/export/storage)는 DOM 비종속 순수 모듈로
보존하고, UI 어댑터(render/main/index.html)만 교체한다. CSS 는 `src/styles/` 로 복사해 `main.ts` 에서
`import` (Vite 가 번들). 토큰 CSS 는 원본을 포크하지 않고 그대로 둔다.

### 핵심 설계 결정 (상세는 research.md)

1. **렌더 전략 — 상태→전체 재렌더, 단 타이핑은 예외**: 구조 변경(변환/선택/접기/추가/삭제/문서전환/모드)마다
   `render(state)` 로 3-pane 을 다시 그린다. 작성기/붙여넣기 textarea 의 입력값은 **상태에 저장하지 않고 제출 시 DOM 에서 읽는다**
   (현 `main.ts` 패턴과 동일) → 키 입력마다 재렌더하지 않아 포커스/캐럿 유실·가상 DOM 디핑이 불필요(Simplicity).
2. **상태 보관 — `AppState` 평면 객체**: `{ mode, selectedSectionId, collapsed:Set, replyTo }` 등 UI 상태 + 기존
   `NoteStore`(활성 문서 노트) + `storage.ts`(영속·다중문서·active). design 의 `notes[docId]` 인메모리 맵 대신
   기존 영속 계층을 SSoT 로 쓴다.
3. **테마(FR-016)**: 부팅 시 `matchMedia('(prefers-color-scheme: dark)')` 로 `document.documentElement.dataset.theme`
   를 설정(+change 리스너). tokens.css 의 `[data-theme="dark"]` 가 자동 적용. 런타임 수동 스왑(Tweaks)은 범위 밖.
4. **아이콘**: `ui.jsx` 의 `ICON_D`(SVG path 상수)만 `icons.ts` 로 옮기고, 사용 아이콘
   (doc/history/plus/comment/chevronDown/reply/trash/copy/handoff/arrowRight/x)만 유지.
5. **노트 모델**: 위 ⚠️ 결정 — design 모델(add/delete/reply+ts) 채택, `edit` 제거.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| `NoteStore.edit` 제거(002 기능 회귀) | design 프로토타입 전면 채택 결정 — 프로토타입엔 인라인 편집 affordance 가 없음 | 편집 보존 시 design 마크업에 없는 편집 UI 를 덧대야 해 "프로토타입 동일성" 목표와 충돌. (편집+삭제 병존은 plan 검수에서 사용자가 원하면 선택 가능) |
