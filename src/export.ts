import type { Block } from './parse';
import type { Note } from './notes';

/**
 * 원본 plan + 단락별 의견을 합쳐 클립보드용 텍스트를 만든다 (D-4, FR-007).
 * AI 가 곧장 소비 가능하고, 어느 단락의 의견인지 식별 가능한 형식.
 * 의견 없는 단락은 생략.
 */
export function buildExport(
  src: string,
  blocks: Block[],
  notes: Map<string, Note[]>,
): string {
  const lines: string[] = ['# 원본 plan', '', src, '', '# 단락별 의견'];

  for (const block of blocks) {
    const blockNotes = notes.get(block.id);
    if (!blockNotes || blockNotes.length === 0) continue;

    lines.push('', `## [${block.id}]`);
    for (const note of blockNotes) {
      const label =
        note.kind === 'rebuttal'
          ? `(반박 → ${note.targetNoteId}) `
          : '';
      lines.push(`- (${note.id}) ${label}${note.text}`);
    }
  }

  return lines.join('\n');
}
