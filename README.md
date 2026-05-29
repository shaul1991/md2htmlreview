# md2htmlreview

A **local-first review layer** for AI coding agent plans.

AI coding agents (Claude Code, Codex, Cursor, etc.) increasingly produce
`plan.md` artifacts in their plan / spec / design mode. **md2htmlreview**
renders those plans in the browser for paragraph-level human review and
routes the decisions back into the agent's workflow.

## Status

Early — concept defined, implementation pending.

## Why

- Inspecting long `plan.md` in a terminal is high-friction
  ("the second section above"-style references add up).
- IDE markdown previews show but don't capture per-block decisions.
- Native LLM tools (multi-choice prompts) are too constrained for
  open-ended plan review.

## Direction

- **MVP**: Markdown → rich HTML (per-block) + per-block comments
  + handoff back to the agent (clipboard for now).
- **Then**: persist plan history (localStorage → account).
- **Then**: MCP packaging so Claude / Codex can invoke it directly
  without a copy/paste round-trip.

## Principles

- **Local-first** — your plans stay on your machine by default.
- **Agent-agnostic** — works for any AI coding agent that emits markdown plans.
- **Round-trip** — decisions flow back into the agent's loop, not just
  one-way preview.

## License

MIT
