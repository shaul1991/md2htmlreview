import { describe, it, expect, beforeEach } from 'vitest';
import { NoteStore } from '../src/notes';

describe('NoteStore — 메모리 의견 저장소 (FR-006, D-3)', () => {
  let store: NoteStore;
  beforeEach(() => {
    store = new NoteStore();
  });

  it('의견을 추가하면 kind:note 로 저장된다', () => {
    const note = store.add('p1', 'first opinion');
    expect(note.kind).toBe('note');
    expect(note.text).toBe('first opinion');
    expect(store.get('p1')).toHaveLength(1);
  });

  it('한 단락에 복수 의견을 둘 수 있다 (FR-006)', () => {
    store.add('p1', 'first');
    store.add('p1', 'second');
    expect(store.get('p1').map((n) => n.text)).toEqual(['first', 'second']);
  });

  it('add / rebut 은 생성 시각 ts 를 부여한다 (003)', () => {
    const note = store.add('p1', 'x');
    expect(typeof note.ts).toBe('number');
    const reb = store.rebut('p1', note.id, 'y');
    expect(typeof reb.ts).toBe('number');
  });

  it('delete 는 노트와 그 노트를 대상으로 한 반박을 함께 제거한다 (003)', () => {
    const a = store.add('p1', 'a');
    const b = store.add('p1', 'b');
    store.rebut('p1', a.id, 'reb to a');
    store.delete(a.id);
    expect(store.get('p1').map((n) => n.id)).toEqual([b.id]);
  });

  it('반박 의견은 kind:rebuttal 과 targetNoteId 로 대상을 식별한다 (FR-006)', () => {
    const target = store.add('p1', 'claim');
    const rebuttal = store.rebut('p1', target.id, 'I disagree');
    expect(rebuttal.kind).toBe('rebuttal');
    expect(rebuttal.targetNoteId).toBe(target.id);
    expect(store.get('p1')).toHaveLength(2);
  });

  it('note id 는 단락을 가로질러 고유하다', () => {
    const a = store.add('p1', 'a');
    const b = store.add('p2', 'b');
    expect(a.id).not.toBe(b.id);
  });

  it('toMap() 은 단락→의견 목록 Map 을 반환한다', () => {
    store.add('p1', 'x');
    store.add('p3', 'y');
    const map = store.toMap();
    expect(map.get('p1')?.[0].text).toBe('x');
    expect(map.get('p3')?.[0].text).toBe('y');
    expect(map.has('p2')).toBe(false);
  });

  it('clear() 는 저장소를 초기화한다 (재변환 시, FR-009)', () => {
    store.add('p1', 'x');
    store.clear();
    expect(store.get('p1')).toEqual([]);
  });

  it('toJSON / loadFrom 라운드트립 + seq 복원 (영속용, FR-104)', () => {
    store.add('s1', 'a');
    const b = store.add('s1', 'b');
    store.rebut('s1', b.id, 'c');
    const json = store.toJSON();

    const restored = new NoteStore();
    restored.loadFrom(json);
    expect(restored.get('s1').map((n) => n.text)).toEqual(['a', 'b', 'c']);

    // seq 가 복원되어 새 add 의 id 가 기존과 충돌하지 않음
    const added = restored.add('s1', 'd');
    const ids = restored.get('s1').map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(added.id);
  });

  it('loadFrom 은 ts 를 보존한다 (003)', () => {
    const n = store.add('s1', 'a');
    const restored = new NoteStore();
    restored.loadFrom(store.toJSON());
    expect(restored.get('s1')[0].ts).toBe(n.ts);
  });
});
