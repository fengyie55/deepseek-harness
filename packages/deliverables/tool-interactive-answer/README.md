---
description: "Display exact fields from successful governed queries as interactive tables, charts, and trace timelines."
kind: "package-reference"
---

# @deepseek-ai/dsh-tool-interactive-answer

English | [中文](README.zh.md)

## Summary

Show returned business records as tables, trends, Pareto charts, or source-ordered timelines. The agent selects fields from a successful JSON query instead of supplying replacement measurements. Complete source results accompany the answer, including coverage warnings and null values. Enable this optional tool only alongside explicitly approved source tools.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount the plugin beside the tools and session-projection services. The source tools must be available to the same agent. Use exact registered names in `sourceTools`; the plugin never grants data access or calls a source on the agent's behalf.

```yaml
- name: '@deepseek-ai/dsh-tool-interactive-answer'
  config:
    sourceTools: [mcp__taiji__request_evidence]
```

| Field | Default | Meaning |
|---|---|---|
| `sourceTools` | required | Exact approved source tool names |
| `maxSources` | `8` | Maximum pending calls and settled sources, each |
| `maxSourceBytes` | `65536` | Maximum UTF-8 bytes of one retained source, including query arguments |
| `maxRows` | `200` | Maximum source rows; excess fails without truncation |
| `maxColumns` | `12` | Maximum selected columns |
| `maxResultBytes` | `262144` | Maximum complete serialized answer bytes |

Call the approved query first, then call `interactive_answer` with its call id, a property path to the row array, and column paths relative to each row. A path is an array of property names or canonical array indexes; an empty path selects the current value. Selected cells must be scalar or null. Titles and units are agent annotations; the tool performs no unit conversion or business calculation. Query narrower data when retention or output limits reject a result. An unavailable source error lists retained tool call ids; document request and bundle ids cannot select a source.

Mount [the client companion](../../client/ui-interactive-answer/README.md) for interactive cards. Clients without it retain the ordinary JSON tool result. These opt-in packages do not change shipped presets or the agent loop.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

A bounded host-only Session projection pairs approved native and nested calls with successful single-JSON-text outcomes. Resume rebuilds evidence from the log. Failed, oversized, or evicted sources require another query. The tool selects exact source cells and returns a complete source snapshot in ordinary tool content and top-level presentation metadata; it adds no Session event type. The client derives its view from those recorded results.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Client cards](../../client/ui-interactive-answer/README.md) — selection and follow-up behavior.
- [Tool pipeline](../../../docs/cookbook/adding-a-tool.md) — result and presentation ownership.
- [Session projections](../../session/session-projection/README.md) — replayable host state.

<a id="model-experience"></a>
## Model Experience

### interactive_answer

#### What the model sees

`interactive_answer` selects an earlier query by `sourceCallId` and chooses fields and a display kind. It returns the selected cells and complete source evidence as JSON. Invalid fields, unavailable sources, reported source failures, and exceeded bounds return tool errors rather than fabricated or silently truncated records.

#### Token effect

The tool schema adds one optional capability. Each result includes the selected cells and source snapshot; bound source size and query scope to control repeated evidence tokens. The display itself makes no extra model request. A user's follow-up sends its selected original row, query arguments, evidence id, and envelope context as a new user message.

#### KV Cache effect

The schema remains stable for the plugin lifetime. Results and follow-ups append history without rewriting earlier messages.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Source approval is deployment policy, not independent verification of a query's business meaning. Missing source status is not a completeness claim.
- Retention is bounded; historical cards remain readable after their source is evicted, but a new display requires fresh evidence.
- Timeline order follows the source; trend spacing follows observation order and does not imply equal elapsed time. Pareto percentages use returned numeric observations, excluding nulls; they do not certify population coverage.
- Arbitrary generated HTML, editable simulations, cross-answer updates, and automatic chart selection are deferred.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
