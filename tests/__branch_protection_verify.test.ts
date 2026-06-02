import { describe, it, expect } from 'vitest'

// 의도적 실패 테스트 — main branch protection(ci required check) 동작 검증용 (MYHA-8).
// 이 브랜치/PR 은 머지하지 않는다: ci 가 빨강일 때 머지가 차단되는지 확인한 뒤 폐기한다.
describe('branch protection verification (intentional red)', () => {
  it('fails on purpose to drive a red ci check', () => {
    expect(1).toBe(2)
  })
})
