/* ===========================================================================
   md2htmlreview — lib.js
   parse.ts / export.ts 로직을 vanilla JS 로 포팅 (markdown-it UMD 사용).
   window.MD2 네임스페이스로 노출.
   =========================================================================== */
(function () {
  const md = window.markdownit({ html: false, linkify: true, breaks: false });

  const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;

  /** heading 텍스트 → slug (한글 보존). */
  function slugify(text) {
    const s = text
      .normalize('NFC')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s || 'section';
  }

  /** 주 섹션 레벨 P = 2회↑ 등장하는 가장 얕은 레벨, 없으면 가장 얕은 레벨. */
  function primaryLevel(headings) {
    const counts = new Map();
    for (const h of headings) counts.set(h.level, (counts.get(h.level) ?? 0) + 1);
    const repeated = [...counts.entries()].filter(([, c]) => c >= 2).map(([l]) => l);
    if (repeated.length) return Math.min(...repeated);
    return Math.min(...headings.map((h) => h.level));
  }

  /** markdown 을 heading 섹션 단위로 분리. */
  function parseSections(src) {
    if (!src.trim()) return [];
    const lines = src.split('\n');
    const headings = [];
    lines.forEach((line, i) => {
      const m = HEADING_RE.exec(line);
      if (m) headings.push({ line: i, level: m[1].length, text: m[2].trim() });
    });

    const boundaries = [];
    if (headings.length) {
      const p = primaryLevel(headings);
      for (const h of headings) if (h.level <= p) boundaries.push(h.line);
      if (boundaries[0] > 0) boundaries.unshift(0);
    } else {
      boundaries.push(0);
    }

    const seen = new Map();
    function uniqueId(base) {
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      return n === 1 ? base : `${base}-${n}`;
    }
    function assignId(raw) {
      const m = HEADING_RE.exec(raw.split('\n')[0] ?? '');
      if (!m) return { id: uniqueId('intro'), level: 0, title: '도입부' };
      return { id: uniqueId(slugify(m[2].trim())), level: m[1].length, title: m[2].trim() };
    }

    const sections = [];
    for (let i = 0; i < boundaries.length; i++) {
      const start = boundaries[i];
      const end = i + 1 < boundaries.length ? boundaries[i + 1] : lines.length;
      const raw = lines.slice(start, end).join('\n').trim();
      if (!raw) continue;
      const { id, level, title } = assignId(raw);
      sections.push({ id, headingLevel: level, title, raw, html: md.render(raw) });
    }
    return sections;
  }

  /** 원본 + 섹션별 의견 → 클립보드용 markdown. */
  function buildExport(src, sections, notesBySection) {
    const lines = ['# 원본 plan', '', src, '', '# 단락별 의견'];
    for (const section of sections) {
      const sectionNotes = notesBySection[section.id];
      if (!sectionNotes || sectionNotes.length === 0) continue;
      lines.push('', `## [${section.id}]`);
      for (const note of sectionNotes) {
        const label = note.kind === 'rebuttal' ? `(반박 → ${note.targetNoteId}) ` : '';
        lines.push(`- (${note.id}) ${label}${note.text}`);
      }
    }
    return lines.join('\n');
  }

  function titleOf(src) {
    for (const line of src.split('\n')) {
      const m = /^#{1,6}\s+(.+?)\s*$/.exec(line);
      if (m) return m[1].trim();
    }
    return (src.trim().split('\n')[0] || '').slice(0, 40) || 'Untitled';
  }

  function stamp(ts) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /* ---- 실제 같은 한국어 샘플 plan.md (기능 개발 계획) ---- */
  const SAMPLE_PLAN = `# 알림 센터(Notification Center) 구현 계획

사용자가 앱 내 활동(댓글, 멘션, 시스템 공지)을 한곳에서 확인할 수 있는 알림 센터를 추가한다. MVP 는 in-app 패널 + 읽음 처리이며, push/email 은 후속 단계로 미룬다.

## 목표 및 비목표

**목표**
- 헤더 종 아이콘 → 드롭다운 패널로 최근 알림 50건 노출
- 읽음/안 읽음 상태 관리, "모두 읽음" 일괄 처리
- 멘션·댓글·시스템 3종 타입 구분 표시

**비목표(이번 범위 아님)**
- push notification / email digest
- 알림 환경설정 세분화(타입별 on·off)
- 실시간 WebSocket (초기엔 polling 30s)

## 데이터 모델

\`notifications\` 테이블을 신설한다.

\`\`\`sql
CREATE TABLE notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL,   -- 'mention' | 'comment' | 'system'
  payload     JSONB NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user_unread ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;
\`\`\`

\`payload\` 는 타입별 스키마가 다르므로 JSONB 로 두고, 렌더 시 타입별 컴포넌트가 해석한다.

## API 설계

3개의 엔드포인트를 추가한다.

- \`GET /api/notifications?cursor=&limit=50\` — 커서 페이지네이션, 최신순
- \`POST /api/notifications/:id/read\` — 단건 읽음
- \`POST /api/notifications/read-all\` — 전체 읽음

응답은 \`{ items, nextCursor, unreadCount }\` 형태. \`unreadCount\` 는 헤더 뱃지에 바로 사용한다.

## 프론트엔드 컴포넌트

- \`<NotificationBell>\` — 헤더 종 + 안 읽음 뱃지(polling 으로 count 갱신)
- \`<NotificationPanel>\` — 드롭다운, 무한 스크롤 리스트
- \`<NotificationItem>\` — 타입별 아이콘·문구·상대시간, 클릭 시 해당 리소스로 이동

상태는 React Query 로 캐시하고, 읽음 처리는 optimistic update 로 즉시 반영한다.

## 단계별 작업(Phasing)

1. 마이그레이션 + 모델/리포지토리 (0.5d)
2. API 3종 + 테스트 (1d)
3. 프론트 컴포넌트 + polling (1.5d)
4. 읽음 처리 optimistic + 엣지 케이스 (1d)
5. QA·접근성 점검 (0.5d)

총 4.5일 예상. push/email 은 별도 plan 으로 분리.

## 리스크 및 검토 필요

- polling 30s 가 트래픽에 줄 부하 — 활성 탭에서만 polling 하도록 visibilitychange 연동 필요
- JSONB payload 스키마 버저닝 전략 미정 — 타입별 버전 필드를 넣을지 결정 요망
- 안 읽음 count 정합성: read-all 직후 polling race 가능성`;

  window.MD2 = {
    md, slugify, parseSections, buildExport, titleOf, stamp,
    SAMPLE_PLAN,
  };
})();
