# Contract — DOM 구조 + CSS 클래스 (003)

`render.ts` 가 emit 해야 하는 마크업. 클래스는 `components.css`(=design) 정의를 그대로 사용 → 비주얼 동일성.
출처: `design/app.jsx` ReviewApp(layout="three").

## 전체 셸 (index.html 정적 + #app 동적)
```html
<div class="app">
  <header class="topbar">
    <div class="topbar__brand">
      <span class="topbar__logo">M2</span>
      <span>md2htmlreview</span><span class="muted">· plan 검수</span>
    </div>
  </header>
  <main id="app"><!-- render.ts: .workspace --></main>
</div>
```

## 워크스페이스
```html
<div class="workspace workspace--three">
  <div class="pane pane--history">…</div>
  <div class="pane pane--center">…</div>
  <div class="pane pane--notes">…</div>
</div>
```

## 이력 pane
```html
<div class="pane pane--history">
  <div class="pane__head"><!--history icon--><span class="pane__title">이력</span>
    <span class="spacer"></span><button class="icon-btn" data-act="new-review">＋</button></div>
  <div class="pane__body pane__body--flush">
    <div class="hist-group-label">최근</div>
    <div class="hist-item is-active" data-doc-id="…">
      <span class="hist-item__title">제목</span>
      <span class="hist-item__meta"><span>6/1 14:32</span><span>·</span><span>N개 섹션</span>
        <span>·</span><span style="color:var(--accent-fg)">의견 N</span></span>
    </div>
    <!-- 삭제: hist-item 내 .icon-btn[data-act=del-doc] (현 동작 보존) -->
  </div>
</div>
```
- 빈 상태: `.subtle` 안내. `data-doc-id` 클릭→문서 로드, 삭제 버튼→onDeleteDoc.

## 중앙 pane — 모드별
```html
<div class="pane pane--center">
  <div class="pane__head"><!-- review: doc icon + 제목 + Badge(N 섹션) + .btn--primary[data-act=handoff] -->
                          <!-- empty/paste: doc icon + "plan 입력" --></div>
  <div class="pane__body">
    <!-- mode=empty -->
    <div class="empty-hero"><div class="empty-hero__art">…</div><h2>…</h2><p>…</p>
      <div class="empty-steps"><div class="empty-step"><div class="empty-step__n">1</div>
        <div class="empty-step__t">…</div><div class="empty-step__d">…</div></div>…(3)</div>
      <div class="row"><button class="btn btn--primary btn--lg" data-act="start-sample">샘플로 시작</button>
        <button class="btn btn--lg" data-act="start-blank">빈 화면</button></div></div>
    <!-- mode=paste -->
    <div class="paste-wrap"><textarea class="paste-area"></textarea>
      <div class="paste-bar"><button class="btn btn--primary btn--md" data-act="convert">변환</button>
        <button class="btn btn--ghost btn--md" data-act="fill-sample">샘플 채우기</button>
        <span class="spacer"></span><span class="subtle">N자 · local-first</span></div></div>
    <!-- mode=review -->
    <div class="section-stack">
      <div class="section-card is-selected has-notes is-collapsed" data-section-id="…">
        <div class="section-card__head">
          <!--chevronDown--><span class="section-card__id">#id</span>
          <span class="section-card__title">제목</span>
          <span class="badge badge--accent"><!--comment-->N</span>
          <div class="section-card__actions"><button class="icon-btn" data-act="reply-here">…</button></div>
        </div>
        <div class="section-card__body md"><!-- section.html (innerHTML, FR-015 안전) --></div>
      </div>
    </div>
  </div>
</div>
```
- `.section-card` 클릭→onSelectSection. `.section-card__head` 클릭→선택+onToggleCollapse(`is-collapsed` 토글).
- `is-selected`=선택, `has-notes`=노트≥1, `is-collapsed`=접힘. 클래스 조합으로 FR-007/008/006 충족.

## 노트 pane
```html
<div class="pane pane--notes">
  <div class="pane__head"><!--comment--><span class="pane__title">의견</span>
    <span class="badge badge--accent">N</span><span class="spacer"></span>
    <button class="icon-btn" data-act="handoff">…</button></div>
  <div class="pane__body" style="display:flex;flex-direction:column">
    <!-- 비어있으면 .notes-empty -->
    <div class="note-group" data-section-id="…">
      <div class="note-group__head"><span class="note-group__sid">#id</span>
        <span class="note-group__title">제목</span></div>
      <div class="note" data-note-id="…">
        <div class="note__head"><span class="note__kind note__kind--note">의견</span>
          <span class="note__id">n1</span>
          <div class="note__actions"><button class="icon-btn" data-act="reply" >반박</button>
            <button class="icon-btn" data-act="del-note">삭제</button></div></div>
        <div class="note__text">…</div><div class="note__time">6/1 14:32</div>
      </div>
      <div class="note note--rebuttal" data-note-id="…"><!-- note__id "n2 → n1" --></div>
    </div>
    <!-- 작성기: 선택 섹션 있을 때 -->
    <div class="note-composer">
      <!-- replyTo 면 안내 row + 취소 -->
      <div class="subtle"><span class="mono" style="color:var(--accent-fg)">#id</span> · 제목</div>
      <textarea class="textarea" data-role="composer"></textarea>
      <div class="note-composer__row"><button class="btn btn--primary btn--sm" data-act="add-note">의견 추가</button>
        <span class="spacer"></span><span class="subtle"><kbd class="kbd">⌘</kbd><kbd class="kbd">↵</kbd> 저장</span></div>
    </div>
  </div>
</div>
```
- 작성기 textarea 는 재렌더 시 보존 불가 영역 → 입력 중 재렌더 안 함. 제출은 `data-act=add-note` 클릭 또는 ⌘/Ctrl+Enter, 값은 DOM 에서 읽음.
- 반박: `data-act=reply` → replyTo 설정 + 재렌더(작성기 모드 전환). 삭제: `data-act=del-note` → onDeleteNote.

## 이벤트 위임
- `#app` 에 click 핸들러 1개 — `e.target.closest('[data-act]')` 로 분기, `data-doc-id`/`data-section-id`/`data-note-id` 로 대상 식별.
- 작성기 textarea 는 keydown(⌘/Ctrl+Enter) 별도 바인딩 또는 위임.

## 테마
- `document.documentElement.dataset.theme` = system pref (research D-3). `data-accent`/`data-density` 미설정(기본 teal/comfortable).
