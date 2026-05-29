import { describe, it, expect } from 'vitest';
import { buildExport } from '../src/export';
import { parseBlocks } from '../src/parse';
import type { Note } from '../src/notes';

const SRC = `# Title

Intro paragraph.

- item 1`;

function noteMap(entries: Record<string, Note[]>): Map<string, Note[]> {
  return new Map(Object.entries(entries));
}

describe('buildExport — 합본 텍스트 (D-4, FR-007)', () => {
  it('원본 plan 과 단락별 의견 섹션을 포함한다', () => {
    const blocks = parseBlocks(SRC);
    const out = buildExport(SRC, blocks, noteMap({
      p1: [{ id: 'n1', text: '제목이 모호함', kind: 'note' }],
    }));
    expect(out).toContain('# 원본 plan');
    expect(out).toContain(SRC);
    expect(out).toContain('# 단락별 의견');
    expect(out).toContain('## [p1]');
    expect(out).toContain('제목이 모호함');
  });

  it('의견 없는 단락은 출력에서 생략한다', () => {
    const blocks = parseBlocks(SRC);
    const out = buildExport(SRC, blocks, noteMap({
      p2: [{ id: 'n1', text: '문단 의견', kind: 'note' }],
    }));
    expect(out).toContain('## [p2]');
    expect(out).not.toContain('## [p1]');
    expect(out).not.toContain('## [p3]');
  });

  it('반박 note 는 대상(targetNoteId)을 식별 가능하게 출력한다 (FR-006)', () => {
    const blocks = parseBlocks(SRC);
    const out = buildExport(SRC, blocks, noteMap({
      p1: [
        { id: 'n1', text: '원 의견', kind: 'note' },
        { id: 'n2', text: '반박합니다', kind: 'rebuttal', targetNoteId: 'n1' },
      ],
    }));
    expect(out).toContain('원 의견');
    expect(out).toContain('반박합니다');
    expect(out).toMatch(/반박.*n1/);
  });

  it('의견이 전혀 없으면 원본만 담고 단락 헤더는 없다', () => {
    const blocks = parseBlocks(SRC);
    const out = buildExport(SRC, blocks, noteMap({}));
    expect(out).toContain('# 원본 plan');
    expect(out).toContain(SRC);
    expect(out).not.toContain('## [');
  });
});
