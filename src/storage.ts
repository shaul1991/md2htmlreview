import type { Note } from './notes';

/** localStorage 에 저장되는 plan 문서 1개 (FR-104/105). */
export interface StoredDoc {
  id: string;
  title: string;
  source: string; // 원본 markdown
  notes: Record<string, Note[]>; // 섹션 slug → 의견들 (NoteStore.toJSON)
  createdAt: number;
  updatedAt: number;
}

interface State {
  activeId: string | null;
  docs: StoredDoc[];
}

const KEY = 'md2htmlreview/v2';

/** 전체 상태 읽기. 손상/부재 시 빈 상태. */
export function loadState(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { activeId: null, docs: [] };
    const s = JSON.parse(raw);
    return {
      activeId: typeof s.activeId === 'string' ? s.activeId : null,
      docs: Array.isArray(s.docs) ? s.docs : [],
    };
  } catch {
    return { activeId: null, docs: [] };
  }
}

function write(state: State): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

/** 문서 upsert (active 는 바꾸지 않음 — 호출부가 setActive). */
export function saveDoc(doc: StoredDoc): void {
  const state = loadState();
  const i = state.docs.findIndex((d) => d.id === doc.id);
  if (i >= 0) state.docs[i] = doc;
  else state.docs.push(doc);
  write(state);
}

/** 문서 삭제. active 였으면 가장 최근 문서로 이전(없으면 null). */
export function removeDoc(id: string): void {
  const state = loadState();
  state.docs = state.docs.filter((d) => d.id !== id);
  if (state.activeId === id) {
    state.activeId = state.docs.length ? state.docs[state.docs.length - 1].id : null;
  }
  write(state);
}

export function setActive(id: string | null): void {
  const state = loadState();
  state.activeId = id;
  write(state);
}

export function getActive(): StoredDoc | null {
  const state = loadState();
  if (!state.activeId) return null;
  return state.docs.find((d) => d.id === state.activeId) ?? null;
}

/** 목록 (updatedAt 내림차순). */
export function listDocs(): StoredDoc[] {
  return loadState().docs.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}
