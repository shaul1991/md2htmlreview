# CLAUDE.md — md2htmlreview

AI coding agent 의 `plan.md` 산출물을 브라우저에서 **per-block 으로 사람이 리뷰**하고,
그 결정을 다시 agent workflow 로 되돌리는 **local-first 리뷰 레이어**.

- 상태: 컨셉 정의 완료, 구현 대기 (README 참조).
- 방향: MVP = Markdown → per-block rich HTML + per-block 코멘트 + agent 핸드오프(우선 clipboard).
  이후 → plan history 영속(localStorage → account) → MCP 패키징(Claude/Codex 직접 호출).
- git: `origin git@github.com-shaul1991:shaul1991/md2htmlreview.git`, `main` 브랜치.

## 전역 규칙 상속

이 머신의 `~/.claude/CLAUDE.md` 가 모든 세션에 자동 상속된다(별도 import 불필요):
- 웹 페이지/검색은 **Playwright MCP**(`mcp__plugin_playwright_playwright__*`) 사용. `WebFetch` 금지.
- `git commit` 메시지에 `Co-Authored-By: Claude ...` 트레일러 금지.

이 repo 는 향후 공유/패키징 가능성이 있어 사용자 사설 절대경로(`@~/...`) 를 여기 import 하지 않는다.

## 작업 방식 (karpathy 4원칙)

### 1. Think Before Coding
가정하지 말고, 혼동을 숨기지 말고, tradeoff 를 드러내라.
- 가정은 명시적으로 진술. 불확실하면 묻는다.
- 해석이 여러 개라면 침묵으로 고르지 말고 모두 제시한다.
- 더 단순한 접근이 있으면 말한다. 필요하면 반대 의견을 낸다.
- 불분명하면 멈춘다. 무엇이 헷갈리는지 이름 붙이고 묻는다.

### 2. Simplicity First
문제를 해결하는 최소한의 코드. 투기적인 것은 없다.
- 요청되지 않은 기능 금지.
- 단일 사용처에 추상화 금지.
- 요청되지 않은 "유연성"·"설정 가능성" 금지.
- 일어날 수 없는 상황에 대한 에러 핸들링 금지.
- 200줄을 썼는데 50줄로 줄일 수 있다면 다시 쓴다.

"시니어 엔지니어가 이걸 보면 과설계라고 할까?" 가 yes 면 단순화.

### 3. Surgical Changes
필요한 부분만 건드린다. 본인이 만든 것만 청소한다.
- 인접 코드/주석/포맷을 "개선" 하지 않는다.
- 망가지지 않은 것을 리팩터링하지 않는다.
- 본인이라면 다르게 했더라도 기존 스타일에 맞춘다.
- 무관한 dead code 를 발견하면 언급은 하되 삭제하지 않는다.
- 본인 변경으로 orphan 이 된 import/var/func 만 정리한다.

테스트: 변경된 모든 줄이 사용자 요청에 직결되는가?

### 4. Goal-Driven Execution
성공 기준을 정의하고 검증될 때까지 루프 돈다.
- "validation 추가" → "잘못된 입력에 대한 테스트를 쓰고 통과시킨다".
- "버그 수정" → "버그를 재현하는 테스트를 쓰고 통과시킨다".
- "X 리팩터" → "리팩터 전후 테스트가 통과하는지 보장한다".

다단계 작업은 간단한 plan 을 명시:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

## 빌드 / 테스트 / 스타일

컨셉 단계 — 구현 스택·빌드·테스트 규칙은 구현 착수 시 이 섹션에 추가한다(지금 투기적으로 채우지 않음).
