/* ===========================================================================
   flows.jsx — 신규 플로우 갤러리
   온보딩/빈 상태 · 핸드오프 강화 · 계정 sync · MCP 직접 호출 진입점
   각 플로우는 mock 디바이스/패널로 정적 제시.
   =========================================================================== */
function FlowFrame({ title, tag, children, w = 420 }) {
  return (
    <div className="flow-frame" style={{ width: w }}>
      <div className="flow-frame__bar">
        <div className="flow-frame__dots"><span/><span/><span/></div>
        <span className="flow-frame__title">{title}</span>
        {tag && <span className="flow-frame__tag">{tag}</span>}
      </div>
      <div className="flow-frame__screen">{children}</div>
    </div>
  );
}

function Flows() {
  return (
    <div className="ds-canvas">
      <div className="ds-inner">
        <header className="ds-hero">
          <h1>신규 플로우</h1>
          <p>브리프 6절의 신규 방향을 디자인 시스템 위에서 구체화한 제안입니다. 각 화면은 같은 토큰/컴포넌트를 재사용합니다.</p>
        </header>

        {/* ---------------- 온보딩 / 빈 상태 ---------------- */}
        <DSSection title="① 온보딩 · 빈 상태" desc="첫 진입 안내. 제품 가치(섹션 단위 리뷰 → 핸드오프)를 3스텝으로 압축하고, 샘플 plan 으로 즉시 체험 유도.">
          <div className="flow-stage">
            <FlowFrame title="첫 진입" tag="empty" w={560}>
              <div className="empty-hero" style={{ padding: "40px 24px" }}>
                <div className="empty-hero__art"><Icon name="doc" size={30} /></div>
                <h2 style={{ fontSize: "var(--t-20)" }}>plan 을 리뷰할 준비가 됐어요</h2>
                <p style={{ fontSize: "var(--t-13)" }}>에이전트가 만든 <span className="mono">plan.md</span> 를 붙여넣으면 섹션별 검토 흐름이 시작됩니다.</p>
                <div className="empty-steps">
                  <div className="empty-step"><div className="empty-step__n">1</div><div className="empty-step__t">붙여넣기·변환</div><div className="empty-step__d">heading 기준으로 자동 분할.</div></div>
                  <div className="empty-step"><div className="empty-step__n">2</div><div className="empty-step__t">섹션 의견</div><div className="empty-step__d">의견·반박 thread 작성.</div></div>
                  <div className="empty-step"><div className="empty-step__n">3</div><div className="empty-step__t">핸드오프</div><div className="empty-step__d">결정을 한 번에 복사.</div></div>
                </div>
                <div className="row" style={{ marginTop: 14, justifyContent: "center" }}>
                  <Button variant="primary" icon="sparkle">샘플 plan 으로 체험</Button>
                  <Button variant="default">빈 화면에서 시작</Button>
                </div>
              </div>
            </FlowFrame>

            <FlowFrame title="이력 비어있음" tag="empty · sidebar" w={300}>
              <div style={{ padding: 16 }}>
                <div className="row" style={{ marginBottom: 14 }}><Icon name="history" size={15} /><span className="pane__title">이력</span><span className="spacer"/><IconButton icon="plus" label="새 리뷰" size={15}/></div>
                <div className="flow-empty-box">
                  <Icon name="history" size={20} style={{ color: "var(--fg-subtle)" }} />
                  <div style={{ fontSize: "var(--t-12)", color: "var(--fg-muted)", lineHeight: 1.6, marginTop: 8 }}>변환한 plan 이 모두 <strong>로컬</strong>에 보관됩니다.<br/>아직 없네요 — ＋ 로 첫 리뷰를 시작하세요.</div>
                  <Button variant="default" size="sm" icon="plus" className="" >첫 plan 붙여넣기</Button>
                </div>
              </div>
            </FlowFrame>
          </div>
        </DSSection>

        {/* ---------------- 핸드오프 강화 ---------------- */}
        <DSSection title="② 핸드오프 강화" desc="복사 전에 무엇이 전달되는지 미리보기. 원본 + 결정 의견을 요약하고, 형식(markdown / 코멘트 only)을 고를 수 있게 합니다.">
          <div className="flow-stage">
            <FlowFrame title="핸드오프 미리보기" tag="modal" w={520}>
              <div style={{ padding: 18 }}>
                <div className="row" style={{ marginBottom: 12 }}>
                  <Icon name="handoff" size={16} style={{ color: "var(--accent-fg)" }} />
                  <strong style={{ fontSize: "var(--t-15)" }}>에이전트로 핸드오프</strong>
                  <span className="spacer"/>
                  <IconButton icon="x" label="닫기" />
                </div>
                <div className="row" style={{ gap: 6, marginBottom: 12 }}>
                  <Segmented size="sm" value="full" onChange={()=>{}} options={[{value:"full",label:"원본+의견"},{value:"notes",label:"의견만"},{value:"diff",label:"결정 요약"}]} />
                </div>
                <div className="handoff-preview mono">
                  <div><span className="hl-h"># 원본 plan</span></div>
                  <div className="subtle">…(알림 센터 구현 계획)…</div>
                  <div style={{ height: 8 }} />
                  <div><span className="hl-h"># 단락별 의견</span></div>
                  <div><span className="hl-s">## [api-설계]</span></div>
                  <div>- (n001) read-all race 가능성 검토 요망</div>
                  <div className="hl-r">- (n002) (반박 → n001) polling tick 으로 보정됨</div>
                  <div><span className="hl-s">## [리스크-및-검토-필요]</span></div>
                  <div>- (n003) visibilitychange 연동 필수</div>
                </div>
                <div className="row" style={{ marginTop: 14 }}>
                  <Badge tone="accent">3개 섹션 · 의견 3</Badge>
                  <span className="spacer"/>
                  <Button variant="ghost" size="sm">.md 저장</Button>
                  <Button variant="primary" size="sm" icon="copy">클립보드 복사</Button>
                </div>
              </div>
            </FlowFrame>

            <FlowFrame title="복사 완료 상태" tag="confirm" w={320}>
              <div style={{ padding: "32px 22px", textAlign: "center" }}>
                <div className="flow-success"><Icon name="check" size={26} /></div>
                <div style={{ fontSize: "var(--t-15)", fontWeight: 600, marginTop: 12 }}>핸드오프 복사 완료</div>
                <div style={{ fontSize: "var(--t-12)", color: "var(--fg-muted)", marginTop: 6, lineHeight: 1.6 }}>에이전트 채팅에 붙여넣어 결정을 전달하세요. 의견 3건이 포함되었습니다.</div>
                <div className="handoff-paste mono">$ 에이전트에 붙여넣기 ⌘V</div>
              </div>
            </FlowFrame>
          </div>
        </DSSection>

        {/* ---------------- 계정 sync ---------------- */}
        <DSSection title="③ 계정 sync (선택)" desc="local-first 를 깨지 않는 선에서의 동기화. 기본은 로컬, 로그인 시 기기 간 이력만 옵트인으로 동기화.">
          <div className="flow-stage">
            <FlowFrame title="동기화 설정" tag="settings" w={420}>
              <div style={{ padding: 18 }}>
                <div className="row" style={{ marginBottom: 14 }}><Icon name="cloud" size={16} style={{ color: "var(--accent-fg)" }}/><strong style={{ fontSize: "var(--t-15)" }}>기기 간 동기화</strong></div>
                <div className="flow-row-toggle">
                  <div><div style={{ fontSize: "var(--t-13)", fontWeight: 500 }}>로컬 우선 (기본)</div><div className="subtle" style={{ fontSize: "var(--t-12)" }}>모든 plan·의견은 이 브라우저에만 저장됩니다.</div></div>
                  <span className="flow-switch is-on" />
                </div>
                <div className="flow-row-toggle">
                  <div><div style={{ fontSize: "var(--t-13)", fontWeight: 500 }}>이력만 클라우드 동기화</div><div className="subtle" style={{ fontSize: "var(--t-12)" }}>로그인한 기기 간 plan 목록을 공유. 본문은 암호화.</div></div>
                  <span className="flow-switch" />
                </div>
                <div className="divider" />
                <div className="row"><Icon name="link" size={14} className="subtle"/><span className="subtle" style={{ fontSize: "var(--t-12)" }}>현재 기기: 이 브라우저</span><span className="spacer"/><Button variant="default" size="sm">로그인</Button></div>
              </div>
            </FlowFrame>

            <FlowFrame title="로그인" tag="auth" w={320}>
              <div style={{ padding: "28px 22px" }}>
                <div className="empty-hero__art" style={{ margin: "0 auto 16px", width: 52, height: 52 }}><Icon name="cloud" size={24}/></div>
                <div style={{ textAlign: "center", fontSize: "var(--t-15)", fontWeight: 600 }}>기기 간 이력 동기화</div>
                <div style={{ textAlign: "center", fontSize: "var(--t-12)", color: "var(--fg-muted)", margin: "6px 0 18px", lineHeight: 1.6 }}>리뷰 내용은 계속 로컬에 우선 저장됩니다.</div>
                <Button variant="default" className="flow-full-btn">GitHub 으로 계속</Button>
                <Button variant="default" className="flow-full-btn" style={{ marginTop: 8 }}>이메일로 계속</Button>
                <div className="subtle" style={{ textAlign: "center", fontSize: "var(--t-11)", marginTop: 14 }}>로그인 없이도 모든 기능을 쓸 수 있어요.</div>
              </div>
            </FlowFrame>
          </div>
        </DSSection>

        {/* ---------------- MCP 직접 호출 ---------------- */}
        <DSSection title="④ MCP 직접 호출 진입점" desc="복사·붙여넣기 왕복을 줄이는 경로. 에이전트가 MCP 로 plan 을 보내면 자동으로 리뷰 세션이 열리고, 결정도 MCP 로 회신.">
          <div className="flow-stage">
            <FlowFrame title="MCP 연결" tag="integration" w={440}>
              <div style={{ padding: 18 }}>
                <div className="row" style={{ marginBottom: 14 }}><Icon name="plug" size={16} style={{ color: "var(--accent-fg)" }}/><strong style={{ fontSize: "var(--t-15)" }}>MCP 연결</strong><span className="spacer"/><Badge tone="success"><Icon name="check" size={12}/>연결됨</Badge></div>
                <div className="mcp-card">
                  <div className="row"><span className="mcp-dot" /><span style={{ fontSize: "var(--t-13)", fontWeight: 500 }}>md2htmlreview MCP server</span><span className="spacer"/><span className="mono subtle" style={{ fontSize: "var(--t-11)" }}>localhost:7423</span></div>
                  <div className="divider" style={{ margin: "10px 0" }} />
                  <div className="mono" style={{ fontSize: "var(--t-12)", lineHeight: 1.7 }}>
                    <div><span className="hl-s">review.open</span>(plan: string) → sessionId</div>
                    <div><span className="hl-s">review.await</span>(sessionId) → decisions[]</div>
                  </div>
                </div>
                <div className="subtle" style={{ fontSize: "var(--t-12)", marginTop: 12, lineHeight: 1.6 }}>에이전트 설정에 위 서버를 추가하면 <span className="mono">plan</span> 을 바로 이 도구로 보내고, 사람이 검토를 끝내면 결정이 회신됩니다.</div>
              </div>
            </FlowFrame>

            <FlowFrame title="에이전트가 보낸 plan" tag="incoming" w={360}>
              <div style={{ padding: 18 }}>
                <div className="mcp-incoming">
                  <Icon name="sparkle" size={15} style={{ color: "var(--accent-fg)" }} />
                  <div style={{ fontSize: "var(--t-12)", color: "var(--fg-muted)" }}>Claude Code 가 리뷰를 요청했습니다</div>
                </div>
                <div className="section-card has-notes" style={{ marginTop: 12 }}>
                  <div className="section-card__head">
                    <Icon name="chevronDown" size={14} className="section-card__chev" />
                    <span className="section-card__id">#알림-센터</span>
                    <span className="section-card__title">알림 센터 구현 계획</span>
                  </div>
                  <div className="section-card__body" style={{ fontSize: "var(--t-12)", color: "var(--fg-muted)", padding: "12px 16px" }}>6개 섹션 · MCP 세션 <span className="mono">#a3f9</span></div>
                </div>
                <Button variant="primary" size="sm" icon="arrowRight" className="flow-full-btn" style={{ marginTop: 12 }}>리뷰 시작</Button>
                <Button variant="ghost" size="sm" className="flow-full-btn" style={{ marginTop: 6 }}>결정 회신 (MCP)</Button>
              </div>
            </FlowFrame>
          </div>
        </DSSection>
      </div>
    </div>
  );
}

Object.assign(window, { Flows, FlowFrame });
