# md2htmlreview — 디자인 산출물

`docs/design-brief.md` 를 기준으로 정식화한 **디자인 시스템 + 리디자인 프로토타입 + 반응형 레이아웃** 입니다.
빌드가 필요 없습니다 — `index.html` 을 브라우저로 열면 됩니다 (React + Babel standalone + markdown-it 를 CDN 으로 로드).

## 탭 구성

| 탭 | 내용 |
|---|---|
| 프로토타입 | 3단(이력·섹션·의견) 라이브 리뷰. 붙여넣기 → 변환 → 섹션별 의견/반박 → 핸드오프 복사 |
| 레이아웃 | 데스크톱(브라우저 프레임 3단) + 모바일(폰 셸: 앱바·하단탭·드로우·바텀시트) 병치 |
| 디자인 시스템 | 색·타입·간격·반경·그림자 토큰 + 컴포넌트 인벤토리 |
| 신규 플로우 | 온보딩/빈 상태 · 핸드오프 강화 · 계정 sync · MCP 진입점 |

## 디자인 방향

- GitHub Primer 풍 미니멀 기준선, **vendor 중립 teal** 기본 악센트
- 라이트/다크 동등 지원, 악센트 5종 · 밀도 3단 · 폰트 2종을 토큰으로 스왑 (상단 Tweaks)
- 한국어 UI, 실제 같은 한국어 샘플 `plan.md`(알림 센터 구현 계획) 내장

## 파일

```
tokens.css          토큰 (색·타입·간격·반경·테마·악센트·밀도)
components.css      공통 컴포넌트 스타일
pages.css           디자인 시스템 시트 / 플로우 갤러리
mobile.css          모바일 + 레이아웃 탭
lib.js              markdown 파싱·섹션 분할·export·샘플 plan (parse.ts/export.ts 포팅)
ui.jsx              아이콘·버튼·뱃지·세그먼트 등 프리미티브
app.jsx             useReviewState 훅 + 데스크톱 3단 앱
mobile.jsx          모바일 앱 + 폰 셸
browser-window.jsx  데스크톱 브라우저 프레임
layouts.jsx         레이아웃 탭(데스크톱·모바일 병치)
designsystem.jsx    토큰 레퍼런스 시트
flows.jsx           신규 플로우 갤러리
tweaks-panel.jsx    Tweaks 패널 셸
index.html          진입점
```

데스크톱/모바일은 동일한 `useReviewState` 훅과 디자인 토큰을 공유하므로 같은 상태·로직 위에서 동작합니다.

> 참고: 디자인/프로토타입 산출물이며 프로덕션 앱 코드와 독립적입니다. 채택 시 토큰·컴포넌트를 실제 빌드 스택으로 옮기면 됩니다.
