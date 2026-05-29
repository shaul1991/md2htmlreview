import type { Block } from './parse';
import type { NoteStore } from './notes';

/**
 * 블록 배열을 단락 컨테이너로 렌더한다 (FR-003/004/005/006).
 * 각 단락: <section data-block-id="pN"> + 렌더된 HTML + 단락별 의견 UI.
 * block.html 은 parse 단계에서 html:false 로 생성되어 raw HTML 이 없으므로 안전 (FR-010).
 */
export function renderBlocks(
  blocks: Block[],
  store: NoteStore,
  mount: HTMLElement,
): void {
  mount.innerHTML = '';
  for (const block of blocks) {
    const section = document.createElement('section');
    section.className = 'block';
    section.dataset.blockId = block.id;

    const label = document.createElement('span');
    label.className = 'block-id';
    label.textContent = block.id;

    const content = document.createElement('div');
    content.className = 'block-content';
    content.innerHTML = block.html;

    const notesEl = document.createElement('div');
    notesEl.className = 'notes';

    section.append(label, content, notesEl);
    mount.append(section);

    renderNotes(block.id, store, notesEl);
  }
}

/** 한 단락의 의견 목록 + 입력 UI 를 (재)렌더한다. 추가/반박 시 자기 자신을 다시 그린다. */
function renderNotes(
  blockId: string,
  store: NoteStore,
  container: HTMLElement,
): void {
  container.innerHTML = '';

  const list = document.createElement('ul');
  list.className = 'note-list';

  for (const note of store.get(blockId)) {
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
    // 입력 즉시 메모리 저장소 갱신 = 의견 수정 (FR-006)
    text.addEventListener('input', () => store.edit(note.id, text.value));
    li.append(text);

    const rebutBtn = document.createElement('button');
    rebutBtn.type = 'button';
    rebutBtn.className = 'rebut-btn';
    rebutBtn.textContent = '반박';
    // 같은 단락에 이 의견을 대상으로 한 빈 반박을 추가 → 사용자가 텍스트 입력 (FR-006)
    rebutBtn.addEventListener('click', () => {
      store.rebut(blockId, note.id, '');
      renderNotes(blockId, store, container);
    });
    li.append(rebutBtn);

    list.append(li);
  }
  container.append(list);

  const addText = document.createElement('textarea');
  addText.className = 'note-add';
  addText.rows = 2;
  addText.placeholder = '이 단락에 의견 추가…';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'add-btn';
  addBtn.textContent = '의견 추가';
  addBtn.addEventListener('click', () => {
    const value = addText.value.trim();
    if (!value) return;
    store.add(blockId, value);
    renderNotes(blockId, store, container);
  });

  const addRow = document.createElement('div');
  addRow.className = 'note-add-row';
  addRow.append(addText, addBtn);
  container.append(addRow);
}
