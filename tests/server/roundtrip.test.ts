import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createSessions, type Sessions } from '../../server/sessions.js';
import { createHttpServer } from '../../server/http.js';
import { getReview, buildReviewText } from '../../server/mcp.js';
import { parseSections } from '../../src/parse.js';
import { buildExport } from '../../src/export.js';
import { NoteStore } from '../../src/notes.js';

// 004 US1 — 에이전트 제출→회수 왕복을 브라우저 없이 in-process 로 검증.
// submit_plan(=sessions.create) → POST /decision(사람 검수 시뮬레이트) → get_review(=getReview).

const SOURCE = `# 리팩터 plan

## 개요
첫 단락 설명.

## 설계
둘째 단락 설계.
`;

let sessions: Sessions;
let server: Server;
let base: string;

beforeAll(async () => {
  sessions = createSessions();
  server = createHttpServer(sessions);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('US1 제출→회수 왕복 (T006)', () => {
  it('submit_plan → POST decision → get_review 가 원본 + 섹션별 의견 구조화 텍스트 반환 (FR-001/002/003/007)', async () => {
    const s = sessions.create(SOURCE); // submit_plan 핸들러가 하는 일
    const decision = { '개요': [{ id: 'n1', text: '여기 보강 필요', kind: 'note' as const, ts: 0 }] };

    const res = await fetch(`${base}/api/reviews/${s.reviewId}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notes: decision }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const review = getReview(sessions, s.reviewId);
    expect(review.status).toBe('completed');
    if (review.status !== 'completed') throw new Error('unreachable');
    expect(review.review).toContain('# 원본 plan');
    expect(review.review).toContain('## [개요]');
    expect(review.review).toContain('여기 보강 필요');
  });

  it('GET /api/reviews/:id 가 원본 plan 로드, 알 수 없는 id → 404 (FR-005/010)', async () => {
    const s = sessions.create(SOURCE);
    const ok = await fetch(`${base}/api/reviews/${s.reviewId}`);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ reviewId: s.reviewId, source: SOURCE, status: 'pending' });

    const miss = await fetch(`${base}/api/reviews/does-not-exist`);
    expect(miss.status).toBe(404);
  });
});

describe('SC-002 문자열 단위 일치 — 서버 회수 === 브라우저 클립보드 경로 (T007)', () => {
  it('Record→POST→저장→Object.entries→Map 왕복 후에도 buildExport 와 바이트 동일 (SC-002, FR-004/014)', async () => {
    const s = sessions.create(SOURCE);

    // 브라우저 클립보드 경로가 부르는 그대로: NoteStore → toMap()/toJSON()
    const store = new NoteStore();
    const root = store.add('개요', '핵심 보강');
    store.rebut('개요', root.id, '아니다, 이대로 두자');
    store.add('설계', '설계 동의');

    const browserExpected = buildExport(SOURCE, parseSections(SOURCE), store.toMap());

    // 사람 검수 완료 = NoteStore.toJSON() 을 그대로 POST
    const res = await fetch(`${base}/api/reviews/${s.reviewId}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notes: store.toJSON() }),
    });
    expect(res.status).toBe(200);

    const review = getReview(sessions, s.reviewId);
    if (review.status !== 'completed') throw new Error('expected completed');
    expect(review.review).toBe(browserExpected); // 형식 SSoT 단일
  });
});

describe('SC-003 / FR-011 — html:false 무력화 유지 (T008)', () => {
  const EVIL = `# 위험 plan

## 본문
<script>alert('xss')</script> 와 <img src=x onerror=alert(1)>.
`;

  it('렌더 경로(parseSections)가 raw HTML 을 escape — 실행 가능 형태 미생존', () => {
    const sections = parseSections(EVIL);
    for (const sec of sections) {
      // 실행 가능한 raw 태그(여는 `<script`/`<img`)가 살아남지 않는다. html:false 가 전부 escape.
      // (escape 된 `&lt;img ... onerror=...&gt;` 안의 "onerror=" 문자열은 inert 텍스트라 무해.)
      expect(sec.html).not.toContain('<script');
      expect(sec.html).not.toContain('<img');
    }
    // 단일 무력화 지점이 실제로 escape 했는지 양성 확인
    expect(sections.some((s) => s.html.includes('&lt;script&gt;'))).toBe(true);
  });

  it('제출·결정·회수해도 GET 응답은 JSON 데이터(실행 가능 HTML 문서 아님)이고, 회수 텍스트는 inert markdown', async () => {
    const s = sessions.create(EVIL);
    await fetch(`${base}/api/reviews/${s.reviewId}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notes: {} }),
    });

    const res = await fetch(`${base}/api/reviews/${s.reviewId}`);
    expect(res.headers.get('content-type')).toContain('application/json');
    // source 는 JSON 문자열 필드로 운반될 뿐 HTML 로 렌더되지 않는다
    const body = await res.json();
    expect(typeof body.source).toBe('string');

    // 회수 텍스트는 원본 markdown 을 그대로 담는 평문 핸드오프 — buildExport 가 src 를 verbatim 포함.
    // 어디서도 HTML 로 렌더되지 않으므로 실행 가능 raw HTML 이 살아나지 않는다.
    const review = buildReviewText(sessions.get(s.reviewId)!);
    expect(typeof review).toBe('string');
    expect(review).toContain('# 원본 plan');
  });
});

describe('US3 상태 분기 회귀 핀 — pending / completed(의견 0건) / not_found (T014)', () => {
  it('submit 직후 pending(결정 본문 없음), 의견 0건 결정 후 completed 이며 pending 과 명확 구분 (SC-004, FR-009)', async () => {
    const s = sessions.create(SOURCE);

    const before = getReview(sessions, s.reviewId);
    expect(before).toEqual({ status: 'pending' }); // 결정 본문 없음

    // 의견 0건으로 "검수 완료"
    const res = await fetch(`${base}/api/reviews/${s.reviewId}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notes: {} }),
    });
    expect(res.status).toBe(200);

    const after = getReview(sessions, s.reviewId);
    expect(after.status).toBe('completed'); // 의견 없음이 미완료로 오인되지 않음
    expect(after.status).not.toBe('pending');

    // 알 수 없는 reviewId 는 pending 도 completed 도 아닌 명시적 not_found (FR-010)
    expect(getReview(sessions, 'unknown-id')).toEqual({ status: 'not_found' });
  });
});
