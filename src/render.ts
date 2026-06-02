import type { Section } from './parse';
import type { Note, NoteStore } from './notes';
import type { StoredDoc } from './storage';
import { createIcon, type IconName } from './icons';

/**
 * 003 — 상태(View)를 3-pane 워크스페이스로 렌더한다.
 * 마크업/클래스는 design(components.css) 그대로 emit. 상호작용은 main.ts 의 이벤트 위임이
 * data-act / data-*-id 로 처리하므로 여기서는 콜백을 받지 않는다 (contracts/ui.md, research D-1).
 * section.html 만 innerHTML(이미 md.render html:false 로 안전, FR-015), 나머지 동적 텍스트는 textContent.
 */
export interface View {
  mode: 'empty' | 'paste' | 'review';
  docs: StoredDoc[]; // updatedAt 내림차순
  activeId: string | null;
  activeDoc: StoredDoc | null;
  sections: Section[];
  store: NoteStore;
  selectedSectionId: string | null;
  collapsed: Set<string>;
  replyTo: { sectionId: string; noteId: string } | null;
  reviewSession?: boolean; // 004 — 서버 리뷰 세션(?review=) 모드면 "검수 완료" 액션 노출
}

type Attrs = {
  class?: string;
  text?: string;
  html?: string;
  title?: string;
  type?: string;
  placeholder?: string;
  data?: Record<string, string>;
};

function h(tag: string, attrs: Attrs = {}, children: (Node | string)[] = []): HTMLElement {
  const e = document.createElement(tag);
  if (attrs.class) e.className = attrs.class;
  if (attrs.text != null) e.textContent = attrs.text;
  if (attrs.html != null) e.innerHTML = attrs.html;
  if (attrs.title) e.title = attrs.title;
  if (attrs.type) (e as HTMLInputElement).type = attrs.type;
  if (attrs.placeholder) (e as HTMLTextAreaElement).placeholder = attrs.placeholder;
  if (attrs.data) for (const k in attrs.data) e.dataset[k] = attrs.data[k];
  for (const c of children) e.append(c);
  return e;
}

function iconBtn(icon: IconName, label: string, data: Record<string, string>, size = 15): HTMLElement {
  const b = h('button', { class: 'icon-btn', title: label, type: 'button', data });
  b.append(createIcon(icon, size));
  return b;
}

