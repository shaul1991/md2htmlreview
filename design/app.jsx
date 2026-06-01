/* ===========================================================================
   app.jsx — md2htmlreview 데스크탑 프로토타입 (3-pane: 이력 / 섹션 / 의견)
   상태 로직은 useReviewState 훅으로 추출 → 데스크탑/모바일이 공유.
   tweak: layout(three|split|single) 에 따라 pane 구성 변경.
   =========================================================================== */
const { useState: uS, useRef: uR, useEffect: uE, useMemo: uM, useCallback: uC } = React;

let _nid = 0;
const newNoteId = () => `n${String(++_nid).padStart(3, "0")}`;

/* ---------------------------------------------------------------------------
   useReviewState — paste→convert→sections, 섹션별 note/rebuttal, history, export
   데스크탑 ReviewApp 과 MobileReviewApp 이 동일하게 사용.
--------------------------------------------------------------------------- */
function useReviewState({ onboarding = false, seed = false } = {}) {
  const [docs, setDocs] = uS([]);
  const [activeId, setActiveId] = uS(null);
  const [notes, setNotes] = uS({});
  const [paste, setPaste] = uS("");
  const [mode, setMode] = uS(onboarding ? "empty" : "paste"); // empty|paste|review
  const [selectedSection, setSelectedSection] = uS(null);
  const [collapsed, setCollapsed] = uS({});
  const [draft, setDraft] = uS("");
  const [replyTo, setReplyTo] = uS(null);
  const [toastNode, toast] = useToast();
  const composerRef = uR(null);

  const active = docs.find((d) => d.id === activeId) || null;
  const docNotes = (active && notes[active.id]) || {};

  uE(() => {
    if (!seed) return;
    const text = window.MD2.SAMPLE_PLAN;
    const sections = window.MD2.parseSections(text);
    const id = "seed";
    const doc = { id, title: window.MD2.titleOf(text), src: text, sections, createdAt: Date.now() };
    const seedNotes = {};
    const apiSec = sections.find((s) => /api/i.test(s.id));
    if (apiSec) seedNotes[apiSec.id] = [
      { id: "n001", kind: "note", text: "read-all 직후 polling race 가능성. unreadCount 를 트랜잭션으로 묶는 게 안전합니다.", targetNoteId: null, ts: Date.now() - 360000 },
    ];
    setDocs([doc]); setActiveId(id); setNotes({ [id]: seedNotes });
    setMode("review"); setSelectedSection(apiSec?.id ?? sections[0]?.id ?? null);
  }, [seed]);

  function convert(src) {
    const text = src.trim();
    if (!text) return;
    const sections = window.MD2.parseSections(text);
    const id = "doc" + Date.now().toString(36);
    const doc = { id, title: window.MD2.titleOf(text), src: text, sections, createdAt: Date.now() };
    setDocs((d) => [doc, ...d]);
    setActiveId(id);
    setNotes((n) => ({ ...n, [id]: {} }));
    setMode("review");
    setSelectedSection(sections[0]?.id ?? null);
  }

  function addNote(sectionId, text, kind = "note", targetNoteId = null) {
    if (!text.trim() || !active) return;
    const note = { id: newNoteId(), kind, text: text.trim(), targetNoteId, ts: Date.now() };
    setNotes((all) => {
      const doc = { ...(all[active.id] || {}) };
      doc[sectionId] = [...(doc[sectionId] || []), note];
      return { ...all, [active.id]: doc };
    });
    setDraft(""); setReplyTo(null);
    toast(kind === "rebuttal" ? "반박 추가됨" : "의견 추가됨");
  }

  function deleteNote(sectionId, noteId) {
    setNotes((all) => {
      const doc = { ...(all[active.id] || {}) };
      doc[sectionId] = (doc[sectionId] || []).filter((n) => n.id !== noteId && n.targetNoteId !== noteId);
      return { ...all, [active.id]: doc };
    });
  }

  function copyHandoff() {
    if (!active) return;
    const text = window.MD2.buildExport(active.src, active.sections, docNotes);
    navigator.clipboard?.writeText(text).catch(() => {});
    toast("핸드오프 텍스트 복사됨");
  }

  const noteCount = uM(() => {
    let c = 0; for (const k in docNotes) c += docNotes[k].length; return c;
  }, [docNotes]);

  return {
    docs, activeId, setActiveId, notes, active, docNotes,
    paste, setPaste, mode, setMode, selectedSection, setSelectedSection,
    collapsed, setCollapsed, draft, setDraft, replyTo, setReplyTo,
    toastNode, toast, composerRef, convert, addNote, deleteNote, copyHandoff, noteCount,
  };
}

