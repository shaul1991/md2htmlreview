# md2htmlreview — 디자인 브리프 (Design Brief)

> 이 문서는 디자인 AI("Claude design")에게 `md2htmlreview` 의 **목적·기능·컨셉·제약**을
> 전달하기 위한 **자기완결적 브리프**다. 코드를 읽지 않아도 제품을 이해하고 디자인 산출물을
> 낼 수 있도록 작성되었다. 본문은 한국어, 기술 용어는 영어 병기.
>
> 라벨 규칙: **[as-is]** = 현재 구현된 상태(디자인 기준선), **[to-be]** = 아직 없는 신규/향후
> (디자이너가 새로 설계할 대상).

---

## 1. 제품 한 줄 정의 & 목적

**md2htmlreview** 는 AI 코딩 에이전트(Claude Code, Codex, Cursor 등)가 만든 `plan.md` 를
브라우저에서 **per-block(섹션 단위)으로 사람이 리뷰**하고, 그 결정을 다시 에이전트
워크플로로 **round-trip(되돌림)** 하는 **local-first 리뷰 레이어**다.

해결하는 문제(Why):

- 터미널에서 긴 `plan.md` 를 검수하는 것은 high-friction 하다 — "위에서 두 번째 섹션…"
  같은 참조가 누적된다.
- IDE 의 markdown preview 는 보여주기만 할 뿐 **per-block 결정을 담지 못한다.**
- LLM 네이티브 도구(multi-choice prompt)는 열린(open-ended) plan 리뷰에는 너무 제약적이다.

즉, **"plan 을 단락별로 읽고 → 단락별로 의견을 달고 → 그 의견 묶음을 에이전트에게 다시
넘긴다"** 는 리뷰 루프를 매끄럽게 만드는 것이 제품의 목적이다.

---

## 2. 핵심 원칙 (Principles) — 디자인 제약으로 직결

| 원칙 | 의미 | 디자인 함의 |
| --- | --- | --- |
| **Local-first** | plan 은 기본적으로 사용자 기기에만 머문다 | 계정·로그인 없이도 완결되어야 함. "어딘가로 전송된다"는 인상을 주지 않기. |
| **Agent-agnostic** | markdown plan 을 내는 어떤 에이전트든 지원 | 특정 벤더 브랜딩에 종속되지 않는 중립적 톤. |
| **Round-trip** | 결정이 단방향 preview 가 아니라 에이전트 루프로 되돌아감 | **핸드오프(handoff)** 가 1급(primary) 액션. "복사 → 에이전트에 붙여넣기"가 명확히 보여야 함. |

---

## 3. 타깃 사용자 & 사용 맥락

- **사용자**: AI 코딩 에이전트를 쓰는 개발자. plan/spec/design 모드 산출물을 자주 검수.
- **맥락**: 데스크톱 브라우저 1차. 키보드 친화적이고, 텍스트(코드/markdown) 밀도가 높은 화면에
  익숙한 사용자. 다크 모드 사용 빈도 높음.

---

## 4. 현재 핵심 워크플로 [as-is] — 디자인 기준선

1. **붙여넣기**: 에이전트의 plan markdown 을 입력 textarea 에 붙여넣는다.
2. **변환(Convert)**: 버튼 클릭 → markdown 을 **heading 기준 섹션**으로 분할.
3. **섹션 분할**: 각 섹션은 하나의 리뷰 단위(block)가 된다.
4. **의견 달기**: 섹션별로 **의견(note)** 과 **반박(rebuttal)** 을 단다.
5. **복사(Handoff)**: "원본+의견 복사" → 원본 plan + 섹션별 의견이 클립보드에 markdown 으로 담김.
6. **이력 전환**: 여러 plan 을 문서 이력(history)에서 전환. 검수 상태는 브라우저에 저장되어
   새로고침해도 유지됨.

현재 화면 구성 요소 [as-is] (실제 라벨, 한국어 유지):

- 상단 제목 `md2htmlreview` + 사용법 hint 문구.
- 입력 `textarea` (placeholder: "여기에 plan markdown 을 붙여넣으세요…").
- toolbar: **변환** 버튼 / **원본+의견 복사** 버튼(초기 disabled) / status 메시지 영역.
- 문서 이력(history) 탭 영역.
- 섹션 블록 리스트 출력 영역.

---

## 5. 기능 명세 — 디자인이 표현해야 할 객체/상태

### 5.1 Section / Block [as-is]

- 하나의 heading 섹션 = 한 블록. 구성: **block-id 뱃지**(slug, monospace) + **렌더된 HTML 본문**
  + **notes 영역**.
- block-id 는 heading 텍스트에서 만든 slug (한글 보존, 중복 시 `-2`, `-3` 접미사).
- heading 앞 본문은 "intro" 섹션으로 묶임.

### 5.2 Note / Rebuttal [as-is]

- **Note(의견)**: 섹션에 다는 인라인 편집 가능한 텍스트. 입력 즉시 저장.
- **Rebuttal(반박)**: 특정 note 를 타깃으로 다는 반대 의견. `(반박 → n1)` 형태 태그로 대상 표시,
  들여쓰기로 계층 표현.
- 디자인 과제: 의견 ↔ 반박의 **계층/대화(thread) 구조**를 시각적으로 더 읽기 쉽게.

