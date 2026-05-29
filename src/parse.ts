import MarkdownIt from 'markdown-it';

/** heading 기준으로 끊은 검수 단위 (002 FR-101). */
export interface Section {
  id: string; // heading slug (FR-102). heading 없는 선두 평문은 "intro" (FR-103)
  headingLevel: number; // 1..6, heading 없는 intro 는 0
  raw: string; // 원본 슬라이스 (export 용)
  html: string; // 사람이 읽기 좋은 HTML (FR-002). md.render → html:false 로 escape (FR-108)
}

// html:false → raw HTML escape (FR-108). sanitize 의존성 불필요.
const md = new MarkdownIt({ html: false, linkify: true });

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;

/** heading 텍스트 → slug (FR-102). 한글 보존(\p{L}), 충돌 처리는 호출부. */
export function slugify(text: string): string {
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

interface Heading {
  line: number;
  level: number;
  text: string;
}

/** 주 섹션 레벨 P = 2회↑ 등장하는 가장 얕은 레벨, 없으면 등장한 가장 얕은 레벨 (D-1). */
function primaryLevel(headings: Heading[]): number {
  const counts = new Map<number, number>();
  for (const h of headings) counts.set(h.level, (counts.get(h.level) ?? 0) + 1);
  const repeated = [...counts.entries()].filter(([, c]) => c >= 2).map(([l]) => l);
  if (repeated.length) return Math.min(...repeated);
  return Math.min(...headings.map((h) => h.level));
}

/**
 * markdown 을 heading 섹션 단위로 분리한다 (FR-101/102/103).
 * 레벨 ≤ P 인 heading 마다 분할, 더 깊은 heading 은 그 단위에 접어 넣는다.
 * 빈/공백 → [] (FR-109). heading 없는 평문 → "intro" 단위 하나 (FR-103/109).
 */
export function parseSections(src: string): Section[] {
  if (!src.trim()) return [];

  const lines = src.split('\n');
  const headings: Heading[] = [];
  lines.forEach((line, i) => {
    const m = HEADING_RE.exec(line);
    if (m) headings.push({ line: i, level: m[1].length, text: m[2].trim() });
  });

  // 단위의 시작 라인 경계 계산
  const boundaries: number[] = [];
  if (headings.length) {
    const p = primaryLevel(headings);
    for (const h of headings) if (h.level <= p) boundaries.push(h.line);
    // 첫 경계 이전에 내용이 있으면 선두(intro) 단위
    if (boundaries[0] > 0) boundaries.unshift(0);
  } else {
    boundaries.push(0); // heading 없음 → 전체가 intro
  }

  const seen = new Map<string, number>();
  const assignId = (raw: string): { id: string; level: number } => {
    const m = HEADING_RE.exec(raw.split('\n')[0] ?? '');
    if (!m) return { id: uniqueId('intro'), level: 0 };
    return { id: uniqueId(slugify(m[2].trim())), level: m[1].length };
  };
  function uniqueId(base: string): string {
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  }

  const sections: Section[] = [];
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i];
    const end = i + 1 < boundaries.length ? boundaries[i + 1] : lines.length;
    const raw = lines.slice(start, end).join('\n').trim();
    if (!raw) continue;
    const { id, level } = assignId(raw);
    sections.push({ id, headingLevel: level, raw, html: md.render(raw) });
  }

  return sections;
}
