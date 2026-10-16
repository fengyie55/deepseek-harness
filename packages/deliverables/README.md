---
description: "The deliverables group map: the Host plugins that record what a turn hands to the user, explicit file deliveries and observed workspace changes, for users and maintainers navigating the group."
kind: "package-group"
---

# packages/deliverables

English | [中文](README.zh.md)

## Summary

The deliverables family lets a turn hand users explicit files, source-backed interactive answers, and summaries of workspace changes. Choose the per-package tools for file delivery or selected query records, and the workspace recorder for changed-file comparisons. The Web companions render these results in the conversation. File delivery needs filesystem access; workspace comparisons need the subprocess service and git.

## Table of Contents

- [Packages](#packages)
- [Related documentation](#related-documentation)
- [Dev Note](#dev-note)

-----

<a id="packages"></a>
## Packages

| Package | Role | ctx key |
|---|---|---|
| [`tool-interactive-answer`](tool-interactive-answer/README.md) | Selects exact governed-query fields for interactive tables, charts, and timelines | registers on `ctx.tools` |
| [`tool-present`](tool-present/README.md) | Declares existing files as final deliverables through the `present` tool | registers on `ctx.tools` |
| [`workspace-changes`](workspace-changes/README.md) | Summarizes each top-level turn's changed files from git working-tree snapshots and whole-file captures, and serves their comparisons | provides `ctx.workspaceChanges`; listens to `session/event`, appends `workspace/changes` |

-----

<a id="related-documentation"></a>
## Related documentation

- [Deliverables subsystem](../../docs/subsystems/deliverables.md) — the `PresentedFile` and `WorkspaceChangesSummary` vocabulary, the two durable events, and the summary service.
- [Web deliverables](../client/ui-deliverables/README.md) — the turn-tail cards and file mentions that render these events.
- [Present declares workspace source files](../../.agents/notes/implemented/feature/2026-09-08-present-workspace-source-files.md) — the delivery decision.
- [Turn changed-files card](workspace-changes/README.md) — the snapshot design and coverage rules.

-----

<a id="dev-note"></a>
## Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
