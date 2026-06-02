import { describe, it, expect } from 'vitest';
import { createSessions } from '../../server/sessions.js';
import type { Note } from '../../src/notes.js';

// 004 T004/T005 — 인메모리 리뷰 세션 저장소 (FR-008/009/010, SC-004).
// 순수 모듈: DOM·http 비종속. 세 상태(pending / completed / 없음) 100% 구분.

const note = (id: string, text: string): Note => ({ id, text, kind: 'note', ts: 0 });

describe('sessions store', () => {
  it('(a) create(source) 직후 status === "pending" (SC-004)', () => {
    const sessions = createSessions();
    const s = sessions.create('# A');
    expect(s.status).toBe('pending');
    expect(sessions.get(s.reviewId)?.status).toBe('pending');
  });

  it('(b) recordDecision 후 completed — 의견 0건이어도 completed 이며 pending 과 구분 (SC-004, FR-009)', () => {
    const sessions = createSessions();
    const s = sessions.create('# A');
    const ok = sessions.recordDecision(s.reviewId, {}); // 의견 0건
    expect(ok).toBe(true);
    const after = sessions.get(s.reviewId);
    expect(after?.status).toBe('completed');
    expect(after?.status).not.toBe('pending'); // "의견 없음"이 미완료로 오인되지 않음
    expect(after?.decision).toEqual({});
  });

  it('(b2) recordDecision 의견 N건 → completed 이며 결정 보존', () => {
    const sessions = createSessions();
    const s = sessions.create('# A\n\n## intro\nx');
    const decision: Record<string, Note[]> = { intro: [note('n1', '의견 하나')] };
    expect(sessions.recordDecision(s.reviewId, decision)).toBe(true);
    expect(sessions.get(s.reviewId)?.decision).toEqual(decision);
  });

  it('(c) 같은 source 중복 create → 매번 다른 reviewId (덮어쓰기 없음) (FR-008)', () => {
    const sessions = createSessions();
    const a = sessions.create('# same');
    const b = sessions.create('# same');
    expect(a.reviewId).not.toBe(b.reviewId);
    // 첫 세션이 살아 있고 독립적
    expect(sessions.get(a.reviewId)).toBeDefined();
    expect(sessions.get(b.reviewId)).toBeDefined();
    sessions.recordDecision(a.reviewId, { intro: [note('n1', 'a 결정')] });
    expect(sessions.get(a.reviewId)?.status).toBe('completed');
    expect(sessions.get(b.reviewId)?.status).toBe('pending'); // b 는 영향 없음
  });

  it('(d) 알 수 없는 id → get 은 undefined (throw 아님), recordDecision 은 false (FR-010)', () => {
    const sessions = createSessions();
    expect(sessions.get('nope')).toBeUndefined();
    expect(sessions.recordDecision('nope', {})).toBe(false);
  });
});
