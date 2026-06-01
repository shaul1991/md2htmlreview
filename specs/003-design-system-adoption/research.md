# Phase 0 Research — 003 design-system-adoption

기술 미지(unknown)는 없었다(스택·의존성·범위가 기존 코드와 인터뷰로 확정). 아래는 재설계 과정에서 내린 결정과 근거.

## D-1. 렌더 전략: 상태→전체 재렌더 (타이핑 제외)

- **Decision**: 구조적 상태 변경(변환·문서전환·섹션 선택·접기·노트 추가/삭제·모드 전환)마다 3-pane 전체를
  `render(state)` 로 재구성한다. 단, 작성기/붙여넣기 textarea 입력은 상태에 넣지 않고 제출 시 DOM 값으로 읽는다.
- **Rationale**: React 의 디핑 없이도 단순하게 동작. 키 입력마다 재렌더하지 않으므로 textarea 포커스·캐럿 유실이
  발생하지 않는다. 현 `main.ts`(버튼 클릭 시 `textarea.value` 읽기)와 동일한 패턴이라 회귀 위험이 낮다.
- **Alternatives**: (a) 가상 DOM/디핑 라이브러리 — 프레임워크 무도입 원칙 위배, 과설계. (b) 부분 패치
  (현 render.ts 의 노트 서브트리만 갱신) — 선택/접기/모드가 패널 경계를 넘나들어 패치 지점이 많아짐, 복잡도↑.

## D-2. 상태 보관: AppState 평면 객체 + 기존 영속 계층 SSoT

- **Decision**: UI 전용 상태(`mode`, `selectedSectionId`, `collapsed`, `replyTo`)는 `main.ts` 의 `AppState`
  객체에. 노트·문서·active 는 기존 `NoteStore` + `storage.ts` 를 그대로 SSoT 로 사용.
- **Rationale**: design 의 `notes[docId]` 인메모리 맵을 새로 만들면 002 의 영속(localStorage)과 이중 출처가 된다.
  기존 계층 재사용이 Surgical. 활성 문서 1개의 노트만 `NoteStore` 에 적재(현 동작 유지).
- **Alternatives**: design 처럼 전체 문서 노트를 메모리에 — 영속과 중복·동기화 부담.

## D-3. 테마(FR-016): 시스템 설정 → data-theme

- **Decision**: 부팅 시 `matchMedia('(prefers-color-scheme: dark)')` 결과로
  `document.documentElement.dataset.theme = 'dark'|'light'` 설정, change 이벤트도 반영.
- **Rationale**: `tokens.css` 의 다크는 `[data-theme="dark"]` 속성 기반이라 자동 적용되지 않는다. CSS 를 포크해
  `@media` 를 넣는 대신 부팅 1줄로 속성을 세팅하면 토큰 원본을 그대로 둘 수 있다(Surgical). 런타임 수동
  스왑(Tweaks)은 범위 밖이므로 시스템 설정만 따른다.
- **Alternatives**: tokens.css 에 `@media (prefers-color-scheme)` 추가 — 복사 자산을 포크해야 해 추후 design
  갱신과 어긋남.

## D-4. CSS 자산 배치: src/styles/ 로 복사 + import

- **Decision**: `design/tokens.css`, `design/components.css` 를 `src/styles/` 로 **원본 그대로 복사**하고
  `main.ts` 에서 `import './styles/tokens.css'` 등으로 로드(Vite 번들). `pages.css`/`mobile.css` 는 제외.
- **Rationale**: design/ 는 "프로토타입 산출물, 프로덕션과 독립"으로 선언됨 → 프로덕션이 design/ 를 직접 참조하면
  결합이 생긴다. 복사가 경계를 명확히 한다. components.css 의 미사용 클래스(.segmented/.tabnav 등)는 무해해 통째 복사.
- **Alternatives**: design/ 파일을 직접 link — 프로덕션-프로토타입 결합, 빌드 base 경로 문제.

## D-5. 노트 상호작용 모델: design 채택 (edit 제거, delete+ts 도입)

- **Decision**: 프로토타입과 동일하게 작성기로 추가 + 삭제 + 반박 + 타임스탬프. `NoteStore.edit` 제거,
  `NoteStore.delete(noteId)`(노트 + 그 노트를 대상으로 한 반박 함께 제거) 추가, `Note.ts`(생성 시각) 추가.
- **Rationale**: "프로토타입 전면 채택" 결정에 부합. design NoteCard 에는 편집 affordance 가 없고 삭제·반박·시간이 있다.
- **⚠️ Tradeoff (plan 검수에서 확인)**: 002 의 인라인 편집(FR-006)에 대한 의도적 회귀. 사용자가 편집 보존을 원하면
  편집+삭제 병존으로 조정 가능(단 design 마크업에 편집 UI 를 덧대야 함).
- **Alternatives**: 편집 유지 + 삭제 추가(superset) — 기능은 풍부하나 프로토타입 동일성 목표와 어긋남.

## D-6. Section.title

- **Decision**: `parse.ts` 의 `Section` 에 `title: string` 추가. heading 섹션은 heading 텍스트, intro 섹션은
  첫 비어있지 않은 라인의 짧은 스니펫(없으면 "도입").
- **Rationale**: design 섹션 카드 헤더(`.section-card__title`)가 제목을 표시. 현재는 slug(id)만 있어 사람이 읽기 어렵다.
  가산 필드라 export/storage 와 호환.
