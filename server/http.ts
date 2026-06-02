import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import type { Sessions } from './sessions.js';

// 브라우저가 받는 정적 자산 = 기존 Vite 빌드 산출물(dist/). cwd 기준(호스트가 repo 루트에서 스폰).
const DIST_DIR = resolve(process.cwd(), 'dist');

// vite.config.ts 의 base 와 일치. 빌드된 dist/index.html 이 자산을 /md2htmlreview/ 접두로 참조하므로
// (GitHub Pages 용) 로컬 서버는 이 접두를 벗겨 dist 루트에서 서빙한다.
const BASE = '/md2htmlreview/';

const REVIEW_RE = /^\/api\/reviews\/([^/]+)(\/decision)?$/;

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(text);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolveBody(data));
    req.on('error', reject);
  });
}

/**
 * 브라우저 ↔ 서버 다리 + 정적 서빙 (plan 내부 계약 표). 같은 sessions 인스턴스를 mcp 와 공유.
 * 바인딩 호스트(127.0.0.1)·포트는 index.ts 의 listen 책임 (FR-012, local-first).
 */
export function createHttpServer(sessions: Sessions): Server {
  return createServer((req, res) => {
    void handle(req, res, sessions);
  });
}

async function handle(req: IncomingMessage, res: ServerResponse, sessions: Sessions): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const match = REVIEW_RE.exec(url.pathname);

  if (match) {
    const reviewId = decodeURIComponent(match[1]);
    const isDecision = match[2] === '/decision';

    if (!isDecision && req.method === 'GET') {
      // FR-005 — 브라우저가 붙여넣기 없이 원본 plan 로드
      const session = sessions.get(reviewId);
      if (!session) return sendJson(res, 404, { error: 'not_found' });
      return sendJson(res, 200, { reviewId: session.reviewId, source: session.source, status: session.status });
    }

    if (isDecision && req.method === 'POST') {
      // FR-007 — 사람 "검수 완료" → 세션을 completed 로 기록
      let notes: unknown;
      try {
        notes = JSON.parse(await readBody(req)).notes;
      } catch {
        return sendJson(res, 400, { error: 'invalid_json' });
      }
      if (notes === null || typeof notes !== 'object') {
        return sendJson(res, 400, { error: 'invalid_notes' });
      }
      const ok = sessions.recordDecision(reviewId, notes as Record<string, never>);
      if (!ok) return sendJson(res, 404, { error: 'not_found' });
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 405, { error: 'method_not_allowed' });
  }

  // 정적: 기존 리뷰 UI (dist/) 서빙. SPA 라 미존재 경로는 index.html 로 폴백.
  if (req.method === 'GET') return serveStatic(url.pathname, res);
  return sendJson(res, 404, { error: 'not_found' });
}

async function serveStatic(pathname: string, res: ServerResponse): Promise<void> {
  // base 접두(/md2htmlreview/...) 를 dist 루트 기준 경로로 환원.
  let p = pathname;
  if (p.startsWith(BASE)) p = '/' + p.slice(BASE.length);
  else if (p === BASE.slice(0, -1)) p = '/';

  const rel = p === '/' ? 'index.html' : normalize(p).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  let filePath = join(DIST_DIR, rel);
  if (!filePath.startsWith(DIST_DIR)) filePath = join(DIST_DIR, 'index.html'); // traversal 차단

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
  } catch {
    filePath = join(DIST_DIR, 'index.html'); // SPA 폴백
    try {
      await stat(filePath);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('dist/ 빌드가 없습니다 — `npm run build` 후 다시 시도하세요.');
      return;
    }
  }

  res.writeHead(200, { 'content-type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
}
