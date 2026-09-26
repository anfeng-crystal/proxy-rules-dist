# RuleForge · Stash Android

Stash 官方建议按功能点拆分 Override。模块应在 Android「覆写」页面按下列顺序排列，
最上方规则优先级最高，`99 · RuleForge Core` 必须置于最底部。

推荐顺序（上 → 下）：
- 10-gemini.stoverride
- 20-ai.stoverride
- 30-youtube.stoverride
- 31-netflix.stoverride
- 32-disneyplus.stoverride
- 40-google.stoverride
- 41-github.stoverride
- 42-microsoft.stoverride
- 43-apple.stoverride
- 44-telegram.stoverride
- 45-paypal.stoverride
- 50-global-media.stoverride
- 51-global-sites.stoverride
- 60-domestic.stoverride
- 90-chain.stoverride
- 99-core.stoverride

默认启用：
- 除 `90-chain.stoverride` 外全部启用。
- `99-core.stoverride` 必须启用。
- 如果只想要部分业务分流，可关闭对应模块。
- Gemini 模块的第一策略为 `RF·🇺🇸 美国`。

重要设计：
- 不删除机场 proxies。
- 不删除机场 proxy-groups，因此机场已有 dialer-proxy 依赖不会因 RuleForge 消失。
- 不覆盖 DNS/TUN。
- 各业务模块独立创建自己的策略组、rule-provider 和 RULE-SET。
- Core 模块提供 CN 直连与 MATCH，导致机场原 rules 位于其后而不可达。
- Stash 当前 Override 不能修改数组中的既有元素，因此链式模块不能自动给已有节点写 dialer-proxy。

直接安装 URL 示例：
- Core: https://anfeng-crystal.github.io/proxy-rules-dist/stash/modules/99-core.stoverride
- Gemini: https://anfeng-crystal.github.io/proxy-rules-dist/stash/modules/10-gemini.stoverride
- 链式代理: https://anfeng-crystal.github.io/proxy-rules-dist/stash/modules/90-chain.stoverride

一键安装链接也可使用：
- https://link.stash.ws/install-override/anfeng-crystal.github.io/proxy-rules-dist/stash/modules/99-core.stoverride
