/* ===========================================================================
   designsystem.jsx — 토큰 레퍼런스 시트 + 컴포넌트 인벤토리
   =========================================================================== */
function Swatch({ varName, label }) {
  const [val, setVal] = React.useState("");
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) setVal(getComputedStyle(ref.current).getPropertyValue("background-color").trim());
  });
  return (
    <div className="ds-swatch">
      <div ref={ref} className="ds-swatch__chip" style={{ background: `var(${varName})` }} />
      <div className="ds-swatch__meta">
        <div className="ds-swatch__label">{label}</div>
        <div className="ds-swatch__var mono">{varName}</div>
      </div>
    </div>
  );
}

function DSSection({ title, desc, children }) {
  return (
    <section className="ds-section">
      <div className="ds-section__head">
        <h3>{title}</h3>
        {desc && <p>{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function DesignSystem() {
  return (
    <div className="ds-canvas">
      <div className="ds-inner">
        <header className="ds-hero">
          <h1>md2htmlreview · 디자인 시스템</h1>
          <p>GitHub 풍 minimal 을 기준선으로 정식화한 토큰과 컴포넌트. 라이트/다크, 악센트 팔레트, 밀도는 상단 <strong>Tweaks</strong> 에서 실시간 전환됩니다.</p>
        </header>

        <DSSection title="색상 · Neutral" desc="GitHub Primer 그레이 스케일 차용. canvas → border → fg 순으로 위계를 만듭니다.">
          <div className="ds-grid">
            <Swatch varName="--canvas" label="Canvas" />
            <Swatch varName="--canvas-subtle" label="Canvas subtle" />
            <Swatch varName="--canvas-inset" label="Canvas inset" />
            <Swatch varName="--border" label="Border" />
            <Swatch varName="--border-strong" label="Border strong" />
            <Swatch varName="--fg" label="Foreground" />
            <Swatch varName="--fg-muted" label="FG muted" />
            <Swatch varName="--fg-subtle" label="FG subtle" />
          </div>
        </DSSection>

        <DSSection title="색상 · Accent + Functional" desc="Accent 는 vendor 중립 teal 기본. Tweaks 에서 indigo/amber/rose/blue 로 스왑됩니다.">
          <div className="ds-grid">
            <Swatch varName="--accent" label="Accent" />
            <Swatch varName="--accent-emphasis" label="Accent emphasis" />
            <Swatch varName="--accent-subtle" label="Accent subtle" />
            <Swatch varName="--success" label="Success" />
            <Swatch varName="--attention" label="Attention" />
            <Swatch varName="--danger" label="Danger" />
          </div>
        </DSSection>

        <DSSection title="타이포그래피" desc="본문 14px(GitHub 기준). UI 는 시스템 산세리프, 코드/식별자는 mono.">
          <div className="ds-type-list">
            <div className="ds-type-row"><span style={{ fontSize: "var(--t-32)", fontWeight: 600 }}>제목 / Display 32</span><span className="ds-type-spec mono">32 · 600</span></div>
            <div className="ds-type-row"><span style={{ fontSize: "var(--t-24)", fontWeight: 600 }}>헤더 / Heading 24</span><span className="ds-type-spec mono">24 · 600</span></div>
            <div className="ds-type-row"><span style={{ fontSize: "var(--t-18)", fontWeight: 600 }}>서브헤더 / 18</span><span className="ds-type-spec mono">18 · 600</span></div>
            <div className="ds-type-row"><span style={{ fontSize: "var(--t-14)" }}>본문 / Body 14 — plan 의 단락과 의견은 이 크기로 읽힙니다.</span><span className="ds-type-spec mono">14 · 400</span></div>
            <div className="ds-type-row"><span style={{ fontSize: "var(--t-12)", color: "var(--fg-muted)" }}>메타 / Caption 12 — 시간·섹션 수·카운트.</span><span className="ds-type-spec mono">12 · 400</span></div>
            <div className="ds-type-row"><span className="mono" style={{ fontSize: "var(--t-13)" }}>#notification-center · n001</span><span className="ds-type-spec mono">mono 13</span></div>
          </div>
        </DSSection>

        <DSSection title="간격 · 반경 · 그림자" desc="4px 베이스 스페이싱. 반경은 GitHub 기본 6px 중심.">
          <div className="ds-row-wrap">
            {[["s-2","4"],["s-4","8"],["s-5","12"],["s-6","16"],["s-8","24"],["s-9","32"]].map(([v,px]) => (
              <div key={v} className="ds-space"><div className="ds-space__bar" style={{ width: `var(--${v})` }} /><span className="mono">{px}</span></div>
            ))}
          </div>
          <div className="ds-row-wrap" style={{ marginTop: 20 }}>
            {[["r-sm","4"],["r-md","6"],["r-lg","8"],["r-xl","12"]].map(([v,px]) => (
              <div key={v} className="ds-radius" style={{ borderRadius: `var(--${v})` }}><span className="mono">{px}</span></div>
            ))}
            <div className="ds-shadow" style={{ boxShadow: "var(--shadow-sm)" }}><span className="mono">sm</span></div>
            <div className="ds-shadow" style={{ boxShadow: "var(--shadow-md)" }}><span className="mono">md</span></div>
            <div className="ds-shadow" style={{ boxShadow: "var(--shadow-lg)" }}><span className="mono">lg</span></div>
          </div>
        </DSSection>

        <DSSection title="컴포넌트 · 버튼" desc="primary 는 accent. 삭제는 hover 시 danger 로 전환.">
          <div className="ds-demo">
            <Button variant="primary" icon="handoff">핸드오프 복사</Button>
            <Button variant="default" icon="plus">새 리뷰</Button>
            <Button variant="ghost" icon="reply">반박</Button>
            <Button variant="danger" icon="trash">삭제</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="default" size="lg">Large</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </DSSection>

        <DSSection title="컴포넌트 · 뱃지 · 세그먼트 · 입력" desc="섹션 카운트, 노트 종류, 키 단축키 표기.">
          <div className="ds-demo">
            <Badge tone="neutral">5 섹션</Badge>
            <Badge tone="accent"><Icon name="comment" size={12} />3</Badge>
            <Badge tone="success"><Icon name="check" size={12} />반영됨</Badge>
            <Badge tone="attention">반박</Badge>
            <Segmented value="three" onChange={() => {}} options={[{value:"three",label:"3단"},{value:"split",label:"분할"},{value:"single",label:"단일"}]} />
            <span className="subtle" style={{ fontSize: "var(--t-12)" }}><Kbd>⌘</Kbd><Kbd>↵</Kbd> 저장</span>
          </div>
          <div className="ds-demo" style={{ marginTop: 16, maxWidth: 380, display: "block" }}>
            <input className="input" placeholder="이력 검색…" />
            <textarea className="textarea" style={{ marginTop: 10 }} placeholder="이 섹션에 대한 의견…" />
          </div>
        </DSSection>

        <DSSection title="컴포넌트 · 섹션 카드 + 노트 thread" desc="제품의 핵심 단위. 의견이 달린 카드는 좌측에 accent 라인, 반박은 들여쓰기 + attention 라인.">
          <div className="ds-demo-pair">
            <div className="section-card has-notes" style={{ maxWidth: 420 }}>
              <div className="section-card__head">
                <Icon name="chevronDown" size={14} className="section-card__chev" />
                <span className="section-card__id">#api-설계</span>
                <span className="section-card__title">API 설계</span>
                <Badge tone="accent"><Icon name="comment" size={12} />2</Badge>
              </div>
              <div className="section-card__body md" style={{ fontSize: "var(--t-13)" }}>
                <p style={{ margin: 0 }}>3개의 엔드포인트를 추가한다. 응답은 <code>{`{ items, nextCursor, unreadCount }`}</code> 형태.</p>
              </div>
            </div>
            <div style={{ maxWidth: 340 }}>
              <NoteCard note={{ id:"n001", kind:"note", text:"read-all 직후 polling race 가능성. 서버에서 unreadCount 를 트랜잭션으로 묶는 게 안전.", ts: Date.now()-360000 }} onReply={()=>{}} onDelete={()=>{}} />
              <NoteCard note={{ id:"n002", kind:"rebuttal", targetNoteId:"n001", text:"polling 응답에 항상 최신 count 가 실리므로 다음 tick 에 자연 보정됩니다. 우선 그대로 진행.", ts: Date.now()-120000 }} onDelete={()=>{}} />
            </div>
          </div>
        </DSSection>
      </div>
    </div>
  );
}

Object.assign(window, { DesignSystem });
