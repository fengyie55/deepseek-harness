---
description: "将成功的受治理查询中的原始字段展示为交互表格、图表和追溯时间线。"
kind: "package-reference"
---

# @deepseek-ai/dsh-tool-interactive-answer

[English](README.md) | 中文

## 概述

将返回的业务记录展示为表格、趋势图、帕累托图或按来源顺序排列的时间线。Agent 从成功的 JSON 查询中选择字段，不重新填写测量值。回答保留完整来源结果，包括覆盖告警和空值。该可选工具只与明确批准的来源工具一起启用。

## 目录

- [使用此包](#use-this-package)
- [了解实现](#understand-the-implementation)
- [延伸阅读](#further-exploration)
- [Model Experience](#model-experience)
- [已知限制与后续工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用此包

将插件挂载在工具和会话投影服务旁。来源工具须对同一 Agent 可用。`sourceTools` 使用精确注册名称；插件不授予数据权限，也不代替 Agent 调用来源。

```yaml
- name: '@deepseek-ai/dsh-tool-interactive-answer'
  config:
    sourceTools: [mcp__taiji__request_evidence]
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `sourceTools` | 必填 | 批准的来源工具精确名称 |
| `maxSources` | `8` | 待返回调用与已完成来源各自的最大数量 |
| `maxSourceBytes` | `65536` | 单个保留来源的最大 UTF-8 字节数，包含查询参数 |
| `maxRows` | `200` | 来源最大行数；超限时失败，不截断 |
| `maxColumns` | `12` | 最多选择的列数 |
| `maxResultBytes` | `262144` | 完整序列化回答的最大字节数 |

先执行批准的查询，再调用 `interactive_answer`，传入查询调用 ID、记录数组的属性路径和各列相对于单条记录的路径。路径是属性名或规范数组下标组成的数组；空路径选择当前值。单元格必须为标量或空值。标题和单位由 Agent 注释；工具不换算单位，也不执行业务计算。超过保留或输出限制时，缩小查询范围后重试。来源不可用错误会列出保留的工具调用 ID；结果中的请求和证据包 ID 不能用于选择来源。

挂载[客户端配套插件](../../client/ui-interactive-answer/README.zh.md)以显示交互卡片。没有该插件的客户端仍显示普通 JSON 工具结果。这些可选包不改变默认预设或 Agent 主循环。

-----

<a id="understand-the-implementation"></a>
## 了解实现

<details>
<summary>实现细节 — 点击展开</summary>

有界的宿主会话投影将批准的原生及嵌套调用与成功返回的单个 JSON 文本结果配对。恢复会话时从日志重建证据。失败、超限或已淘汰的来源需要重新查询。工具选择来源中的原始单元格，在普通工具内容和顶层展示元数据中返回完整来源快照；不新增会话事件类型。客户端从这些已记录结果派生视图。

</details>

-----

<a id="further-exploration"></a>
## 延伸阅读

- [客户端卡片](../../client/ui-interactive-answer/README.zh.md) — 选择与继续分析行为。
- [工具执行链路](../../../docs/cookbook/adding-a-tool.zh.md) — 结果与展示的归属。
- [会话投影](../../session/session-projection/README.zh.md) — 可回放的宿主状态。

<a id="model-experience"></a>
## Model Experience

### interactive_answer

#### What the model sees

`interactive_answer` 按 `sourceCallId` 选择先前查询，再选择字段和展示类型。返回值为选中的单元格与完整来源证据组成的 JSON。字段无效、来源不可用、来源报告失败或超限时返回工具错误，不生成或静默截断记录。

#### Token effect

工具 Schema 增加一项可选能力。每次结果包含选中单元格与来源快照；通过来源大小和查询范围限制重复证据的 token。展示本身不增加模型请求。用户继续分析时，将选中的原始行、查询参数、证据 ID 和结果上下文作为新用户消息发送。

#### KV Cache effect

Schema 在插件生命周期中保持稳定。结果与后续提问追加到历史，不重写先前消息。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- 来源批准属于部署策略，不代表独立核实查询的业务含义。来源没有状态字段时，不声明其覆盖完整。
- 保留空间有界；来源被淘汰后历史卡片仍可阅读，但新的展示需要重新取证。
- 时间线遵循来源顺序；趋势图间距表示观测顺序，不代表相等时间间隔。帕累托占比按返回的数值观测计算，排除空值；不认证总体覆盖率。
- 自由生成 HTML、可编辑模拟、跨回答更新和自动选图尚未提供。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

无。

</details>
