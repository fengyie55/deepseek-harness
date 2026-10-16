---
description: "deliverables 组导览：记录轮次交给用户的内容的 Host 插件，即显式文件交付与观察到的工作区改动，供浏览本组的用户与维护者阅读。"
kind: "package-group"
---

# packages/deliverables

[English](README.md) | 中文

## 概述

交付物家族让每轮对话向用户交付明确的文件、有来源依据的交互回答和工作区变更摘要。文件交付或查询记录展示使用对应工具，变更文件对比使用工作区记录器。Web 配套插件在对话中渲染结果。文件交付需要文件系统访问；工作区对比需要子进程服务和 git。

## 目录

- [包](#packages)
- [相关文档](#related-documentation)
- [开发备注](#dev-note)

-----

<a id="packages"></a>
## 包

| 包 | 角色 | ctx key |
|---|---|---|
| [`tool-interactive-answer`](tool-interactive-answer/README.zh.md) | 选择受治理查询的原始字段，展示交互表格、图表和时间线 | 注册到 `ctx.tools` |
| [`tool-present`](tool-present/README.zh.md) | 通过 `present` 工具把已有文件声明为最终交付物 | 注册到 `ctx.tools` |
| [`workspace-changes`](workspace-changes/README.zh.md) | 用 git 工作树快照和整文件捕获汇总每个顶层轮次改动的文件，并提供其对比 | 提供 `ctx.workspaceChanges`；监听 `session/event`，追加 `workspace/changes` |

-----

<a id="related-documentation"></a>
## 相关文档

- [产出物子系统](../../docs/subsystems/deliverables.zh.md)——`PresentedFile` 与 `WorkspaceChangesSummary` 的词汇、两个持久事件和摘要服务。
- [Web 产出物](../client/ui-deliverables/README.zh.md)——渲染这些事件的轮尾卡片与文件提及。
- [present 声明工作区源文件](../../.agents/notes/implemented/feature/2026-09-08-present-workspace-source-files.zh.md)——交付决策。
- [本轮改动文件卡片](workspace-changes/README.zh.md)——快照设计与覆盖规则。

-----

<a id="dev-note"></a>
## 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
