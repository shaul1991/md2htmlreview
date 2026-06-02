import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { parseSections } from '../src/parse.js';
import { buildExport } from '../src/export.js';
import type { Note } from '../src/notes.js';
import type { Sessions, ReviewSession } from './sessions.js';

/**
 * get_review 결과 — 세 상태를 명시적으로 구분 (SC-004, FR-009/010).
 * not_found 는 pending 과 다른 신호여서 에이전트가 "미완료"와 "없음"을 혼동하지 않는다.
 */
export type GetReviewResult =
  | { status: 'pending' }
  | { status: 'completed'; review: string }
  | { status: 'not_found' };

/**
 * 회수 텍스트의 SSoT (FR-004/014, SC-002). 클립보드 핸드오프(`main.ts copyHandoff`)와
 * **같은 순수 함수** `buildExport` 를, **같은 source·같은 의견 맵**으로 부른다.
 * `Record` → `Object.entries` → `Map` 으로 복원해도 buildExport 가 섹션 순서로 출력하므로
 * 결과는 클립보드 경로와 바이트 단위로 동일하다.
 */
export function buildReviewText(session: ReviewSession): string {
  const notes = new Map<string, Note[]>(Object.entries(session.decision ?? {}));
  return buildExport(session.source, parseSections(session.source), notes);
}

/** get_review tool 의 순수 코어 — 세션 상태를 회수 결과로 매핑. */
export function getReview(sessions: Sessions, reviewId: string): GetReviewResult {
  const session = sessions.get(reviewId);
  if (!session) return { status: 'not_found' };
  if (session.status === 'pending') return { status: 'pending' };
  return { status: 'completed', review: buildReviewText(session) };
}

/** tool 핸들러는 결과를 JSON 텍스트 content 로 돌려준다(outputSchema 미정의). */
function asText(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }] };
}

/**
 * MCP surface — tool 2개 등록 (FR-001/002/003). `submit_plan` 은 즉시 반환(논블로킹, FR-003),
 * `get_review` 는 폴링용 상태/결과를 돌려준다. `urlFor` 는 index.ts 가 실제 바인딩 포트로 만든 주소.
 */
export function registerTools(server: McpServer, sessions: Sessions, urlFor: (reviewId: string) => string): void {
  server.registerTool(
    'submit_plan',
    {
      description: 'plan markdown 을 로컬 리뷰 세션으로 등록하고, 사람이 열 localhost 주소를 즉시 반환한다(논블로킹).',
      inputSchema: { markdown: z.string(), title: z.string().optional() },
    },
    async ({ markdown }) => {
      const session = sessions.create(markdown);
      return asText({ reviewId: session.reviewId, url: urlFor(session.reviewId), status: session.status });
    },
  );

  server.registerTool(
    'get_review',
    {
      description: '검수 결정을 회수한다. completed 면 원본+섹션별 의견 구조화 텍스트(buildExport)를 돌려준다.',
      inputSchema: { reviewId: z.string() },
    },
    async ({ reviewId }) => asText(getReview(sessions, reviewId)),
  );
}
