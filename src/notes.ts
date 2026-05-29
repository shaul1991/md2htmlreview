export type NoteKind = 'note' | 'rebuttal';

/** 특정 단락(Block)에 달린 리뷰 의견 (FR-004/005/006). */
export interface Note {
  id: string; // "n1", "n2" … 단락 가로질러 고유
  text: string;
  kind: NoteKind;
  targetNoteId?: string; // rebuttal 일 때 대상 note (FR-006)
}

/**
 * 메모리 의견 저장소 (FR-009 휘발성, D-3).
 * Map<blockId, Note[]> + add / edit / rebut. 새 변환 시 clear().
 */
export class NoteStore {
  private byBlock = new Map<string, Note[]>();
  private blockOf = new Map<string, string>(); // noteId → blockId (edit 조회)
  private seq = 0;

  /** 단락에 새 의견 추가 (kind:note). */
  add(blockId: string, text: string): Note {
    return this.push(blockId, { id: this.nextId(), text, kind: 'note' });
  }

  /** 같은 단락의 기존 의견을 대상으로 반박 추가 (kind:rebuttal). */
  rebut(blockId: string, targetNoteId: string, text: string): Note {
    return this.push(blockId, {
      id: this.nextId(),
      text,
      kind: 'rebuttal',
      targetNoteId,
    });
  }

  /** 기존 의견 텍스트 교체 (FR-006). 없으면 undefined. */
  edit(noteId: string, text: string): Note | undefined {
    const blockId = this.blockOf.get(noteId);
    if (!blockId) return undefined;
    const note = this.byBlock.get(blockId)!.find((n) => n.id === noteId);
    if (note) note.text = text;
    return note;
  }

  /** 단락의 의견 목록 (없으면 []). */
  get(blockId: string): Note[] {
    return this.byBlock.get(blockId) ?? [];
  }

  /** export 용 스냅샷 Map. */
  toMap(): Map<string, Note[]> {
    return this.byBlock;
  }

  /** 저장소 초기화 (재변환 시). */
  clear(): void {
    this.byBlock.clear();
    this.blockOf.clear();
    this.seq = 0;
  }

  /** 영속용 직렬화 — 섹션 slug → Note[] 평면 객체 (FR-104). */
  toJSON(): Record<string, Note[]> {
    const out: Record<string, Note[]> = {};
    for (const [blockId, notes] of this.byBlock) out[blockId] = notes.map((n) => ({ ...n }));
    return out;
  }

  /** 직렬화 객체에서 복원. seq 를 기존 최대 id 너머로 맞춰 새 add 충돌 방지 (FR-104). */
  loadFrom(data: Record<string, Note[]>): void {
    this.clear();
    let maxSeq = 0;
    for (const [blockId, notes] of Object.entries(data)) {
      for (const note of notes) {
        this.push(blockId, { ...note });
        const m = /^n(\d+)$/.exec(note.id);
        if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
      }
    }
    this.seq = maxSeq;
  }

  private push(blockId: string, note: Note): Note {
    const list = this.byBlock.get(blockId) ?? [];
    list.push(note);
    this.byBlock.set(blockId, list);
    this.blockOf.set(note.id, blockId);
    return note;
  }

  private nextId(): string {
    return `n${++this.seq}`;
  }
}
