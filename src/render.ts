import type { Section } from './parse';
import type { NoteStore } from './notes';
import type { StoredDoc } from './storage';

/**
 * 섹션 배열을 검수 단위로 렌더한다 (FR-101/003/004/005/006).
 * 각 섹션: <section data-section-id="slug"> + 렌더된 HTML(heading 포함) + 의견 UI.
 * onChange: 의견 추가/수정/반박 시 호출 → 호출부가 영속(FR-104).
 * section.html 은 md.render(html:false) 산출이라 raw HTML 이 없어 안전 (FR-108).
 */
export function renderSections(
  sections: Section[],
  store: NoteStore,
  mount: HTMLElement,
  onChange: () => void,
): void {
  mount.innerHTML = '';
  for (const section of sections) {
    const el = document.createElement('section');
    el.className = 'block';
    el.dataset.sectionId = section.id;

    const label = document.createElement('span');
    label.className = 'block-id';
    label.textContent = section.id;

    const content = document.createElement('div');
    content.className = 'block-content';
    content.innerHTML = section.html;

    const notesEl = document.createElement('div');
    notesEl.className = 'notes';

    el.append(label, content, notesEl);
    mount.append(el);

    renderNotes(section.id, store, notesEl, onChange);
  }
}

/** 한 섹션의 의견 목록 + 입력 UI 를 (재)렌더한다. 추가/반박 시 자기 자신을 다시 그린다. */
function renderNotes(
  sectionId: string,
  store: NoteStore,
  container: HTMLElement,
  onChange: () => void,
): void {
  container.innerHTML = '';

  const list = document.createElement('ul');
  list.className = 'note-list';

  for (const note of store.get(sectionId)) {
    const li = document.createElement('li');
    li.className = `note note-${note.kind}`;

    if (note.kind === 'rebuttal') {
      const tag = document.createElement('span');
      tag.className = 'note-tag';
      tag.textContent = `반박 → ${note.targetNoteId}`;
      li.append(tag);
    }

    const text = document.createElement('textarea');
    text.className = 'note-text';
    text.rows = 2;
    text.value = note.text;
    // 입력 즉시 저장소 갱신 = 의견 수정 (FR-006) → 영속
    text.addEventListener('input', () => {
      store.edit(note.id, text.value);
      onChange();
    });
    li.append(text);

    const rebutBtn = document.createElement('button');
    rebutBtn.type = 'button';
    rebutBtn.className = 'rebut-btn';
    rebutBtn.textContent = '반박';
    rebutBtn.addEventListener('click', () => {
      store.rebut(sectionId, note.id, '');
      onChange();
      renderNotes(sectionId, store, container, onChange);
    });
    li.append(rebutBtn);

    list.append(li);
  }
  container.append(list);

  const addText = document.createElement('textarea');
  addText.className = 'note-add';
  addText.rows = 2;
  addText.placeholder = '이 섹션에 의견 추가…';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'add-btn';
  addBtn.textContent = '의견 추가';
  addBtn.addEventListener('click', () => {
    const value = addText.value.trim();
    if (!value) return;
    store.add(sectionId, value);
    onChange();
    renderNotes(sectionId, store, container, onChange);
  });

  const addRow = document.createElement('div');
  addRow.className = 'note-add-row';
  addRow.append(addText, addBtn);
  container.append(addRow);
}

/**
 * 저장된 문서 이력 목록을 렌더한다 (FR-105). 클릭=로드, ✕=삭제. active 강조.
 */
export function renderHistory(
  docs: StoredDoc[],
  activeId: string | null,
  mount: HTMLElement,
  onLoad: (id: string) => void,
  onDelete: (id: string) => void,
): void {
  mount.innerHTML = '';
  if (docs.length === 0) {
    mount.textContent = '저장된 문서가 없습니다. markdown 을 붙여넣고 변환하세요.';
    mount.className = 'history empty';
    return;
  }
  mount.className = 'history';

  for (const doc of docs) {
    const item = document.createElement('div');
    item.className = 'history-item' + (doc.id === activeId ? ' active' : '');

    const load = document.createElement('button');
    load.type = 'button';
    load.className = 'history-load';
    const when = new Date(doc.updatedAt);
    const stamp = `${when.getMonth() + 1}/${when.getDate()} ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
    load.textContent = `${doc.title}  ·  ${stamp}`;
    load.addEventListener('click', () => onLoad(doc.id));

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'history-del';
    del.textContent = '✕';
    del.title = '삭제';
    del.addEventListener('click', () => onDelete(doc.id));

    item.append(load, del);
    mount.append(item);
  }
}
