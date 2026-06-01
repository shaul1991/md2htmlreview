import './styles/tokens.css';
import './styles/components.css';
import { parseSections, type Section } from './parse';
import { buildExport } from './export';
import { renderApp } from './render';
import { NoteStore } from './notes';
import { saveDoc, removeDoc, setActive, getActive, listDocs, type StoredDoc } from './storage';
import { SAMPLES } from './sample';
import { createIcon } from './icons';

const mount = document.querySelector<HTMLElement>('#app')!;

// 영속 계층(SSoT): NoteStore(활성 문서 노트) + storage(다중 문서·active).
const store = new NoteStore();
let sections: Section[] = [];
let currentDoc: StoredDoc | null = null;

// UI 휘발 상태 (research D-2). 작성기/붙여넣기 입력값은 여기 두지 않고 제출 시 DOM 에서 읽음 (D-1).
interface AppState {
  mode: 'empty' | 'paste' | 'review';
  selectedSectionId: string | null;
  collapsed: Set<string>;
  replyTo: { sectionId: string; noteId: string } | null;
}
const state: AppState = { mode: 'empty', selectedSectionId: null, collapsed: new Set(), replyTo: null };

/* ---------------- 테마 (FR-016, research D-3) ---------------- */
function applyTheme(): void {
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

/* ---------------- 유틸 ---------------- */
function genId(): string {
  return Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
}

function titleOf(src: string): string {
  for (const line of src.split('\n')) {
    const m = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (m) return m[1].trim();
  }
  return src.trim().split('\n')[0]?.slice(0, 40) || 'Untitled';
}

function render(): void {
  renderApp(mount, {
    mode: state.mode,
    docs: listDocs(),
    activeId: currentDoc?.id ?? null,
    activeDoc: currentDoc,
    sections,
    store,
    selectedSectionId: state.selectedSectionId,
    collapsed: state.collapsed,
    replyTo: state.replyTo,
  });
}

function focusComposer(): void {
  mount.querySelector<HTMLTextAreaElement>('[data-role="composer"]')?.focus();
}

/* ---------------- 문서 흐름 ---------------- */
// 의견 변경 시 활성 문서에 동기화 + 영속 (FR-012).
function persist(): void {
  if (!currentDoc) return;
  currentDoc.notes = store.toJSON();
  currentDoc.updatedAt = Date.now();
  saveDoc(currentDoc);
}

function enterReview(doc: StoredDoc): void {
  currentDoc = doc;
  sections = parseSections(doc.source);
  store.loadFrom(doc.notes);
  setActive(doc.id);
  state.mode = 'review';
  state.selectedSectionId = sections[0]?.id ?? null;
  state.collapsed.clear();
  state.replyTo = null;
}

// 변환: 새 문서 생성 + 의견 초기화 + 저장 (FR-004).
function convert(text: string): void {
  const parsed = parseSections(text);
  if (parsed.length === 0) return;
  store.clear();
  const now = Date.now();
  const doc: StoredDoc = { id: genId(), title: titleOf(text), source: text, notes: {}, createdAt: now, updatedAt: now };
  saveDoc(doc);
  enterReview(doc);
  render();
}

// 이력에서 문서 로드 (FR-013).
function loadDoc(id: string): void {
  const doc = listDocs().find((d) => d.id === id);
  if (!doc) return;
  enterReview(doc);
  render();
}

// 이력에서 문서 삭제 (FR-013). active 삭제 시 다음 문서로 이전, 없으면 빈 상태.
function deleteDoc(id: string): void {
  removeDoc(id);
  if (currentDoc?.id === id) {
    const next = getActive();
    if (next) {
      loadDoc(next.id);
      return;
    }
    currentDoc = null;
    sections = [];
    store.clear();
    state.mode = 'empty';
    state.selectedSectionId = null;
    state.replyTo = null;
  }
  render();
}

// "샘플로 시작" — 3개(spec/plan/tasks)를 이력에 시딩하고 첫(spec) 문서를 연다.
function seedSamples(): void {
  const now = Date.now();
  let openId = '';
  SAMPLES.forEach((s, i) => {
    const id = `${genId()}-s${i}`;
    const t = now - i; // i=0(spec) 이 가장 최신 → 이력 최상단
    saveDoc({ id, title: s.title, source: s.source, notes: {}, createdAt: t, updatedAt: t });
    if (i === 0) openId = id;
  });
  loadDoc(openId);
}

/* ---------------- 노트 액션 ---------------- */
function submitNote(): void {
  const ta = mount.querySelector<HTMLTextAreaElement>('[data-role="composer"]');
  const sid = state.selectedSectionId;
  if (!ta || !currentDoc || !sid) return;
  const text = ta.value.trim();
  if (!text) return;
  if (state.replyTo) store.rebut(sid, state.replyTo.noteId, text);
  else store.add(sid, text);
  state.replyTo = null;
  persist();
  render();
}

function deleteNote(noteId: string): void {
  store.delete(noteId);
  if (state.replyTo?.noteId === noteId) state.replyTo = null;
  persist();
  render();
}

// 핸드오프 복사 (FR-014).
async function copyHandoff(): Promise<void> {
  if (!currentDoc) return;
  const text = buildExport(currentDoc.source, sections, store.toMap());
  try {
    await navigator.clipboard.writeText(text);
    toast('핸드오프 텍스트 복사됨');
  } catch {
    toast('복사 실패 — 클립보드 권한을 확인하세요');
  }
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function toast(msg: string): void {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.append(createIcon('check', 15), document.createTextNode(msg));
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2200);
}

/* ---------------- 이벤트 위임 ---------------- */
mount.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const actEl = target.closest<HTMLElement>('[data-act]');
  if (actEl) {
    const d = actEl.dataset;
    switch (d.act) {
      case 'new-review':
        state.mode = 'paste';
        state.replyTo = null;
        render();
        break;
      case 'start-blank':
        state.mode = 'paste';
        render();
        break;
      case 'start-sample':
        seedSamples();
        break;
      case 'convert': {
        const ta = mount.querySelector<HTMLTextAreaElement>('.paste-area');
        if (ta) convert(ta.value);
        break;
      }
      case 'fill-sample': {
        const ta = mount.querySelector<HTMLTextAreaElement>('.paste-area');
        if (ta) {
          ta.value = SAMPLES[0].source;
          ta.focus();
        }
        break;
      }
      case 'handoff':
        void copyHandoff();
        break;
      case 'del-doc': {
        const id = actEl.closest<HTMLElement>('.hist-item')?.dataset.docId ?? d.docId;
        if (id) deleteDoc(id);
        break;
      }
      case 'reply-here':
        state.selectedSectionId = d.sectionId ?? null;
        state.replyTo = null;
        render();
        focusComposer();
        break;
      case 'reply':
        state.selectedSectionId = d.sectionId ?? null;
        state.replyTo = d.sectionId && d.noteId ? { sectionId: d.sectionId, noteId: d.noteId } : null;
        render();
        focusComposer();
        break;
      case 'cancel-reply':
        state.replyTo = null;
        render();
        break;
      case 'del-note':
        if (d.noteId) deleteNote(d.noteId);
        break;
      case 'add-note':
        submitNote();
        break;
    }
    return;
  }

  // 구조적: 이력 항목 → 로드
  const hist = target.closest<HTMLElement>('.hist-item');
  if (hist?.dataset.docId) {
    loadDoc(hist.dataset.docId);
    return;
  }

  // 섹션 카드 헤더 → 선택 + 접기 토글
  const cardHead = target.closest('.section-card__head');
  if (cardHead) {
    const sid = cardHead.closest<HTMLElement>('.section-card')?.dataset.sectionId;
    if (sid) {
      state.selectedSectionId = sid;
      if (state.collapsed.has(sid)) state.collapsed.delete(sid);
      else state.collapsed.add(sid);
      render();
    }
    return;
  }

  // 섹션 카드 본문 → 선택
  const card = target.closest<HTMLElement>('.section-card');
  if (card?.dataset.sectionId) {
    state.selectedSectionId = card.dataset.sectionId;
    render();
  }
});

// ⌘/Ctrl+Enter 로 작성기 제출
mount.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    const t = e.target as HTMLElement;
    if (t.matches?.('[data-role="composer"]')) {
      e.preventDefault();
      submitNote();
    }
  }
});

/* ---------------- 부팅 ---------------- */
applyTheme();
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

const active = getActive();
if (active) enterReview(active);
else state.mode = 'empty';
render();