### 5.3 문서 이력 (History) [as-is]

- 탭 형태의 리스트. 각 항목: 제목 + 타임스탬프(m/dd hh:mm). active 탭 강조, 삭제(✕) 버튼.
- 비어 있을 때 empty state 문구.

### 5.4 핸드오프 Export [as-is]

- 클립보드로 나가는 markdown 형식: `# 원본 plan` + `# 단락별 의견` + 섹션 slug 별 의견 목록.
- 반박은 대상 note id 를 포함해 에이전트가 토론 맥락을 추적 가능.

### 5.5 상태(states) [as-is]

- 빈 입력 / 변환 전 / 복사 버튼 disabled / status 메시지(성공·안내) / 이력 비어 있음.
- 디자이너는 이 **상태별 화면**을 모두 다뤄야 함.

---

## 6. 신규 화면·플로우 [to-be] — mockup 대상

아직 구현되지 않았으며, 디자이너가 새로 설계할 영역이다. 로드맵 기준:

- **온보딩 / 빈 상태(empty state)**: 첫 진입 시 무엇을 하는 도구인지, 어떻게 붙여넣는지 안내.
- **핸드오프 UX 강화**: 단순 클립보드 복사를 넘어, "에이전트로 되돌린다"는 행위를 시각적으로
  확인·안심시키는 흐름(예: 무엇이 복사되었는지 미리보기, 원본 대비 의견 요약).
- **Phase 2 — 이력 영속/sync**: localStorage → 계정(account) 기반 동기화. 로그인/계정 UI,
  여러 기기 간 plan 이력.
- **Phase 3 — MCP 직접 호출**: Claude/Codex 가 복사·붙여넣기 없이 직접 이 도구를 호출하는
  진입점/연결 상태 UI.

> 위 항목은 **현재 없음**. 디자이너는 신규 설계임을 전제로 진행.

---

## 7. 현재 비주얼 시스템 [as-is] — 리디자인 & 토큰 정의 기준선

현재는 `index.html` 에 인라인된 GitHub 풍 최소 스타일이다. 아래 값을 **출발점**으로 삼되,
정식 디자인 시스템으로 체계화(naming, scale, dark mode, 컴포넌트 토큰)해 달라.

- **색상 토큰**:
  - `--border: #d0d7de` (테두리)
  - `--muted: #57606a` (보조 텍스트·메타)
  - `--accent: #0969da` (주요 액션·active)
  - 보조 배경 `#f6f8fa`, 삭제 hover `#cf222e`
- **테마**: `color-scheme: light dark` (자동 다크 모드 지원).
- **레이아웃**: max-width 980px 중앙 정렬 컨테이너.
- **타이포그래피**: system font stack(`-apple-system, Segoe UI, …`), 코드/ID 는 monospace.
- **형태**: 6–8px border-radius, 1px 테두리, 가벼운 그림자(active 강조).
- **미학**: GitHub 풍 minimal, 텍스트 밀도 높은 리뷰 도구.

---

## 8. 요청 산출물 (Deliverables)

1. **디자인 시스템 / 토큰 정의**: 위 7절 값을 정식화한 color/spacing/typography/radius 토큰 체계
   (light·dark 모두).
2. **핵심 화면 high-fidelity mockup**: 입력·변환 / 섹션 리뷰(의견·반박) / 문서 이력 / 핸드오프.
3. **신규 플로우 mockup**: 6절의 온보딩·핸드오프 강화·계정 sync·MCP 진입점.
4. **컴포넌트 인벤토리**: 블록(block) / 노트(note·rebuttal) / 이력 탭 / 툴바 / 상태(state) 컴포넌트.

---

## 9. 제약 & 비목표 (Constraints & Non-goals)

- **스택**: vanilla-TypeScript, **프레임워크 없음**. 무거운 CSS/UI 프레임워크 도입 지양
  (현 구현은 손으로 쓴 CSS). 디자인은 이 단순함을 깨지 않는 선에서.
- **보안**: 본문은 markdown-it `html:false` 로 raw HTML 을 무력화한다. 렌더 본문은 신뢰 가능한
  텍스트만 표시된다고 가정(스크립트 주입 없음).
- **UI 언어**: 한국어 유지(기존 라벨: 변환 / 원본+의견 복사 등).
- **단순성 우선**: 요청되지 않은 기능·과한 설정 가능성·과설계 지양. "시니어 엔지니어가 보면
  과설계라고 할까?"가 yes 면 단순화.

---

## 10. 참고 출처 (Sources)

디자이너가 필요 시 원본을 확인할 수 있는 경로:

| 영역 | 파일 |
| --- | --- |
| 제품 컨셉·원칙·로드맵 | `README.md` |
| 작업 규칙·스택·빌드 | `.claude/CLAUDE.md` |
| 현재 화면 구조·스타일·토큰 | `index.html` |
| 섹션 분할 로직 | `src/parse.ts` |
| 의견/반박 모델 | `src/notes.ts` |
| DOM 렌더링·이력 UI | `src/render.ts` |
| 핸드오프 export 형식 | `src/export.ts` |
| localStorage 영속 | `src/storage.ts` |
| 앱 오케스트레이션 | `src/main.ts` |
