import MarkdownIt from 'markdown-it';

/** 의견 첨부 단위 = markdown-it top-level 블록 1개 (D-2). */
export interface Block {
  id: string; // "p1", "p2" … 등장 순서 (D-2)
  type: string; // markdown-it block type: heading | paragraph | bullet_list | fence | …
  sourceRange: [number, number]; // [startLine, endLine] — markdown-it token.map (end 배타적)
  rawMarkdown: string; // 원본 슬라이스 (export 용)
  html: string; // 사람이 읽기 좋은 HTML (FR-002)
}

// html:false → raw HTML escape 되어 텍스트로 표시 (FR-010, D-1). sanitize 의존성 불필요.
const md = new MarkdownIt({ html: false, linkify: true });

/**
 * markdown 원본을 top-level 블록 배열로 분리한다 (D-2).
 * 빈/공백 입력 → [] (FR-011). 평문은 paragraph 블록으로 자연 렌더 (FR-011).
 */
export function parseBlocks(src: string): Block[] {
  if (!src.trim()) return [];

  const env = {};
  const tokens = md.parse(src, env);
  const lines = src.split('\n');
  const blocks: Block[] = [];

  let depth = 0;
  let group: typeof tokens = [];

  for (const token of tokens) {
    if (depth === 0) group = [];
    group.push(token);
    depth += token.nesting; // open:+1, close:-1, self-contained:0

    if (depth === 0) {
      const first = group[0];
      const mapped = group.find((t) => t.map);
      const range: [number, number] = mapped?.map
        ? [mapped.map[0], mapped.map[1]]
        : [0, lines.length];

      blocks.push({
        id: `p${blocks.length + 1}`,
        type: first.type.replace(/_open$/, ''),
        sourceRange: range,
        rawMarkdown: lines.slice(range[0], range[1]).join('\n').trimEnd(),
        html: md.renderer.render(group, md.options, env),
      });
    }
  }

  return blocks;
}
