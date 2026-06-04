import type { AddressInfo } from 'node:net';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createSessions } from './sessions.js';
import { createHttpServer } from './http.js';
import { registerTools } from './mcp.js';

// stdout 은 MCP JSON-RPC 전용 — 모든 로그는 stderr 로만.
const log = (...args: unknown[]): void => console.error('[md2htmlreview]', ...args);

const DEFAULT_PORT = 7391;

/** 기본 포트 점유 시(Edge: 포트 충돌) 대체 포트로 바인딩. 실제 바인딩 포트를 돌려준다. */
function listen(server: ReturnType<typeof createHttpServer>): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException): void => {
      if (err.code === 'EADDRINUSE') {
        log(`포트 ${DEFAULT_PORT} 점유 — 대체 포트로 재시도`);
        server.listen(0, '127.0.0.1'); // 0 = OS 가 빈 포트 할당
      } else {
        reject(err);
      }
    };
    server.on('error', onError);
    server.on('listening', () => {
      server.removeListener('error', onError);
      resolve((server.address() as AddressInfo).port);
    });
    server.listen(DEFAULT_PORT, '127.0.0.1');
  });
}

async function main(): Promise<void> {
  // mcp 와 http 가 공유하는 단일 인메모리 세션 저장소.
  const sessions = createSessions();

  const httpServer = createHttpServer(sessions);
  const port = await listen(httpServer);
  log(`리뷰 UI: http://127.0.0.1:${port}/ (local-first, 외부 전송 없음)`);

  const urlFor = (reviewId: string): string => `http://127.0.0.1:${port}/?review=${reviewId}`;

  const mcp = new McpServer({ name: 'md2htmlreview', version: '0.0.0' });
  registerTools(mcp, sessions, urlFor);
  await mcp.connect(new StdioServerTransport());
  log('MCP stdio 서버 준비 완료 (submit_plan / get_review)');
}

main().catch((err) => {
  log('기동 실패:', err);
  process.exit(1);
});
