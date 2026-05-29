import type { Section } from './parse';
import type { Note } from './notes';

/**
 * 원본 plan + 섹션별 의견을 합쳐 클립보드용 텍스트를 만든다 (D-5, FR-107).
 * AI 가 곧장 소비 가능하고, 어느 섹션(slug)의 의견인지 식별 가능한 형식.
 * 의견 없는 섹션은 생략.
 */
export function buildExport(
  src: string,
  sections: Section[],
  notes: Map<string, Note[]>,
): string {
  const lines: string[] = ['# 원본 plan', '', src, '', '# 단락별 의견'];

  for (const section of sections) {
    const sectionNotes = notes.get(section.id);
    if (!sectionNotes || sectionNotes.length === 0) continue;

    lines.push('', `## [${section.id}]`);
    for (const note of sectionNotes) {
      const label =
        note.kind === 'rebuttal'
          ? `(반박 → ${note.targetNoteId}) `
          : '';
      lines.push(`- (${note.id}) ${label}${note.text}`);
    }
  }

  return lines.join('\n');
}
