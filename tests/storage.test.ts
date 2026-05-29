import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, saveDoc, removeDoc, setActive, getActive, listDocs, type StoredDoc } from '../src/storage';

// node 환경에 localStorage 없음 → 메모리 mock
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

function doc(id: string, t: number): StoredDoc {
  return { id, title: `Doc ${id}`, source: `# ${id}`, notes: {}, createdAt: t, updatedAt: t };
}

describe('storage — localStorage 다중 문서 (FR-104/105)', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = new MemStorage();
  });

  it('초기 상태는 빈 목록 + active 없음', () => {
    expect(loadState()).toEqual({ activeId: null, docs: [] });
    expect(getActive()).toBeNull();
  });

  it('saveDoc 으로 upsert, setActive/getActive 로 활성 문서 복원', () => {
    saveDoc(doc('a', 100));
    setActive('a');
    expect(getActive()?.id).toBe('a');
    // 같은 id 재저장 = 갱신
    saveDoc({ ...doc('a', 200), title: '바뀐 제목' });
    expect(listDocs()).toHaveLength(1);
    expect(getActive()?.title).toBe('바뀐 제목');
  });

  it('listDocs 는 updatedAt 내림차순', () => {
    saveDoc(doc('a', 100));
    saveDoc(doc('b', 300));
    saveDoc(doc('c', 200));
    expect(listDocs().map((d) => d.id)).toEqual(['b', 'c', 'a']);
  });

  it('removeDoc 으로 삭제, active 였으면 다른 문서로 이전', () => {
    saveDoc(doc('a', 100));
    saveDoc(doc('b', 200));
    setActive('b');
    removeDoc('b');
    expect(listDocs().map((d) => d.id)).toEqual(['a']);
    expect(getActive()?.id).toBe('a');
  });

  it('영속: 저장 후 다시 loadState 하면 복원된다 (새로고침 모사)', () => {
    saveDoc(doc('a', 100));
    setActive('a');
    // 같은 localStorage 인스턴스 = 디스크 유지 상태. 새 호출이 읽어옴.
    expect(loadState().docs).toHaveLength(1);
    expect(loadState().activeId).toBe('a');
  });
});
