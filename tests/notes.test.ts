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

  it('기존 의견 텍스트를 수정(교체)할 수 있다 (FR-006)', () => {
    const note = store.add('p1', 'original');
    store.edit(note.id, 'edited');
    expect(store.get('p1')[0].text).toBe('edited');
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
});