function stamp(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function noteCountOf(notes: Record<string, Note[]>): number {
  let c = 0;
  for (const k in notes) c += notes[k].length;
  return c;
}

/** 마운트에 3-pane 워크스페이스를 (재)구성한다. */
export function renderApp(mount: HTMLElement, view: View): void {
  mount.innerHTML = '';
  const ws = h('div', { class: 'workspace workspace--three' });
  ws.append(historyPane(view), centerPane(view), notesPane(view));
  mount.append(ws);
}

/* ---------------- 이력 pane ---------------- */
function historyPane(view: View): HTMLElement {
  const head = h('div', { class: 'pane__head' });
  head.append(
    createIcon('history', 15),
    h('span', { class: 'pane__title', text: '이력' }),
    h('span', { class: 'spacer' }),
    iconBtn('plus', '새 리뷰', { act: 'new-review' }),
  );

  const body = h('div', { class: 'pane__body pane__body--flush' });
  body.style.padding = '8px';

  if (view.docs.length === 0) {
    const empty = h('div', { class: 'subtle', text: '아직 변환한 plan 이 없습니다. 우측 상단 ＋ 로 시작하세요.' });
    empty.style.cssText = 'font-size:var(--t-12);padding:16px 12px;line-height:1.6';
    body.append(empty);
  } else {
    body.append(h('div', { class: 'hist-group-label', text: '최근' }));
    for (const d of view.docs) {
      const cnt = noteCountOf(d.notes);
      const item = h('div', {
        class: `hist-item ${d.id === view.activeId ? 'is-active' : ''}`,
        data: { docId: d.id },
      });
      const meta = h('div', { class: 'hist-item__meta' });
      meta.append(h('span', { text: stamp(d.updatedAt) }));
      if (cnt > 0) {
        meta.append(h('span', { text: '·' }));
        const c = h('span', { text: `의견 ${cnt}` });
        c.style.color = 'var(--accent-fg)';
        meta.append(c);
      }
      item.append(h('span', { class: 'hist-item__title', text: d.title }), meta);
      item.append(iconBtn('trash', '삭제', { act: 'del-doc', docId: d.id }, 13));
      body.append(item);
    }
  }

  const pane = h('div', { class: 'pane pane--history' });
  pane.append(head, body);
  return pane;
}

/* ---------------- 중앙 pane ---------------- */
function centerPane(view: View): HTMLElement {
  const head = h('div', { class: 'pane__head' });
  if (view.mode === 'review' && view.activeDoc) {
    const title = h('span', { class: 'pane__title', text: view.activeDoc.title });
    title.style.cssText =
      'text-transform:none;font-size:var(--t-13);color:var(--fg);font-weight:var(--fw-semibold);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    const badge = h('span', { class: 'badge', text: `${view.sections.length} 섹션` });
    head.append(createIcon('doc', 15), title, badge);
    // 004 US2 — 서버 세션 모드면 "검수 완료"가 주 CTA, 클립보드 핸드오프는 폴백으로 병존(FR-013).
    if (view.reviewSession) {
      const done = h('button', { class: 'btn btn--primary btn--sm', type: 'button', data: { act: 'submit-decision' } });
      done.append(createIcon('check', 14), h('span', { text: '검수 완료' }));
      head.append(done);
    }
    const handoff = h('button', { class: `btn ${view.reviewSession ? '' : 'btn--primary'} btn--sm`.replace('  ', ' '), type: 'button', data: { act: 'handoff' } });
    handoff.append(createIcon('handoff', 14), h('span', { text: '핸드오프 복사' }));
    head.append(handoff);
  } else {
    head.append(createIcon('doc', 15), h('span', { class: 'pane__title', text: 'plan 입력' }));
  }

  const body = h('div', { class: 'pane__body' });
  if (view.mode === 'empty') body.append(emptyHero());
  else if (view.mode === 'paste') body.append(pasteWrap());
  else if (view.mode === 'review' && view.activeDoc) body.append(sectionStack(view));

  const pane = h('div', { class: 'pane pane--center' });
  pane.append(head, body);
  return pane;
}

function emptyHero(): HTMLElement {
  const hero = h('div', { class: 'empty-hero' });
  const art = h('div', { class: 'empty-hero__art' });
  art.append(createIcon('doc', 32));
  hero.append(
    art,
    h('h2', { text: 'plan 을 리뷰할 준비가 됐어요' }),
    h('p', { text: 'AI 코딩 에이전트가 만든 plan.md 를 붙여넣으면 제목(heading) 단위로 쪼개 섹션별로 의견을 남기고, 그 결정을 다시 에이전트로 넘길 수 있습니다.' }),
  );

  const steps = h('div', { class: 'empty-steps' });
  const stepData: [string, string][] = [
    ['붙여넣기 · 변환', 'plan.md 텍스트를 붙여넣고 변환하면 heading 기준으로 섹션이 나뉩니다.'],
    ['섹션별 의견', '각 단락에 의견·반박을 달아 thread 로 검토 흐름을 만듭니다.'],
    ['핸드오프 복사', '원본 + 결정 의견을 한 번에 복사해 에이전트에게 그대로 전달합니다.'],
  ];
  stepData.forEach(([t, d], i) => {
    const step = h('div', { class: 'empty-step' });
    step.append(
      h('div', { class: 'empty-step__n', text: String(i + 1) }),
      h('div', { class: 'empty-step__t', text: t }),
      h('div', { class: 'empty-step__d', text: d }),
    );
    steps.append(step);
  });
  hero.append(steps);

  const row = h('div', { class: 'row' });
  row.style.marginTop = '12px';
  const sampleBtn = h('button', { class: 'btn btn--primary btn--lg', type: 'button', data: { act: 'start-sample' } });
  sampleBtn.append(createIcon('plus', 16), h('span', { text: '샘플 plan 으로 시작' }));
  const blankBtn = h('button', { class: 'btn btn--lg', type: 'button', data: { act: 'start-blank' }, text: '빈 화면에서 시작' });
  row.append(sampleBtn, blankBtn);
  hero.append(row);
  return hero;
}

function pasteWrap(): HTMLElement {
  const wrap = h('div', { class: 'paste-wrap' });
  const ta = h('textarea', {
    class: 'paste-area',
    placeholder: '여기에 plan.md 를 붙여넣으세요…  (# 제목 기준으로 섹션이 나뉩니다)',
  });
  (ta as HTMLTextAreaElement).spellcheck = false;

  const bar = h('div', { class: 'paste-bar' });
  const convertBtn = h('button', { class: 'btn btn--primary btn--md', type: 'button', data: { act: 'convert' } });
  convertBtn.append(createIcon('arrowRight', 16), h('span', { text: '변환' }));
  const fillBtn = h('button', { class: 'btn btn--ghost btn--md', type: 'button', data: { act: 'fill-sample' }, text: '샘플 채우기' });
  const note = h('span', { class: 'subtle', text: 'local-first · 서버 전송 없음' });
  note.style.fontSize = 'var(--t-12)';
  bar.append(convertBtn, fillBtn, h('span', { class: 'spacer' }), note);

  wrap.append(ta, bar);
  return wrap;
}

function sectionStack(view: View): HTMLElement {
  const stack = h('div', { class: 'section-stack' });
  for (const s of view.sections) {
    const cnt = view.store.get(s.id).length;
    const collapsed = view.collapsed.has(s.id);
    const card = h('div', {
      class: `section-card ${view.selectedSectionId === s.id ? 'is-selected' : ''} ${cnt ? 'has-notes' : ''} ${collapsed ? 'is-collapsed' : ''}`,
      data: { sectionId: s.id },
    });

    const cardHead = h('div', { class: 'section-card__head' });
    const chev = createIcon('chevronDown', 14);
    chev.classList.add('section-card__chev');
    cardHead.append(
      chev,
      h('span', { class: 'section-card__id', text: `#${s.id}` }),
      h('span', { class: 'section-card__title', text: s.title }),
    );
    if (cnt > 0) {
      const badge = h('span', { class: 'badge badge--accent' });
      badge.append(createIcon('comment', 12), document.createTextNode(String(cnt)));
      cardHead.append(badge);
    }
    const actions = h('div', { class: 'section-card__actions' });
    actions.append(iconBtn('comment', '이 섹션에 의견', { act: 'reply-here', sectionId: s.id }, 14));
    cardHead.append(actions);

    const cardBody = h('div', { class: 'section-card__body md', html: s.html });
    card.append(cardHead, cardBody);
    stack.append(card);
  }
  const tail = h('div');
  tail.style.height = '40px';
  stack.append(tail);
  return stack;
}

/* ---------------- 노트 pane ---------------- */
function notesPane(view: View): HTMLElement {
  const docNotes = view.activeDoc ? view.store.toJSON() : {};
  const total = noteCountOf(docNotes);

  const head = h('div', { class: 'pane__head' });
  head.append(createIcon('comment', 15), h('span', { class: 'pane__title', text: '의견' }));
  if (total > 0) head.append(h('span', { class: 'badge badge--accent', text: String(total) }));
  head.append(h('span', { class: 'spacer' }));
  if (total > 0) head.append(iconBtn('copy', '핸드오프 복사', { act: 'handoff' }));

  const body = h('div', { class: 'pane__body' });
  body.style.cssText = 'display:flex;flex-direction:column';

  const selSection = view.activeDoc
    ? view.sections.find((s) => s.id === view.selectedSectionId) ?? null
    : null;

  if (!view.activeDoc) {
    body.append(notesEmpty('plan 을 변환하면 여기에 섹션별 의견이 모입니다.'));
  } else {
    if (total === 0 && !selSection) {
      body.append(notesEmpty('섹션을 선택하고 의견을 남겨보세요.'));
    }
    // 노트 그룹
    for (const sid of Object.keys(docNotes)) {
      const list = docNotes[sid];
      if (!list.length) continue;
      const sec = view.sections.find((x) => x.id === sid);
      const group = h('div', { class: 'note-group', data: { sectionId: sid } });
      const gHead = h('div', { class: 'note-group__head' });
      gHead.append(
        h('span', { class: 'note-group__sid', text: `#${sid}` }),
        h('span', { class: 'note-group__title', text: sec?.title ?? '' }),
      );
      group.append(gHead);

      const roots = list.filter((n) => n.kind !== 'rebuttal');
      for (const root of roots) {
        group.append(noteCard(root, sid));
        for (const rb of list.filter((n) => n.kind === 'rebuttal' && n.targetNoteId === root.id)) {
          group.append(noteCard(rb, sid));
        }
      }
      body.append(group);
    }
    // 작성기
    if (selSection) body.append(composer(selSection, view.replyTo));
  }

  const pane = h('div', { class: 'pane pane--notes' });
  pane.append(head, body);
  return pane;
}

function notesEmpty(msg: string): HTMLElement {
  const wrap = h('div', { class: 'notes-empty' });
  const icon = h('div', { class: 'notes-empty__icon' });
  icon.append(createIcon('comment', 22));
  wrap.append(icon, h('div', { text: msg }));
  return wrap;
}

function noteCard(note: Note, sectionId: string): HTMLElement {
  const isReb = note.kind === 'rebuttal';
  const card = h('div', { class: `note ${isReb ? 'note--rebuttal' : ''}`, data: { noteId: note.id } });

  const head = h('div', { class: 'note__head' });
  if (isReb) head.append(createIcon('reply', 13));
  head.append(
    h('span', { class: `note__kind note__kind--${note.kind}`, text: isReb ? '반박' : '의견' }),
    h('span', { class: 'note__id', text: note.id + (isReb ? ` → ${note.targetNoteId}` : '') }),
  );
  const actions = h('div', { class: 'note__actions' });
  if (!isReb) actions.append(iconBtn('reply', '반박', { act: 'reply', sectionId, noteId: note.id }, 13));
  actions.append(iconBtn('trash', '삭제', { act: 'del-note', noteId: note.id }, 13));
  head.append(actions);

  card.append(head, h('div', { class: 'note__text', text: note.text }), h('div', { class: 'note__time', text: stamp(note.ts) }));
  return card;
}

function composer(section: Section, replyTo: View['replyTo']): HTMLElement {
  const comp = h('div', { class: 'note-composer' });

  if (replyTo) {
    const row = h('div', { class: 'row' });
    row.style.cssText = 'font-size:var(--t-12);color:var(--attention);margin-bottom:4px';
    row.append(createIcon('reply', 13), h('span', { text: `${replyTo.noteId} 에 반박 작성 중` }));
    row.append(iconBtn('x', '취소', { act: 'cancel-reply' }, 12));
    comp.append(row);
  }

  const label = h('div', { class: 'subtle' });
  label.style.cssText = 'font-size:var(--t-11);margin-bottom:5px';
  const sid = h('span', { class: 'mono', text: `#${section.id}` });
  sid.style.color = 'var(--accent-fg)';
  label.append(sid, document.createTextNode(` · ${section.title}`));
  comp.append(label);

  const ta = h('textarea', {
    class: 'textarea',
    placeholder: replyTo ? '반박 의견…' : '이 섹션에 대한 의견…',
    data: { role: 'composer' },
  });
  comp.append(ta);

  const row = h('div', { class: 'note-composer__row' });
  const addBtn = h('button', { class: 'btn btn--primary btn--sm', type: 'button', data: { act: 'add-note' } });
  addBtn.append(createIcon(replyTo ? 'reply' : 'plus', 14), h('span', { text: replyTo ? '반박 추가' : '의견 추가' }));
  const hint = h('span', { class: 'subtle' });
  hint.style.fontSize = 'var(--t-11)';
  hint.append(h('kbd', { class: 'kbd', text: '⌘' }), h('kbd', { class: 'kbd', text: '↵' }), document.createTextNode(' 저장'));
  row.append(addBtn, h('span', { class: 'spacer' }), hint);
  comp.append(row);

  return comp;
}
