# md2htmlreview

A **local-first review layer** for AI coding agent plans.

AI coding agents (Claude Code, Codex, Cursor, etc.) increasingly produce
`plan.md` artifacts in their plan / spec / design mode. **md2htmlreview**
renders those plans in the browser for paragraph-level human review and
routes the decisions back into the agent's workflow.

## Status

MVP shipped — per-block review in the browser, clipboard handoff, and a
local MCP server that lets agents submit plans and retrieve decisions without
a copy/paste round-trip (see [Agent integration (MCP)](#agent-integration-mcp)).

## Why

- Inspecting long `plan.md` in a terminal is high-friction
  ("the second section above"-style references add up).
- IDE markdown previews show but don't capture per-block decisions.
- Native LLM tools (multi-choice prompts) are too constrained for
  open-ended plan review.

## Direction

- **MVP** ✓ — Markdown → rich HTML (per-block) + per-block comments
  + handoff back to the agent (clipboard, or the MCP round-trip below).
- **MCP packaging** ✓ — a local stdio MCP server lets Claude / Codex invoke
  the review app directly, no copy/paste
  (see [Agent integration (MCP)](#agent-integration-mcp)).
- **Next** — persistent plan history (localStorage → account sync).

## Principles

- **Local-first** — your plans stay on your machine by default.
- **Agent-agnostic** — works for any AI coding agent that emits markdown plans.
- **Round-trip** — decisions flow back into the agent's loop, not just
  one-way preview.

## Review flow

The browser app is a three-pane workspace for reviewing one plan at a time:

1. **Load** a plan — paste Markdown, or open a link from the agent round-trip
   below. The plan renders as per-block cards (raw HTML in the Markdown is
   neutralized, so a plan can't inject markup).
2. **Annotate** — leave a comment on any block, or a rebuttal to an existing
   comment. Blocks with no comment are left untouched.
3. **Hand off** — the decisions export as one structured text: the original
   plan followed by per-section comments, keyed by block. Copy it to the
   clipboard, or let the agent pull it directly over MCP.

Both paths produce the same text — the clipboard handoff and MCP `get_review`
return byte-for-byte identical output.

## Agent integration (MCP)

The repo ships a single local process that speaks **MCP over stdio** (for the
agent) and serves the **review UI over HTTP** (for the human); one shared
in-memory session store bridges them. An agent submits a plan, a human reviews
it in the browser, and the agent retrieves the decisions — no copy/paste.

### 1. Build

```sh
npm install
npm run build         # review UI → dist/   (the server serves this statically)
npm run build:server  # server     → dist-server/
```

Both builds are required: the server serves the built UI from `dist/`, so an
agent-only build leaves the review page blank.

### 2. Register the MCP server (stdio)

The agent host (Claude Code, Codex, …) spawns the server over stdio. The server
serves the UI from `./dist` **relative to its working directory**, so it must
launch with the repo root as its cwd.

Project-scoped — put this in `.mcp.json` at the repo root (cwd is the repo root):

```json
{
  "mcpServers": {
    "md2htmlreview": {
      "command": "node",
      "args": ["dist-server/server/index.js"]
    }
  }
}
```

Any host / absolute path — pins the working directory regardless of where the
host launches the process:

```json
{
  "mcpServers": {
    "md2htmlreview": {
      "command": "sh",
      "args": ["-c", "cd /ABSOLUTE/PATH/TO/md2htmlreview && exec node dist-server/server/index.js"]
    }
  }
}
```

On startup the server logs the review UI address to **stderr** (stdout is
reserved for MCP JSON-RPC):

```
[md2htmlreview] 리뷰 UI: http://127.0.0.1:7391/ (local-first, 외부 전송 없음)
[md2htmlreview] MCP stdio 서버 준비 완료 (submit_plan / get_review)
```

### 3. Exposed surface

Two tools, **no resources**:

| Tool | Input | Returns |
| --- | --- | --- |
| `submit_plan` | `markdown` (required), `title?` | `{ reviewId, url, status: "pending" }` — returns immediately (non-blocking) |
| `get_review` | `reviewId` (required) | one of `{ status: "pending" }`, `{ status: "completed", review }`, `{ status: "not_found" }` |

`not_found` is a distinct signal from `pending`, so the agent never confuses
"not done yet" with "no such review".

### 4. Round-trip

1. **Agent** → `submit_plan(markdown)` → `{ reviewId, url, status: "pending" }`.
   Returns at once; the agent is not blocked while the human reviews.
2. **Human** opens `url` (`http://127.0.0.1:<port>/?review=<reviewId>`). The
   plan loads with no paste, gets reviewed per block, and the reviewer runs
   **검수 완료** (Submit review).
   *(The browser ↔ server bridge — `GET /api/reviews/:id`,
   `POST /api/reviews/:id/decision` — is an internal contract, not part of the
   MCP surface.)*
3. **Agent** polls `get_review(reviewId)` → `pending` until the human submits,
   then `completed` with `review`:

```
# 원본 plan

<the original plan markdown>

# 단락별 의견

## [section-slug]
- (note-id) <comment text>
- (note-id) (반박 → target-note-id) <rebuttal text>
```

Sections with no comment are omitted. This is the same text the clipboard
handoff produces.

### 5. Local-first & security

- **Binds `127.0.0.1` only** (SC-005) — not reachable from other machines; the
  whole round-trip works offline.
- **In-memory sessions** — submitted plans and decisions live only in the
  server process (FR-012); nothing is persisted and nothing leaves the machine.
  They vanish when the process exits.
- **Raw HTML neutralized** (FR-010) — Markdown is parsed with `html: false`, so
  a submitted plan can't inject markup into the review page.
- **Port** — default `7391`; if it is taken, the server binds an OS-assigned
  port instead. Use the `url` from `submit_plan` (or the stderr log) for the
  live address.

### Troubleshooting

- **`dist/ 빌드가 없습니다`** on the review page → run `npm run build` (the
  server serves the UI from `dist/`).
- **No logs / can't find the address** → logs and the bound URL go to
  **stderr**, not stdout (stdout carries MCP JSON-RPC only).

## License

MIT
