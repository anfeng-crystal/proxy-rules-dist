# Stash Android V7（严格覆写）

`99-core.stoverride` 使用 `proxy-groups: #!replace`，以 RuleForge 的策略组替换机场原策略组。机场的真实节点、远程代理集和 DNS/TUN 设置仍由原订阅提供。策略组卡片和境外业务组内的选项都按「节点 → 自动 → 故障转移」分段，每段地区顺序为「香港 → 台湾 → 日本 → 新加坡 → 美国」；业务组原来的默认选项仍排在首位，因此 Gemini 仍首选 `🇺🇸 美国节点`。若在 Stash「网络设置」中启用了按延迟排序，需切回配置顺序才能看到这个排列。

在 Stash「覆写 → 从 URL 安装」中安装 [99 基础策略组](https://anfeng-crystal.github.io/proxy-rules-dist/stash/modules/99-core.stoverride) 和所需业务模块，例如 [10 Gemini](https://anfeng-crystal.github.io/proxy-rules-dist/stash/modules/10-gemini.stoverride)。业务模块从上到下按 `10 → 20 → ... → 60` 排列，99 基础策略组启用并放在最下方。更新已有模块后，刷新覆写并重新连接 Stash。完整 URL 见 [模块索引](modules/index.json)。

业务模块只提供规则集及分流规则；关闭模块后，对应策略组仍由 99 基础策略组提供，但不再有该模块的独立分流规则。`🇨🇳 国内应用` 组只包含 `DIRECT`，Domestic 规则集使用该组；`GEOIP,CN` 仍直接使用 `DIRECT`。`🔗 链式中转` 由 99 基础策略组提供，默认没有业务规则使用它。旧版 `90-chain.stoverride` 地址保留为不修改配置的兼容入口。

单文件版 [ruleforge-full.stoverride](ruleforge-full.stoverride) 供不使用模块化时安装；不要与模块版同时启用。

严格模式会移除机场原策略组。如果真实节点的 `dialer-proxy` 引用机场原策略组，需先调整该依赖。给落地节点设置 `dialer-proxy: 🔗 链式中转` 时，上游组不能再选回该落地节点，以免形成环路。
