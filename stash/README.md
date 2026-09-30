# Stash Android V8（严格覆写）

`99-core.stoverride` 使用 `proxy-groups: #!replace`，以 RuleForge 的策略组替换机场原策略组。机场的真实节点、远程代理集和 DNS/TUN 设置仍由原订阅提供。策略组卡片和境外业务组内的选项都按「节点 → 自动 → 故障转移」分段，每段地区顺序为「香港 → 台湾 → 日本 → 新加坡 → 美国」；业务组原来的默认选项仍排在首位，因此 Gemini 仍首选 `🇺🇸 美国节点`。若在 Stash「网络设置」中启用了按延迟排序，需切回配置顺序才能看到这个排列。

在 Stash「覆写 → 从 URL 安装」中安装 [99 基础策略组](https://anfeng-crystal.github.io/proxy-rules-dist/stash/modules/99-core.stoverride) 和所需业务模块，例如 [10 Gemini](https://anfeng-crystal.github.io/proxy-rules-dist/stash/modules/10-gemini.stoverride)。覆写列表从上到下必须按以下顺序排列：

`99-core → 60 → 51 → 50 → 45 → 44 → 43 → 42 → 41 → 40 → 32 → 31 → 30 → 20 → 10`

不需要的业务模块可以关闭或省略，但 `99-core` 必须启用并置顶。根据 [Stash 官方覆写语法](https://stash.wiki/configuration/override)，覆写从上到下依次应用，数组默认插到原数组前面。因此 Core 先用 `rules: #!replace` 清除机场原分流规则，再由业务模块依次前插；最终业务规则优先级是 `10 → 20 → 30 → 31 → 32 → 40 → 41 → 42 → 43 → 44 → 45 → 50 → 51 → 60 → Core`，最后才进入 `MATCH,🐟 漏网之鱼`。

从 V7 升级时，必须同时更新 Core 和手动调整已安装模块的排列；仅刷新 URL 不会替你调整列表顺序。更新后刷新覆写并重新连接 Stash。完整 URL 见 [模块索引](modules/index.json)。

业务模块只提供规则集及分流规则；关闭模块后，对应策略组仍由 99 基础策略组提供，但不再有该模块的独立分流规则。`🇨🇳 国内应用` 组只包含 `DIRECT`，Domestic 规则集使用该组；`GEOIP,CN` 仍直接使用 `DIRECT`。`🔗 链式中转` 由 99 基础策略组提供，默认没有业务规则使用它。旧版 `90-chain.stoverride` 是不修改配置的兼容入口，不需要安装。

单文件版 [ruleforge-full.stoverride](ruleforge-full.stoverride) 供不使用模块化时安装；不要与模块版同时启用。V8 的 Core、单文件版和模块索引标记为 `2026.09.30-v8`；未改变的业务模块仍保留其原版本号。

地区节点、自动、故障转移及全部节点组会过滤“流量 / 到期 / 套餐”等订阅信息伪节点。过滤只影响组内选项，原订阅的真实节点、远程代理集以及 DNS/TUN 配置不会被改写。香港节点组仍直接包含香港自动、香港故障转移和实际香港节点，没有额外手动组。

### 本地回归检查

安装 PyYAML 后，在仓库根目录执行 `python3 -m unittest discover -s stash/tests -v`。测试覆盖 YAML/JSON、组引用与顺序、模块合并顺序、全部业务模块开关组合以及伪节点过滤；不替代 Android 设备上的导入和实际网络测试。

严格模式会移除机场原策略组。如果真实节点的 `dialer-proxy` 引用机场原策略组，需先调整该依赖。给落地节点设置 `dialer-proxy: 🔗 链式中转` 时，上游组不能再选回该落地节点，以免形成环路。

