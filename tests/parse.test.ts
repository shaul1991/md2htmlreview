import { describe, it, expect } from 'vitest';
import { parseSections, slugify } from '../src/parse';

// 주 섹션 레벨 P=2 (## 가 2회) → ## 마다 분할, ### 는 접힘
const FOLD = `# Doc Title

intro para.

## Section A

para a.

### Sub A1

deep content.

## Section B

para b.`;

describe('parseSections — heading 섹션 분할 + 하위 heading 접기 (FR-101)', () => {
  it('주 섹션 레벨(##)마다 끊고 ### 는 그 안에 접는다', () => {
    const secs = parseSections(FOLD);
    expect(secs.map((s) => s.id)).toEqual(['doc-title', 'section-a', 'section-b']);
    expect(secs.map((s) => s.headingLevel)).toEqual([1, 2, 2]);
  });

  it('접힌 하위 heading 본문이 부모 섹션 HTML 에 포함된다', () => {
    const secs = parseSections(FOLD);
    const a = secs.find((s) => s.id === 'section-a')!;
    expect(a.html).toContain('Sub A1');
    expect(a.html).toContain('<h3');
    expect(a.html).toContain('deep content');
  });

  it('단위 ID 는 그 단위 첫 heading 의 slug (FR-102)', () => {
    const secs = parseSections(FOLD);
    expect(secs[0].id).toBe('doc-title');
    expect(secs[0].html).toContain('<h1');
  });
});

describe('parseSections — intro / 평문 / 빈 입력 (FR-103/109)', () => {
  it('선두 heading 없는 내용은 intro 단위', () => {
    const secs = parseSections('plain intro line.\n\n## Only Section\n\nbody.');
    expect(secs.map((s) => s.id)).toEqual(['intro', 'only-section']);
  });

  it('heading 이 전혀 없는 평문 → intro 단위 하나', () => {
    const secs = parseSections('그냥 평문\n\n두 번째 줄.');
    expect(secs).toHaveLength(1);
    expect(secs[0].id).toBe('intro');
    expect(secs[0].html).toContain('그냥 평문');
  });

  it('빈/공백 입력 → []', () => {
    expect(parseSections('')).toEqual([]);
    expect(parseSections('   \n\t\n')).toEqual([]);
  });
});

describe('parseSections — slug 충돌 / 한글 / raw HTML (FR-102/108)', () => {
  it('같은 heading 텍스트는 -2 suffix 로 구분', () => {
    const secs = parseSections('## Notes\n\na\n\n## Notes\n\nb');
    expect(secs.map((s) => s.id)).toEqual(['notes', 'notes-2']);
  });

  it('한글 heading slug 보존', () => {
    expect(slugify('요구 사항')).toBe('요구-사항');
    const secs = parseSections('## 요구사항\n\n내용');
    expect(secs[0].id).toBe('요구사항');
  });

  it('raw HTML 은 escape 되어 실행되지 않는다', () => {
    const secs = parseSections('## Title\n\n<script>alert(1)</script>');
    const html = secs.map((s) => s.html).join('');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
