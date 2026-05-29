import { parseSections, type Section } from './parse';
import { buildExport } from './export';
import { renderSections, renderHistory } from './render';
import { NoteStore } from './notes';
import { saveDoc, removeDoc, setActive, getActive, listDocs, type StoredDoc } from './storage';

const input = document.querySelector<HTMLTextAreaElement>('#input')!;
const convertBtn = document.querySelector<HTMLButtonElement>('#convert')!;
const copyBtn = document.querySelector<HTMLButtonElement>('#copy')!;
const output = document.querySelector<HTMLElement>('#output')!;
const status = document.querySelector<HTMLElement>('#status')!;
const historyEl = document.querySelector<HTMLElement>('#history')!;

const store = new NoteStore();
let sections: Section[] = [];
let currentDoc: StoredDoc | null = null;

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

function refreshHistory(): void {
  renderHistory(listDocs(), currentDoc?.id ?? null, historyEl, loadDoc, deleteDoc);
}

// 의견 변경 시 active 문서에 동기화 + 영속 (FR-104).
function persist(): void {
  if (!currentDoc) return;
  currentDoc.notes = store.toJSON();
  currentDoc.updatedAt = Date.now();
  saveDoc(currentDoc);
  refreshHistory();
}

function renderCurrent(): void {
  renderSections(sections, store, output, persist);
  copyBtn.disabled = sections.length === 0;
}

// 변환: 새 문서 생성 + 의견 초기화 + 저장 (재변환 = 초기화, FR-101/104).
function convert(): void {
  const parsed = parseSections(input.value);
  if (parsed.length === 0) {
    status.textContent = '변환할 markdown 을 입력하세요.';
    return;
  }
  store.clear();
  const now = Date.now();
  currentDoc = {
    id: genId(),
    title: titleOf(input.value),
    source: input.value,
    notes: {},
    createdAt: now,
    updatedAt: now,
  };
  sections = parsed;
  saveDoc(currentDoc);
  setActive(currentDoc.id);
  renderCurrent();
  refreshHistory();
  status.textContent = `${sections.length}개 섹션 · 저장됨 (새로고침해도 유지).`;
}

// 이력에서 문서 로드 (FR-105).
function loadDoc(id: string): void {
  const doc = listDocs().find((d) => d.id === id);
  if (!doc) return;
  currentDoc = doc;
  input.value = doc.source;
  sections = parseSections(doc.source);
  store.loadFrom(doc.notes);
  setActive(id);
  renderCurrent();
  refreshHistory();
  status.textContent = `'${doc.title}' 불러옴.`;
}

// 이력에서 문서 삭제 (FR-105). active 삭제 시 다음 문서로 이전.
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
    output.innerHTML = '';
    input.value = '';
    copyBtn.disabled = true;
    status.textContent = '문서를 삭제했습니다.';
  }
  refreshHistory();
}

// 복사: 원본 + 섹션별 의견 (FR-107).
async function copy(): Promise<void> {
  if (!currentDoc) return;
  const text = buildExport(currentDoc.source, sections, store.toMap());
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = '클립보드에 복사됨 (원본 + 섹션별 의견).';
  } catch {
    status.textContent = '복사 실패 — 브라우저 클립보드 권한을 확인하세요.';
  }
}

convertBtn.addEventListener('click', convert);
copyBtn.addEventListener('click', copy);

// 앱 시작: 활성 문서 복원 (FR-104).
const active = getActive();
if (active) loadDoc(active.id);
else refreshHistory();
