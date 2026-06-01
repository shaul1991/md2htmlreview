# Quickstart — 003 검증 절차

## 실행
```bash
npm install        # 신규 의존성 없음 (기존과 동일)
npm run dev        # Vite dev 서버
```

## 자동 테스트 (순수 모듈, TDD)
```bash
npm test           # vitest run
```
변경 모듈별 성공 기준:
- **parse.test**: 모든 Section 에 비어있지 않은 `title` — heading 섹션=heading 텍스트, intro=fallback("도입").
- **notes.test**: `add`/`rebut` 이 `ts` 부여. `delete(noteId)` 가 그 노트 + 대상 반박 제거. `loadFrom` 이 `ts` 보존.
  (`edit` 제거 반영 — 검수에서 보존 결정 시 테스트도 되돌림.)
- **export.test**: 픽스처 Note 에 `ts` 추가 후, `buildExport` 출력 형식 **불변**(회귀 0, SC-003).
- **storage.test**: `ts` 포함 Note 저장/복원 정상.

## 빌드
```bash
npm run build      # tsc 타입체크 + vite build → dist/
```
기준: 타입 에러 0, 빌드 성공.

## 수동 검증 (Playwright MCP, FR/SC)
`npm run dev` 후 `mcp__plugin_playwright_playwright__*` 로:
1. 첫 진입(저장 없음) → **온보딩 빈 상태**(`.empty-hero`) 표시 (FR-003).
2. "샘플로 시작" → paste 모드 → 변환 → **3-pane** + 섹션 카드 (FR-001/004, US1).
3. 섹션 카드 헤더 토글 → 접힘/펼침(`is-collapsed`), 카드 클릭 → `is-selected` (FR-006/007, US2).
4. 작성기로 의견 추가 → 노트 pane 에 그룹 표시, 섹션 카드에 `has-notes` + 카운트 뱃지 (FR-008/009/011, US3).
5. 의견에 "반박" → `note--rebuttal` 스레드, 삭제 → 제거 (FR-010).
6. 새로고침 → 활성 문서·노트 복원 (FR-012, US1-3).
7. 핸드오프 복사 → 클립보드에 원본 + 섹션별 의견 (FR-014, US4).
8. 이력 pane 에서 다른 문서 전환·삭제 (FR-013).
9. OS 다크 모드 → 다크 토큰 적용, 라이트도 가독 (FR-016).
10. design 프로토타입(`design/index.html` 프로토타입 탭)과 시각 대조 (SC-004).

## 회귀 가드 (SC-003)
- 002 기능: 섹션 분할, 반박, 다중 문서 이력, 클립보드 핸드오프, markdown raw HTML 비실행 — 모두 동작.
- (인라인 편집은 D-5 결정에 따라 제거 — 검수 통과 시 의도된 변경)
