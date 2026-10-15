# RuleForge 客户端覆写（V7 · 2026.09.30）

| 客户端 | Pages 路径 |
|---|---|
| Bettbox | `https://anfeng-crystal.github.io/proxy-rules-dist/overrides/bettbox.override.js` |
| Clash Party（Smart-aware） | `https://anfeng-crystal.github.io/proxy-rules-dist/overrides/clash-party.override.js` |
| Clash Verge Rev | `https://anfeng-crystal.github.io/proxy-rules-dist/overrides/clash-verge-rev.override.js` |
| FlClash | `https://anfeng-crystal.github.io/proxy-rules-dist/overrides/flclash.override.js` |

### FlClash v0.9.0（2026.10.15 核对）

官方 v0.9.0 移除的是旧版可视化「自定义覆写」，订阅配置的 JavaScript「脚本扩展」仍使用 `main(config)`，本仓库的 FlClash JS 地址继续有效，无需改成自定义配置或更换订阅。

1. 打开「进阶配置 → 脚本」，点击「＋ → 通过 URL 导入」，填入上表的 `flclash.override.js` 地址。
2. 打开「配置」，在目标机场订阅的菜单选择「扩展」，将「扩展模式」设为「脚本」，再在「扩展脚本」选中刚导入的脚本。退出扩展页后应用。
3. 已经绑定此脚本的订阅：在「脚本」列表中打开该脚本的菜单，选择「同步」。当前使用它的订阅会重新应用；随后检查代理组和实际联网情况。`.js` 地址是脚本资源，不是机场订阅 URL。

本次仅补齐 NTP 依赖保留：订阅中的 `ntp.dialer-proxy` 如果引用机场策略组，会连同其依赖组保留；与 RuleForge 组同名时同步改写为机场别名，避免 NTP 留下失效引用。业务分流、地区顺序、Gemini 默认美国、国内直连等现有行为不变。

设置优先级需留意：
- 脚本先运行，FlClash 再叠加应用设置。普通订阅的 DNS 按「进阶配置 → DNS」勾选的键覆盖，没有单独的 DNS 总覆写开关；未勾选的键沿用订阅/脚本。若原配置未启用 DNS，客户端还会补入内置 DNS 基线。
- 普通订阅的 NTP、sniffer 沿用订阅/脚本；新版自定义配置中的 NTP/sniffer 编辑器是另一条配置路径。TUN 的应用管理字段仍由客户端最终设置。
- 在应用 DNS 设置中填写代理组名时，请使用脚本输出后存在的组名；这一阶段在脚本之后，脚本无法修复随后新增的机场组引用。
- 只有原先使用可视化「自定义覆写」的配置需要按上游说明重建为「自定义配置」。已有脚本绑定会迁移保留。

已通过 103 项 Node.js 回归及 QuickJS 执行检查；未代替设备上的升级、导入和联网实测。

核对依据：[v0.9.0 发布说明](https://github.com/chen08209/FlClash/releases/tag/v0.9.0)、[脚本执行入口](https://github.com/chen08209/FlClash/blob/03f955382409a4a7ac1f3f92e46d9fcc6d39f106/lib/providers/actions/setup.dart#L401-L469)、[普通订阅设置选择](https://github.com/chen08209/FlClash/blob/03f955382409a4a7ac1f3f92e46d9fcc6d39f106/lib/providers/state/profile.dart#L45-L90)、[最终配置合并](https://github.com/chen08209/FlClash/blob/03f955382409a4a7ac1f3f92e46d9fcc6d39f106/lib/common/task.dart#L214-L312)。

### Clash Party 导入与启用

1. 在 Clash Party 左侧打开「覆写」，将上表的 `clash-party.override.js` 地址粘贴到「输入覆写 URL」，点击「导入」。导入后应出现类型为 `JavaScript` 的 `clash-party.override.js`。
2. 打开「订阅管理」，在目标机场订阅的菜单中选择「编辑信息」，于「覆写」选择刚导入的脚本并保存。若该订阅仍选用旧版 RuleForge 覆写，先取消旧版，避免两份脚本互相覆盖。
3. 刷新该订阅，再查看运行时配置或代理组。浏览器直接打开 `.js` 地址只会显示源码；该地址不是机场订阅，不能在「订阅管理」中作为订阅 URL 导入。

策略组卡片和业务组内的地区选项均按「节点 → 自动 → 故障转移」分段排列，每段地区顺序为「香港 → 台湾 → 日本 → 新加坡 → 美国」。各业务组原来的默认选项仍排在首位。Clash Party 若在「代理组与节点 → 显示设置 → 排序」选择了「名称」或「延迟」，界面会重新排序；选择「默认」才能按覆写脚本的顺序显示。

说明：
- 旧根路径 `clash-party-verge-rev.override.js` 建议暂时保留，避免已有客户端引用失效。
- 新安装统一使用 `overrides/` 下的客户端专用文件。
- 覆写保留订阅中的实际节点、代理集和 DNS，重建策略组与业务分流。`🇨🇳 国内应用` 组仅含 `DIRECT`，`GEOIP,CN` 也直接使用 `DIRECT`。
- 境外业务组可以直接选择地区节点、地区自动或地区故障转移；Gemini 默认选择 `🇺🇸 美国节点`。更新脚本后刷新订阅并重新连接客户端。

- 现有链式依赖与内置策略组同名时，保留机场别名并改写引用；直接重复应用同一份覆写不会重复生成链式组或 Clash Party 内核包装。
- 保留代理集下载/中转、DNS 服务器代理及 DNS/TUN/sniffer 引用的原规则集和必要策略组。同名依赖仅重命名并同步引用，不覆盖 RuleForge 业务规则；未引用的旧规则集仍会移除。
- 2026.09.30 已对照 Bettbox v1.19.3 稳定版源码及 v1.19.4-pre1 的同一覆写入口检查，并通过 Node.js 回归测试；源码核对和本地回归不替代设备上的导入与联网测试。

### 本地回归检查

使用 Node.js 18+，在仓库根目录运行 `node --test overrides/tests/test_overrides.js`。覆盖四客户端的空配置、内联节点、代理集、选项开关、DNS/TUN 保留、同名依赖、DNS/规则集引用、Clash Party 包装及重复应用检查。
