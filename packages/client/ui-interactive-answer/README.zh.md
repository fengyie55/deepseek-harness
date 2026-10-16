---
description: "探索有来源依据的回答，并从选中的原始记录继续分析。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-interactive-answer

[English](README.md) | 中文

## 概述

通过可筛选表格、趋势图、帕累托图或按来源顺序排列的追溯时间线探索返回记录。选中记录后在其所属对话继续分析。回答保留查询参数、来源证据和覆盖告警。该可选插件渲染宿主工具记录的结果，不调用额外的可视化模型。

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

将浏览器插件与标准对话、工具 UI、语言和会话控制插件一起挂载。在同一 Profile 中启用[宿主工具](../../deliverables/tool-interactive-answer/README.zh.md)，并明确批准来源名称。

```yaml
- name: '@deepseek-ai/dsh-client-ui-interactive-answer'
```

使用支持独立结果展示的配套 [Chat 构建](../ui-chat/README.zh.md#grouped-rendering)。

没有配置字段。使用记录筛选查找已返回记录；图表保留完整返回序列。“继续分析”将普通用户提问排入卡片所属会话。来源行号在筛选和帕累托排序后保持不变。发送失败时保留卡片并允许重试。可展开原始查询和结果，检查时间范围、单位、原始值与覆盖限制。

-----

<a id="understand-the-implementation"></a>
## 了解实现

<details>
<summary>实现细节 — 点击展开</summary>

插件从每个通过校验的 `interactive_answer` 结果派生独立的 Chat 节点。绘制卡片前校验持久化结果元数据或嵌套调用的完整 JSON 内容。不支持的版本、无效记录和失败结果保留原始工具文本。本地筛选与发送状态归已挂载卡片所有。后续提问使用已保留会话作用域的对话服务，保留常规准入与授权。

</details>

-----

<a id="further-exploration"></a>
## 延伸阅读

- [宿主工具](../../deliverables/tool-interactive-answer/README.zh.md) — 来源选择与限制。
- [对话](../../../docs/subsystems/conversation.zh.md) — 会话驱动的视图与输入。
- [插槽](../../../docs/subsystems/slots.zh.md) — 键控注册与卸载。

<a id="model-experience"></a>
## Model Experience

### Conversation follow-up

#### What the model sees

不贡献模型可见工具或提示词。模型 Schema 和回答内容归[宿主工具](../../deliverables/tool-interactive-answer/README.zh.md#model-experience)所有。用户点击继续分析时追加包含选中来源记录与查询上下文的普通用户消息；挂载或渲染卡片不产生模型请求。

#### Token effect

渲染 `interactive_answer` 不增加提示词或 Schema token。点击继续分析会发送选中行与来源上下文。

#### KV Cache effect

后续提问追加普通用户消息，不改写既有历史。

## 已知限制与后续工作

<a id="known-limitations-and-deferred-work"></a>

- 筛选仅作用于记录列表；图表显示全部返回观测。趋势图间距按观测顺序排列，遇到空值时断线。可通过表格查看精确值。
- 时间线保留来源顺序与原始时间标签；插件不推断时区，也不声明当前生产位置。
- 选择状态仅保留在当前卡片。没有自由生成脚本、跨卡片更新或向模型自动同步本地控件的功能。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

无。

</details>
