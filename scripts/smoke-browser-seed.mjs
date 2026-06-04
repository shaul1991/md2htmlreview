// 004 T016 (US2 브라우저 스모크 시드) — 실제 바이너리를 MCP 로 스폰해 plan 제출 후,
// 브라우저(사람)가 ?review= 에서 검수→"검수 완료" 누르길 기다렸다가 get_review 로 회수해 출력.
// 브라우저 쪽은 Playwright 로 구동. 이 스크립트는 백그라운드로 돌리고 로그를 tail 한다.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const SAMPLE = `# 브라우저 스모크 plan

## 목표
붙여넣기 없이 ?review= 로 로드되는지 본다.

## 리스크
여기에 브라우저에서 의견을 단다.
`;

const transport = new StdioClientTransport({ command: 'node', args: ['dist-server/server/index.js'] });
const client = new Client({ name: 'browser-seed', version: '0.0.0' });
await client.connect(transport);

const submit = JSON.parse((await client.callTool({ name: 'submit_plan', arguments: { markdown: SAMPLE } })).content[0].text);
console.log('URL=' + submit.url);
console.log('REVIEW_ID=' + submit.reviewId);

let review = null;
for (let i = 0; i < 120; i++) {
  const r = JSON.parse((await client.callTool({ name: 'get_review', arguments: { reviewId: submit.reviewId } })).content[0].text);
  if (r.status === 'completed') {
    review = r.review;
    break;
  }
  await new Promise((res) => setTimeout(res, 1000));
}

console.log('=== RECOVERED ===');
console.log(review ?? '(timeout — 검수 완료가 눌리지 않음)');
console.log('=== END ===');
await client.close();
process.exit(0);
