import { describe, it, expect } from 'vitest';
import { parseBlocks } from '../src/parse';

const SAMPLE = `# Title

Intro paragraph.

- item 1
- item 2

\`\`\`js
code();
\`\`\`

> quote line`;

describe('parseBlocks — 단락 분리 (FR-002, D-2)', () => {
  it('헤더·문단·리스트·코드·인용 혼합을 단락으로 분리한다', () => {
    const blocks = parseBlocks(SAMPLE);
    expect(blocks.map((b) => b.type)).toEqual([
      'heading',
      'paragraph',
      'bullet_list',
      'fence',
      'blockquote',
    ]);
  });

  it('등장 순서대로 순번 ID(p1,p2…)를 부여한다', () => {
    const blocks = parseBlocks(SAMPLE);
    expect(blocks.map((b) => b.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
  });

  it('각 블록의 sourceRange·rawMarkdown 을 보존한다 (D-2)', () => {
    const blocks = parseBlocks(SAMPLE);
    expect(blocks[0].rawMarkdown).toBe('# Title');
    expect(blocks[0].sourceRange[0]).toBe(0);
    expect(blocks[3].rawMarkdown).toContain('```js');
    expect(blocks[3].rawMarkdown).toContain('code();');
  });

  it('헤더 블록은 사람이 읽기 좋은 HTML 로 변환된다 (FR-002)', () => {
    const blocks = parseBlocks(SAMPLE);
    expect(blocks[0].html).toContain('<h1>');
    expect(blocks[0].html).toContain('Title');
  });
});

describe('parseBlocks — 빈/평문 입력 (FR-011)', () => {
  it('빈 입력은 [] 를 반환한다', () => {
    expect(parseBlocks('')).toEqual([]);
  });

  it('공백만 있는 입력은 [] 를 반환한다', () => {
    expect(parseBlocks('   \n  \n\t')).toEqual([]);
  });

  it('마크다운 문법 없는 평문은 paragraph 단락으로 렌더된다', () => {
    const blocks = parseBlocks('그냥 평문 한 줄입니다.');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[0].html).toContain('그냥 평문 한 줄입니다.');
  });
});

describe('parseBlocks — raw HTML 무력화 (FR-010, D-1)', () => {
  it('<script> 는 escape 되어 텍스트로 표시된다', () => {
    const blocks = parseBlocks('Hello <script>alert(1)</script> world');
    const html = blocks.map((b) => b.html).join('');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('<img onerror> 는 escape 되어 실행되지 않는다', () => {
    const blocks = parseBlocks('text <img src=x onerror=alert(1)> end');
    const html = blocks.map((b) => b.html).join('');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});
