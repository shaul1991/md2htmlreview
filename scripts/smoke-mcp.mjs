// 004 T016 — 실제 빌드된 서버 바이너리(dist-server/server/index.js)를 MCP stdio 로 스폰해
// submit_plan → (사람 검수 시뮬레이트: POST /decision) → get_review 왕복을 복붙 0회로 검증.
// 모든 흐름이 127.0.0.1 안에서 끝난다(SC-005). 선행: `npm run build` + `npm run build:server`.
//
// 실행: node scripts/smoke-mcp.mjs
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const SAMPLE = `# 데모 plan

## 목표
이 단락은 좋다.

## 리스크
여기 보강이 필요하다. <script>alert(1)</script>
`;

const transport = new StdioClientTransport({ command: 'node', args: ['dist-server/server/index.js'] });
const client = new Client({ name: 'smoke', version: '0.0.0' });
await client.connect(transport);

const tools = (await client.listTools()).tools.map((t) => t.name).sort();
console.log('tools:', tools.join(', '));
assert.deepEqual(tools, ['get_review', 'submit_plan'], 'tool 2개 노출');

// 1) 에이전트 제출 (복붙 없음)
const submitRaw = await client.callTool({ name: 'submit_plan', arguments: { markdown: SAMPLE, title: '데모' } });
const submit = JSON.parse(submitRaw.content[0].text);
console.log('submit_plan →', submit);
assert.equal(submit.status, 'pending', 'FR-003 즉시 pending 반환');
assert.match(submit.url, /^http:\/\/127\.0\.0\.1:\d+\/\?review=/, 'FR-001 localhost url');

const port = new URL(submit.url).port;
const base = `http://127.0.0.1:${port}`;

// 2) 제출 직후 회수 = pending (US3)
const pendingRaw = await client.callTool({ name: 'get_review', arguments: { reviewId: submit.reviewId } });
assert.equal(JSON.parse(pendingRaw.content[0].text).status, 'pending', 'SC-004 제출 직후 pending');

// 3) 브라우저 로드 경로(FR-005) — 붙여넣기 없이 원본 회수
const loaded = await (await fetch(`${base}/api/reviews/${submit.reviewId}`)).json();
assert.equal(loaded.source, SAMPLE, 'FR-005 원본 plan 로드');

// 4) 사람 "검수 완료" 시뮬레이트 → 섹션별 의견 POST (FR-007)
const decision = { '리스크': [{ id: 'n1', text: '엣지케이스 누락', kind: 'note', ts: 0 }] };
const post = await fetch(`${base}/api/reviews/${submit.reviewId}/decision`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ notes: decision }),
});
assert.equal(post.status, 200, 'POST /decision 200');

// 5) 에이전트 회수 (복붙 없음) — completed + 구조화 핸드오프 텍스트
const reviewRaw = await client.callTool({ name: 'get_review', arguments: { reviewId: submit.reviewId } });
const review = JSON.parse(reviewRaw.content[0].text);
console.log('get_review status:', review.status);
console.log('--- 회수 텍스트 ---\n' + review.review + '\n------------------');
assert.equal(review.status, 'completed', 'SC-004 검수 후 completed');
assert.match(review.review, /# 원본 plan/, 'FR-004 원본 포함');
assert.match(review.review, /## \[리스크\]/, 'FR-004 섹션 slug 별 의견');
assert.match(review.review, /엣지케이스 누락/, 'FR-004 의견 본문');

await client.close();
console.log('\n✅ SMOKE PASS — 복붙 0회 왕복 성공 (SC-001), 전부 127.0.0.1 (SC-005)');