/* ---------------------------------------------------------------------------
   ReviewApp (데스크탑 3-pane)
--------------------------------------------------------------------------- */
function ReviewApp({ layout = "three", onboarding = false, seed = false }) {
  const st = useReviewState({ onboarding, seed });
  const {
    docs, activeId, setActiveId, notes, active, docNotes,
    paste, setPaste, mode, setMode, selectedSection, setSelectedSection,
    collapsed, setCollapsed, draft, setDraft, replyTo, setReplyTo,
    toastNode, composerRef, convert, addNote, deleteNote, copyHandoff, noteCount,
  } = st;

  /* ---------- panes ---------- */
  const historyPane = (
    <div className="pane pane--history">
      <div className="pane__head">
        <Icon name="history" size={15} />
        <span className="pane__title">이력</span>
        <span className="spacer" />
        <IconButton icon="plus" label="새 리뷰" size={15}
          onClick={() => { setMode("paste"); setPaste(""); }} />
      </div>
      <div className="pane__body pane__body--flush" style={{ padding: "8px" }}>
        {docs.length === 0 && (
          <div className="subtle" style={{ fontSize: "var(--t-12)", padding: "16px 12px", lineHeight: 1.6 }}>
            아직 변환한 plan 이 없습니다. 우측 상단 <strong>＋</strong> 로 시작하세요.
          </div>
        )}
        {docs.length > 0 && <div className="hist-group-label">최근</div>}
        {docs.map((d) => {
          const cnt = Object.values(notes[d.id] || {}).reduce((a, b) => a + b.length, 0);
          return (
            <div key={d.id} className={`hist-item ${d.id === activeId ? "is-active" : ""}`}
              onClick={() => { setActiveId(d.id); setMode("review"); setSelectedSection(d.sections[0]?.id ?? null); }}>
              <span className="hist-item__title">{d.title}</span>
              <span className="hist-item__meta">
                <span>{window.MD2.stamp(d.createdAt)}</span>
                <span>·</span>
                <span>{d.sections.length}개 섹션</span>
                {cnt > 0 && <><span>·</span><span style={{ color: "var(--accent-fg)" }}>의견 {cnt}</span></>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const centerPane = (
    <div className="pane pane--center">
      <div className="pane__head">
        {mode === "review" && active ? (
          <>
            <Icon name="doc" size={15} />
            <span className="pane__title" style={{ textTransform: "none", fontSize: "var(--t-13)", color: "var(--fg)", fontWeight: "var(--fw-semibold)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {active.title}
            </span>
            <Badge tone="neutral"><span style={{ whiteSpace: "nowrap" }}>{active.sections.length} 섹션</span></Badge>
            <Button variant="primary" size="sm" icon="handoff" onClick={copyHandoff}>핸드오프 복사</Button>
          </>
        ) : (
          <>
            <Icon name="doc" size={15} />
            <span className="pane__title">plan 입력</span>
          </>
        )}
      </div>
      <div className="pane__body">
        {mode === "empty" && (
          <div className="empty-hero">
            <div className="empty-hero__art"><Icon name="doc" size={32} /></div>
            <h2>plan 을 리뷰할 준비가 됐어요</h2>
            <p>AI 코딩 에이전트가 만든 <span className="mono">plan.md</span> 를 붙여넣으면<br/>제목(heading) 단위로 쪼개 섹션별로 의견을 남기고, 그 결정을 다시 에이전트로 넘길 수 있습니다.</p>
            <div className="empty-steps">
              <div className="empty-step"><div className="empty-step__n">1</div><div className="empty-step__t">붙여넣기 · 변환</div><div className="empty-step__d">plan.md 텍스트를 붙여넣고 변환하면 heading 기준으로 섹션이 나뉩니다.</div></div>
              <div className="empty-step"><div className="empty-step__n">2</div><div className="empty-step__t">섹션별 의견</div><div className="empty-step__d">각 단락에 의견·반박을 달아 thread 로 검토 흐름을 만듭니다.</div></div>
              <div className="empty-step"><div className="empty-step__n">3</div><div className="empty-step__t">핸드오프 복사</div><div className="empty-step__d">원본 + 결정 의견을 한 번에 복사해 에이전트에게 그대로 전달합니다.</div></div>
            </div>
            <div className="row" style={{ marginTop: "12px" }}>
              <Button variant="primary" size="lg" icon="plus" onClick={() => { setMode("paste"); setPaste(window.MD2.SAMPLE_PLAN); }}>샘플 plan 으로 시작</Button>
              <Button variant="default" size="lg" onClick={() => { setMode("paste"); setPaste(""); }}>빈 화면에서 시작</Button>
            </div>
          </div>
        )}

        {mode === "paste" && (
          <div className="paste-wrap">
            <textarea className="paste-area" value={paste} placeholder="여기에 plan.md 를 붙여넣으세요…  (# 제목 기준으로 섹션이 나뉩니다)"
              onChange={(e) => setPaste(e.target.value)} spellCheck={false} />
            <div className="paste-bar">
              <Button variant="primary" size="md" icon="arrowRight" disabled={!paste.trim()} onClick={() => convert(paste)}>변환</Button>
              <Button variant="ghost" size="md" onClick={() => setPaste(window.MD2.SAMPLE_PLAN)}>샘플 채우기</Button>
              <span className="spacer" />
              <span className="subtle" style={{ fontSize: "var(--t-12)" }}>{paste.length.toLocaleString()}자 · local-first, 서버 전송 없음</span>
            </div>
          </div>
        )}

        {mode === "review" && active && (
          <div className="section-stack">
            {active.sections.map((s) => {
              const cnt = (docNotes[s.id] || []).length;
              const isCol = collapsed[s.id];
              return (
                <div key={s.id}
                  className={`section-card ${selectedSection === s.id ? "is-selected" : ""} ${cnt ? "has-notes" : ""} ${isCol ? "is-collapsed" : ""}`}
                  onClick={() => setSelectedSection(s.id)}>
                  <div className="section-card__head"
                    onClick={(e) => { e.stopPropagation(); setSelectedSection(s.id); setCollapsed((c) => ({ ...c, [s.id]: !c[s.id] })); }}>
                    <Icon name="chevronDown" size={14} className="section-card__chev" />
                    <span className="section-card__id">#{s.id}</span>
                    <span className="section-card__title">{s.title}</span>
                    {cnt > 0 && <Badge tone="accent"><Icon name="comment" size={12} />{cnt}</Badge>}
                    <div className="section-card__actions">
                      <IconButton icon="comment" label="이 섹션에 의견" size={14}
                        onClick={(e) => { e.stopPropagation(); setSelectedSection(s.id); setReplyTo(null); setTimeout(() => composerRef.current?.focus(), 0); }} />
                    </div>
                  </div>
                  <div className="section-card__body md" dangerouslySetInnerHTML={{ __html: s.html }} />
                </div>
              );
            })}
            <div style={{ height: "40px" }} />
          </div>
        )}
      </div>
    </div>
  );

  const selSection = active?.sections.find((s) => s.id === selectedSection) || null;

  const notesPane = (
    <div className="pane pane--notes">
      <div className="pane__head">
        <Icon name="comment" size={15} />
        <span className="pane__title">의견</span>
        {noteCount > 0 && <Badge tone="accent">{noteCount}</Badge>}
        <span className="spacer" />
        {noteCount > 0 && <IconButton icon="copy" label="핸드오프 복사" size={15} onClick={copyHandoff} />}
      </div>
      <div className="pane__body" style={{ display: "flex", flexDirection: "column" }}>
        {!active && <div className="notes-empty"><div className="notes-empty__icon"><Icon name="comment" size={22} /></div><div>plan 을 변환하면<br/>여기에 섹션별 의견이 모입니다.</div></div>}
        {active && noteCount === 0 && !selSection && (
          <div className="notes-empty"><div className="notes-empty__icon"><Icon name="comment" size={22} /></div><div>섹션을 선택하고<br/>의견을 남겨보세요.</div></div>
        )}

        {active && (
          <>
            {Object.keys(docNotes).filter((sid) => docNotes[sid].length).map((sid) => {
              const sec = active.sections.find((x) => x.id === sid);
              const list = docNotes[sid];
              const roots = list.filter((n) => n.kind !== "rebuttal");
              const rebut = (rootId) => list.filter((n) => n.kind === "rebuttal" && n.targetNoteId === rootId);
              return (
                <div className="note-group" key={sid}>
                  <div className="note-group__head">
                    <span className="note-group__sid">#{sid}</span>
                    <span className="note-group__title">{sec?.title}</span>
                  </div>
                  {roots.map((n) => (
                    <React.Fragment key={n.id}>
                      <NoteCard note={n} onReply={() => { setSelectedSection(sid); setReplyTo({ sectionId: sid, noteId: n.id }); setTimeout(() => composerRef.current?.focus(), 0); }} onDelete={() => deleteNote(sid, n.id)} />
                      {rebut(n.id).map((rb) => (
                        <NoteCard key={rb.id} note={rb} onDelete={() => deleteNote(sid, rb.id)} />
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              );
            })}

            {selSection && (
              <div className="note-composer">
                {replyTo && (
                  <div className="row" style={{ fontSize: "var(--t-12)", color: "var(--attention)", marginBottom: "4px" }}>
                    <Icon name="reply" size={13} /> {replyTo.noteId} 에 반박 작성 중
                    <IconButton icon="x" label="취소" size={12} onClick={() => setReplyTo(null)} />
                  </div>
                )}
                <div className="subtle" style={{ fontSize: "var(--t-11)", marginBottom: "5px" }}>
                  <span className="mono" style={{ color: "var(--accent-fg)" }}>#{selSection.id}</span> · {selSection.title}
                </div>
                <textarea ref={composerRef} className="textarea" value={draft} placeholder={replyTo ? "반박 의견…" : "이 섹션에 대한 의견…"}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") addNote(selSection.id, draft, replyTo ? "rebuttal" : "note", replyTo?.noteId); }} />
                <div className="note-composer__row">
                  <Button variant="primary" size="sm" icon={replyTo ? "reply" : "plus"}
                    disabled={!draft.trim()}
                    onClick={() => addNote(selSection.id, draft, replyTo ? "rebuttal" : "note", replyTo?.noteId)}>
                    {replyTo ? "반박 추가" : "의견 추가"}
                  </Button>
                  <span className="spacer" />
                  <span className="subtle" style={{ fontSize: "var(--t-11)" }}><Kbd>⌘</Kbd><Kbd>↵</Kbd> 저장</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className={`workspace workspace--${layout}`}>
      {layout !== "single" && historyPane}
      {centerPane}
      {layout === "three" && notesPane}
      {toastNode}
    </div>
  );
}

function NoteCard({ note, onReply, onDelete }) {
  const isReb = note.kind === "rebuttal";
  return (
    <div className={`note ${isReb ? "note--rebuttal" : ""}`}>
      <div className="note__head">
        {isReb && <Icon name="reply" size={13} style={{ color: "var(--attention)" }} />}
        <span className={`note__kind note__kind--${note.kind}`}>{isReb ? "반박" : "의견"}</span>
        <span className="note__id">{note.id}{isReb ? ` → ${note.targetNoteId}` : ""}</span>
        <div className="note__actions">
          {!isReb && onReply && <IconButton icon="reply" label="반박" size={13} onClick={onReply} />}
          <IconButton icon="trash" label="삭제" size={13} onClick={onDelete} />
        </div>
      </div>
      <div className="note__text">{note.text}</div>
      <div className="note__time">{window.MD2.stamp(note.ts)}</div>
    </div>
  );
}

Object.assign(window, { ReviewApp, NoteCard, useReviewState });
