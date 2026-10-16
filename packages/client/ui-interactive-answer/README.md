---
description: "Explore source-backed answers and continue analysis from a selected original record."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-interactive-answer

English | [中文](README.zh.md)

## Summary

Explore returned records in a filterable table, trend, Pareto chart, or source-ordered trace timeline. Select a record to continue analysis in its owning conversation. Query arguments, source evidence, and coverage warnings remain available beside the answer. This optional companion renders the host tool's recorded results without calling another visualization model.

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

Mount the browser plugin alongside the standard Conversation, Tool UI, locale, and Session controller plugins. Enable [the host tool](../../deliverables/tool-interactive-answer/README.md) in the same profile with explicit approved source names.

```yaml
- name: '@deepseek-ai/dsh-client-ui-interactive-answer'
```

Use a matching [Chat build](../ui-chat/README.md#grouped-rendering) with group-tree placement support. Result cards declare `groupTree: 'turn'` to remain outside the process disclosure.

No configuration fields. Use the answer's table filter to find a returned record; charts retain the complete returned series. Analyze selection queues an ordinary user prompt in the card's owning Session. Source row indexes remain stable through filtering and Pareto sorting. A failed admission keeps the card visible and permits retry. View the original query and result to inspect time ranges, units, raw values, and coverage limitations.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The plugin derives a standalone Chat node from each validated `interactive_answer` result. It validates persisted result metadata, or the complete JSON content of a nested call, before drawing a card. Unsupported versions, malformed rows, and failed results retain raw tool text. Local filter and pending-action state belong to the mounted card. Follow-ups use the retained Session scope's Conversation service, preserving ordinary admission and authorization.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Host tool](../../deliverables/tool-interactive-answer/README.md) — source selection and bounds.
- [Conversation](../../../docs/subsystems/conversation.md) — Session-driven views and input.
- [Slots](../../../docs/subsystems/slots.md) — keyed registrations and disposal.

<a id="model-experience"></a>
## Model Experience

### Conversation follow-up

#### What the model sees

No model-visible tool or prompt contributions. Model schemas and answer content belong to [the host tool](../../deliverables/tool-interactive-answer/README.md#model-experience). User-clicked follow-ups append a normal user message with the selected source record and query context; mounting or rendering a card makes no model request.

#### Token effect

Rendering `interactive_answer` adds no prompt or schema tokens. A clicked follow-up includes the selected row and source context.

#### KV Cache effect

Follow-ups append ordinary user messages; existing history is unchanged.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Filters apply to the record list; charts show all returned observations. Trend spacing is ordinal, and lines stop at null measurements. The table remains available for exact values.
- Timeline entries retain source order and literal time labels; the plugin does not infer timezones or assert current production position.
- Selection state is local to the card. Arbitrary generated scripts, cross-card updates, and automatic model synchronization of local controls are absent.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
