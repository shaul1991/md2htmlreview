import { describe, it, expect } from 'vitest';
import { buildExport } from '../src/export';
import { parseSections } from '../src/parse';
import type { Note } from '../src/notes';

// ## 가 2회 → P=2 → [plan](H1+intro), [goals], [risks]
const SRC = `# Plan

Intro.

## Goals

g.

## Risks

r.`;

function noteMap(entries: Record<string, Note[]>): Map<string, Note[]> {
  return new Map(Object.entries(entries));
}

describe('buildExport — 합본 텍스트, slug 식별자 (FR-107)', () => {
  it('원본 + 섹션별 의견(## [slug])을 포함한다', () => {
    const secs = parseSections(SRC);
    const out = buildExport(SRC, secs, noteMap({
      goals: [{ id: 'n1', text: '목표가 모호함', kind: 'note', ts: 0 }],
    }));
    expect(out).toContain('# 원본 plan');
    expect(out).toContain(SRC);
    expect(out).toContain('# 단락별 의견');
    expect(out).toContain('## [goals]');
    expect(out).toContain('목표가 모호함');
  });

  it('의견 없는 섹션은 생략한다', () => {
    const secs = parseSections(SRC);
    const out = buildExport(SRC, secs, noteMap({
      risks: [{ id: 'n1', text: '리스크 의견', kind: 'note', ts: 0 }],
    }));
    expect(out).toContain('## [risks]');
    expect(out).not.toContain('## [goals]');
    expect(out).not.toContain('## [plan]');
  });

  it('반박 note 는 대상(targetNoteId)을 식별 가능하게 출력한다 (FR-106)', () => {
    const secs = parseSections(SRC);
    const out = buildExport(SRC, secs, noteMap({
      goals: [
        { id: 'n1', text: '원 의견', kind: 'note', ts: 0 },
        { id: 'n2', text: '반박합니다', kind: 'rebuttal', targetNoteId: 'n1', ts: 0 },
      ],
    }));
    expect(out).toContain('원 의견');
    expect(out).toMatch(/반박.*n1/);
  });
});
