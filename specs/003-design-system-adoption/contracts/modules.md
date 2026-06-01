# Contract — 모듈 공개 시그니처 (003)

순수 모듈은 시그니처 보존을 원칙으로, ★ 표시만 변경.

## parse.ts
```ts
export interface Section { id; headingLevel; title /*★신규*/; raw; html }
export function slugify(text: string): string            // 무변경
export function parseSections(src: string): Section[]    // 반환 Section 에 title 채움
```

## notes.ts
```ts
export type NoteKind = 'note' | 'rebuttal'
export interface Note { id; text; kind; targetNoteId?; ts /*★신규*/ }
export class NoteStore {
  add(blockId, text): Note            // ts=now 설정
  rebut(blockId, targetNoteId, text): Note   // ts=now
  delete(noteId): void                // ★신규: 노트 + 해당 노트 대상 반박 제거
  get(blockId): Note[]                // 무변경
  toMap(): Map<string, Note[]>        // 무변경
  toJSON(): Record<string, Note[]>    // ts 포함
  loadFrom(data): void                // ts 보존, seq 복원 유지
  clear(): void                       // 무변경
  // ★제거: edit(noteId, text)  — research D-5 (검수에서 보존 결정 시 되돌림)
}
```

## export.ts — 무변경
```ts
export function buildExport(src: string, sections: Section[], notes: Map<string, Note[]>): string
```
출력 형식 불변(원본 + `## [id]` + `- (id) [반박 라벨] text`). title/ts 는 출력에 미사용.

## storage.ts — 무변경
```ts
export interface StoredDoc { ... }
loadState / saveDoc / removeDoc / setActive / getActive / listDocs
```

## icons.ts — 신규
```ts
export function createIcon(name: IconName, size?: number): SVGElement  // createElementNS, ICON_D[name] path
// IconName: 'doc'|'history'|'plus'|'comment'|'chevronDown'|'reply'|'trash'|'copy'|'handoff'|'arrowRight'|'x'
```

## render.ts — 재작성 (DOM 어댑터)
```ts
// 상태→3-pane 전체 렌더. 콜백으로 컨트롤러에 사용자 의도 전달.
export function renderApp(state, store, ctx: RenderCtx): void
// RenderCtx: { docs, activeDoc, sections, callbacks: { onConvert, onSelectDoc, onDeleteDoc,
//   onSelectSection, onToggleCollapse, onAddNote, onDeleteNote, onStartReply, onCancelReply,
//   onCopyHandoff, onNewReview } }
```
- 마운트 대상: `index.html` 의 `<main id="app">`. 매 호출 `innerHTML=''` 후 재구성(타이핑 제외, research D-1).
- emit 하는 DOM/클래스 계약은 [ui.md](./ui.md) 참조.
