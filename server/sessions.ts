import type { Note } from '../src/notes.js';

/**
 * 에이전트가 제출한 plan 한 건의 검수 단위 (spec Key Entities).
 * 영속 비목표 — 서버 프로세스 메모리에 산다 (plan Storage). `decision` 직렬화 형식은
 * 브라우저 `NoteStore.toJSON()` 과 동일한 `Record<sectionSlug, Note[]>` 재사용 (FR-014).
 */
export interface ReviewSession {
  reviewId: string;
  source: string;
  status: 'pending' | 'completed';
  decision?: Record<string, Note[]>;
  createdAt: number;
  completedAt?: number;
}

export interface Sessions {
  /** plan 제출 → 새 pending 세션. 매 호출 새 reviewId (FR-008). */
  create(source: string): ReviewSession;
  /** 조회. 없으면 undefined (throw 아님 — FR-010). */
  get(id: string): ReviewSession | undefined;
  /** 사람 "검수 완료" → completed 전이·결정 기록. 존재 시 true, 없으면 false (FR-007/010). */
  recordDecision(id: string, notes: Record<string, Note[]>): boolean;
}

/**
 * 인메모리 세션 저장소 1개. index.ts 가 한 번 만들어 mcp·http 가 같은 인스턴스를 공유한다.
 * 팩토리(싱글턴 모듈 상태 아님)라 테스트마다 격리된 저장소를 쓴다.
 */
export function createSessions(): Sessions {
  const store = new Map<string, ReviewSession>();
  let seq = 0;

  return {
    create(source) {
      // seq 가 고유성을 보장 — 같은 source 를 빠르게 중복 제출해도 reviewId 충돌 없음 (FR-008).
      const reviewId = `r${++seq}-${Date.now().toString(36)}`;
      const session: ReviewSession = {
        reviewId,
        source,
        status: 'pending',
        createdAt: Date.now(),
      };
      store.set(reviewId, session);
      return session;
    },

    get(id) {
      return store.get(id);
    },

    recordDecision(id, notes) {
      const session = store.get(id);
      if (!session) return false;
      session.status = 'completed';
      session.decision = notes; // 의견 0건({})이어도 completed 로 전이 (FR-009)
      session.completedAt = Date.now();
      return true;
    },
  };
}
