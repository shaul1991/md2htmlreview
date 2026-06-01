/* ===========================================================================
   mobile.jsx — MobileReviewApp + PhoneShell
   데스크탑과 동일한 useReviewState 훅을 공유. 모바일 패턴(앱바·하단탭·드로우·시트).
   =========================================================================== */
const { useState: mS, useRef: mR, useEffect: mE } = React;

function PhoneShell({ children, dark }) {
  const now = new Date();
  const hh = now.getHours(), mm = String(now.getMinutes()).padStart(2, "0");
  const clock = `${((hh + 11) % 12) + 1}:${mm}`;
  return (
    <div className="phone">
      <div className="phone__notch" />
      <div className="phone__screen">
        <div className="m-status">
          <span>{clock}</span>
          <span className="m-status__right">
            <span className="m-status__bars"><i/><i/><i/><i/></span>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ opacity: .9 }}><path d="M1 5.5a9 9 0 0 1 14 0M3.5 8a5.5 5.5 0 0 1 9 0M6 10.5a2 2 0 0 1 4 0"/></svg>
            <span className="m-batt" />
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function MobileReviewApp({ onboarding = true, seed = false }) {
  const st = useReviewState({ onboarding, seed });
  const {
    docs, activeId, setActiveId, notes, active, docNotes,
    paste, setPaste, mode, setMode, selectedSection, setSelectedSection,
    draft, setDraft, replyTo, setReplyTo,
    toastNode, convert, addNote, deleteNote, copyHandoff, noteCount,
  } = st;

  const [tab, setTab] = mS("review");        // review | notes
  const [drawer, setDrawer] = mS(false);
  const [sheet, setSheet] = mS(false);
  const sheetRef = mR(null);

  function openComposer(sid, reply = null) {
    setSelectedSection(sid); setReplyTo(reply); setSheet(true);
    setTimeout(() => sheetRef.current?.focus(), 120);
  }
  function submitNote() {
    if (!draft.trim() || !selectedSection) return;
    addNote(selectedSection, draft, replyTo ? "rebuttal" : "note", replyTo?.noteId);
    setSheet(false);
  }

  const selSection = active?.sections.find((s) => s.id === selectedSection) || null;

  /* ---------- onboarding ---------- */
  if (mode === "empty") {
    return (
      <PhoneShell>
        <div className="m-app">
          <div className="m-appbar"><span className="m-appbar__title">md2htmlreview</span></div>
          <div className="m-body">
            <div className="m-empty">
              <div className="m-empty__art"><Icon name="doc" size={26} /></div>
              <h2>plan 리뷰 시작</h2>
              <p>에이전트가 만든 <span className="mono">plan.md</span> 를 붙여넣으면 섹션별로 검토할 수 있어요.</p>
              <div className="m-steps">
                <div className="m-step"><div className="m-step__n">1</div><div><div className="m-step__t">붙여넣기·변환</div><div className="m-step__d">heading 기준 자동 분할.</div></div></div>
                <div className="m-step"><div className="m-step__n">2</div><div><div className="m-step__t">섹션 의견</div><div className="m-step__d">의견·반박 thread 작성.</div></div></div>
                <div className="m-step"><div className="m-step__n">3</div><div><div className="m-step__t">핸드오프</div><div className="m-step__d">결정을 한 번에 복사.</div></div></div>
              </div>
              <Button variant="primary" size="lg" icon="sparkle" className="m-full" onClick={() => { setPaste(window.MD2.SAMPLE_PLAN); setMode("paste"); }}>샘플 plan 으로 체험</Button>
              <Button variant="default" size="md" className="m-full" onClick={() => { setPaste(""); setMode("paste"); }}>빈 화면에서 시작</Button>
            </div>
          </div>
        </div>
      </PhoneShell>
    );
  }

  /* ---------- paste ---------- */
  if (mode === "paste") {
    return (
      <PhoneShell>
        <div className="m-app">
          <div className="m-appbar">
            {docs.length > 0 && <IconButton icon="chevronRight" label="뒤로" size={16} style={{ transform: "rotate(180deg)" }} onClick={() => setMode("review")} />}
            <span className="m-appbar__title">plan 입력</span>
          </div>
          <div className="m-paste">
            <textarea className="m-paste__area" value={paste} placeholder="plan.md 를 붙여넣으세요… (# 제목 기준 분할)" onChange={(e) => setPaste(e.target.value)} spellCheck={false} />
            <div className="subtle" style={{ fontSize: "var(--t-11)" }}>{paste.length.toLocaleString()}자 · local-first, 서버 전송 없음</div>
            <div className="m-fab-row">
              <Button variant="ghost" size="md" onClick={() => setPaste(window.MD2.SAMPLE_PLAN)}>샘플</Button>
              <Button variant="primary" size="md" icon="arrowRight" className="m-full" disabled={!paste.trim()} onClick={() => convert(paste)}>변환</Button>
            </div>
          </div>
        </div>
      </PhoneShell>
    );
  }

  /* ---------- review ---------- */
  return (
    <PhoneShell>
      <div className="m-app">
        <div className="m-appbar">
          <IconButton icon="menu" label="이력" size={18} onClick={() => setDrawer(true)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="m-appbar__title">{active ? active.title : "리뷰"}</div>
            {active && <div className="m-appbar__sub">{active.sections.length}개 섹션 · 의견 {noteCount}</div>}
          </div>
          <IconButton icon="handoff" label="핸드오프 복사" size={18} onClick={copyHandoff} />
        </div>

        <div className="m-body">
          {tab === "review" && active && (
            <div className="m-sections">
              {active.sections.map((s) => {
                const cnt = (docNotes[s.id] || []).length;
                return (
                  <div key={s.id} className={`m-section ${cnt ? "has-notes" : ""}`}>
                    <div className="m-section__head">
                      <span className="m-section__id">#{s.id}</span>
                      <span className="m-section__title">{s.title}</span>
                      {cnt > 0 && <Badge tone="accent"><Icon name="comment" size={11} />{cnt}</Badge>}
                    </div>
                    <div className="m-section__body md" style={{ fontSize: "var(--t-13)" }} dangerouslySetInnerHTML={{ __html: s.html }} />
                    <div className="m-section__foot">
                      <Button variant="default" size="sm" icon="comment" onClick={() => openComposer(s.id)}>의견 달기</Button>
                    </div>
                  </div>
                );
              })}
              <div style={{ height: 16 }} />
            </div>
          )}

          {tab === "notes" && active && (
            <div className="m-notes">
              {noteCount === 0 && (
                <div className="notes-empty" style={{ minHeight: 360 }}>
                  <div className="notes-empty__icon"><Icon name="comment" size={22} /></div>
                  <div>아직 의견이 없어요.<br/>리뷰 탭에서 섹션에 의견을 달아보세요.</div>
                </div>
              )}
              {Object.keys(docNotes).filter((sid) => docNotes[sid].length).map((sid) => {
                const sec = active.sections.find((x) => x.id === sid);
                const list = docNotes[sid];
                const roots = list.filter((n) => n.kind !== "rebuttal");
                const rebut = (rootId) => list.filter((n) => n.kind === "rebuttal" && n.targetNoteId === rootId);
                return (
                  <div className="note-group" key={sid}>
                    <div className="note-group__head"><span className="note-group__sid">#{sid}</span><span className="note-group__title">{sec?.title}</span></div>
                    {roots.map((n) => (
                      <React.Fragment key={n.id}>
                        <NoteCard note={n} onReply={() => openComposer(sid, { sectionId: sid, noteId: n.id })} onDelete={() => deleteNote(sid, n.id)} />
                        {rebut(n.id).map((rb) => <NoteCard key={rb.id} note={rb} onDelete={() => deleteNote(sid, rb.id)} />)}
                      </React.Fragment>
                    ))}
                  </div>
                );
              })}
              {noteCount > 0 && <Button variant="primary" size="md" icon="handoff" className="m-full" style={{ marginTop: 8 }} onClick={copyHandoff}>핸드오프 복사</Button>}
            </div>
          )}
        </div>

        {/* bottom tab bar */}
        <div className="m-tabbar">
          <button className={`m-tab ${tab === "review" ? "is-active" : ""}`} onClick={() => setTab("review")}>
            <Icon name="doc" size={20} /><span>리뷰</span>
          </button>
          <button className={`m-tab ${tab === "notes" ? "is-active" : ""}`} onClick={() => setTab("notes")}>
            <Icon name="comment" size={20} />{noteCount > 0 && <span className="m-tab__badge">{noteCount}</span>}<span>의견</span>
          </button>
          <button className="m-tab" onClick={() => { setMode("paste"); setPaste(""); }}>
            <Icon name="plus" size={20} /><span>새 리뷰</span>
          </button>
        </div>

        {/* history drawer */}
        {drawer && (
          <>
            <div className="m-drawer-scrim" onClick={() => setDrawer(false)} />
            <div className="m-drawer">
              <div className="m-drawer__head">
                <Icon name="history" size={15} /><span className="pane__title">이력</span>
                <span className="spacer" />
                <IconButton icon="x" label="닫기" size={16} onClick={() => setDrawer(false)} />
              </div>
              <div className="m-drawer__body">
                {docs.length === 0 && <div className="subtle" style={{ fontSize: "var(--t-12)", padding: 12 }}>아직 변환한 plan 이 없습니다.</div>}
                {docs.map((d) => {
                  const cnt = Object.values(notes[d.id] || {}).reduce((a, b) => a + b.length, 0);
                  return (
                    <div key={d.id} className={`hist-item ${d.id === activeId ? "is-active" : ""}`}
                      onClick={() => { setActiveId(d.id); setMode("review"); setSelectedSection(d.sections[0]?.id ?? null); setDrawer(false); }}>
                      <span className="hist-item__title">{d.title}</span>
                      <span className="hist-item__meta"><span>{window.MD2.stamp(d.createdAt)}</span><span>·</span><span>{d.sections.length}개 섹션</span>{cnt > 0 && <><span>·</span><span style={{ color: "var(--accent-fg)" }}>의견 {cnt}</span></>}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* bottom sheet composer */}
        {sheet && selSection && (
          <>
            <div className="m-sheet-scrim" onClick={() => setSheet(false)} />
            <div className="m-sheet">
              <div className="m-sheet__grip" />
              {replyTo && (
                <div className="row" style={{ fontSize: "var(--t-12)", color: "var(--attention)", marginBottom: 6 }}>
                  <Icon name="reply" size={13} /> {replyTo.noteId} 에 반박 <span className="spacer" />
                  <IconButton icon="x" label="취소" size={13} onClick={() => setReplyTo(null)} />
                </div>
              )}
              <div className="m-sheet__title"><span className="mono">#{selSection.id}</span> · {selSection.title}</div>
              <textarea ref={sheetRef} className="textarea" style={{ minHeight: 84 }} value={draft} placeholder={replyTo ? "반박 의견…" : "이 섹션에 대한 의견…"} onChange={(e) => setDraft(e.target.value)} />
              <div className="m-fab-row" style={{ marginTop: 10 }}>
                <Button variant="ghost" size="md" onClick={() => setSheet(false)}>취소</Button>
                <Button variant="primary" size="md" icon={replyTo ? "reply" : "plus"} className="m-full" disabled={!draft.trim()} onClick={submitNote}>{replyTo ? "반박 추가" : "의견 추가"}</Button>
              </div>
            </div>
          </>
        )}

        {toastNode}
      </div>
    </PhoneShell>
  );
}

function MobilePreview() {
  return (
    <div className="device-stage">
      <MobileReviewApp onboarding={false} seed={true} />
      <div className="device-caption">
        <h3>모바일 레이아웃</h3>
        <p>데스크탑 3단을 모바일 1단 흐름으로 재구성했습니다. 같은 상태·로직을 공유합니다.</p>
        <ul>
          <li>상단 앱바 · 좌측 <strong>이력 드로우</strong></li>
          <li>하단 탭: 리뷰 / 의견 / 새 리뷰</li>
          <li>의견 작성은 <strong>바텀 시트</strong></li>
          <li>섹션 카드는 풀폭 스택</li>
          <li>핸드오프는 앱바 우측 아이콘</li>
        </ul>
      </div>
    </div>
  );
}

Object.assign(window, { MobileReviewApp, MobilePreview, PhoneShell });
