/* ===========================================================================
   layouts.jsx — "레이아웃" 탭: 데스크톱(브라우저 프레임) + 모바일(폰) 병치
   동일 디자인 시스템·동일 useReviewState 위에서 반응형 구성을 나란히 제시.
   둘 다 seed 데이터로 라이브 — 클릭/스크롤/의견 작성 가능.
   =========================================================================== */
function Scaler({ width, height, scale }) {
  // 자리(레이아웃 박스)만 잡아주는 래퍼는 호출부에서 처리. 여기선 transform 적용 div 반환용.
  return null;
}

/* 데스크톱 앱 한 벌 (topbar + 3단 ReviewApp), 브라우저 프레임 안에서 라이브 */
function DesktopFrame() {
  const W = 1280, H = 812, S = 0.62;
  return (
    <div className="lay-scalebox" style={{ width: W * S, height: H * S }}>
      <div className="lay-scale" style={{ width: W, height: H, transform: `scale(${S})` }}>
        <ChromeWindow width={W} height={H} url="md2htmlreview.local/review"
          tabs={[{ title: "md2htmlreview — 알림 센터 구현 계획", active: true }, { title: "Claude Code" }]} activeIndex={0}>
          <div className="lay-desktop">
            <header className="topbar">
              <div className="topbar__brand">
                <span className="topbar__logo">md</span>
                <span>md2htmlreview</span>
                <span className="muted">· plan 리뷰 레이어</span>
              </div>
              <span className="topbar__spacer" />
              <nav className="tabnav">
                <button className="tabnav__item is-active">프로토타입</button>
                <button className="tabnav__item">디자인 시스템</button>
                <button className="tabnav__item">신규 플로우</button>
              </nav>
              <span style={{ width: 12 }} />
              <IconButton icon="moon" label="테마" />
            </header>
            <ReviewApp layout="three" seed={true} />
          </div>
        </ChromeWindow>
      </div>
    </div>
  );
}

/* 모바일 앱 (PhoneShell 자체 포함), 그대로 라이브 */
function MobileFrame() {
  return (
    <div className="lay-mobilebox">
      <MobileReviewApp onboarding={false} seed={true} />
    </div>
  );
}

function Layouts() {
  return (
    <div className="ds-canvas">
      <div className="ds-inner">
        <header className="ds-hero">
          <h1>반응형 레이아웃</h1>
          <p>같은 디자인 시스템·컴포넌트가 화면 폭에 따라 재구성됩니다. 데스크톱은 이력·섹션·의견을 3단으로 병치하고, 모바일은 하단 탭으로 전환하며 의견은 바텀시트로 작성합니다. 두 프레임 모두 실제로 동작합니다.</p>
        </header>

        <div className="lay-stage">
          <div className="lay-col">
            <div className="lay-label"><Icon name="doc" size={15} /> 데스크톱 <Badge tone="neutral">3단 · ≥ 1024px</Badge></div>
            <DesktopFrame />
            <div className="lay-caption">이력 사이드바 · 섹션 리스트 · 의견 패널을 한 화면에. 섹션을 고르면 우측 패널에서 바로 의견·반박을 작성하고 <Kbd>⌘</Kbd><Kbd>↵</Kbd> 로 저장합니다.</div>
          </div>

          <div className="lay-col">
            <div className="lay-label"><Icon name="comment" size={15} /> 모바일 <Badge tone="neutral">단일 컬럼 · ≤ 768px</Badge></div>
            <MobileFrame />
            <div className="lay-caption">하단 탭(리뷰·의견·새 리뷰)으로 3단을 대체. 이력은 좌측 드로우, 의견 작성은 바텀시트로 thread 를 그대로 보여줍니다.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Layouts, DesktopFrame, MobileFrame });
