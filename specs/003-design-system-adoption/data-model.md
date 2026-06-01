# Phase 1 Data Model — 003

## Section (`src/parse.ts`) — 가산 변경

```ts
interface Section {
  id: string;          // heading slug, 또는 "intro" (기존)
  headingLevel: number;// 1..6, intro=0 (기존)
  title: string;       // ★신규: 카드 헤더 표시용. heading 텍스트 / intro 는 첫 줄 스니펫
  raw: string;         // 원본 슬라이스 (기존)
  html: string;        // md.render, html:false (기존, FR-015)
}
```
- 검증: `title` 은 비어있지 않음(intro fallback "도입"). `id` 는 기존 충돌 처리(`-2`) 유지.

## Note (`src/notes.ts`) — 가산 변경

```ts
type NoteKind = 'note' | 'rebuttal';
interface Note {
  id: string;            // "n1", "n2" … (기존 seq 유지)
  text: string;
  kind: NoteKind;
  targetNoteId?: string; // rebuttal 대상 (기존)
  ts: number;            // ★신규: 생성 시각(ms). 표시·정렬용
}
```
- 상태 전이: `add`→note(ts=now) / `rebut`→rebuttal(ts=now, targetNoteId) / `delete(noteId)`→해당 노트 +
  그 노트를 target 으로 하는 반박 제거. (★`edit` 제거 — research D-5)
- 직렬화: `toJSON/loadFrom` 는 `ts` 포함(스프레드 복사). `loadFrom` 은 기존 id seq 복원 로직 유지.

## StoredDoc (`src/storage.ts`) — 무변경

```ts
interface StoredDoc {
  id: string; title: string; source: string;
  notes: Record<string, Note[]>;  // 섹션 id → Note[] (ts 자동 포함)
  createdAt: number; updatedAt: number;
}
```
- `notes` 의 Note 가 `ts` 를 갖게 되나 구조 동일 → 코드 변경 없음. 기존 저장 데이터(ts 없는 노트) 로드 시
  `ts` 가 `undefined` → 표시 시 fallback(빈 문자열) 처리(렌더에서). 마이그레이션 불필요.

## AppState (`src/main.ts`) — 신규 (UI 전용, 비영속)

```ts
interface AppState {
  mode: 'empty' | 'paste' | 'review';
  selectedSectionId: string | null;
  collapsed: Set<string>;          // 접힌 섹션 id
  replyTo: { sectionId: string; noteId: string } | null;
}
```
- SSoT 분리: 문서/노트/active 는 `storage.ts`+`NoteStore`(영속), 위 4개만 UI 휘발 상태.
- `mode` 초기값: 부팅 시 활성 문서 있으면 `review`, 없으면 `empty`.
- 작성기/붙여넣기 입력값은 AppState 에 두지 않음(제출 시 DOM 에서 읽음 — research D-1).

## 관계 요약

- Document(StoredDoc) 1 — N Section(파생, 비영속: source 에서 parseSections) — N Note(영속, NoteStore/storage).
- Note.rebuttal — targetNoteId → 같은 섹션의 root Note.
