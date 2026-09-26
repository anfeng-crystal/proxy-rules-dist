# RuleForge 客户端覆写（V7）

| 客户端 | Pages 路径 |
|---|---|
| Bettbox | `https://anfeng-crystal.github.io/proxy-rules-dist/overrides/bettbox.override.js` |
| Clash Party（Smart-aware） | `https://anfeng-crystal.github.io/proxy-rules-dist/overrides/clash-party.override.js` |
| Clash Verge Rev | `https://anfeng-crystal.github.io/proxy-rules-dist/overrides/clash-verge-rev.override.js` |
| FlClash | `https://anfeng-crystal.github.io/proxy-rules-dist/overrides/flclash.override.js` |

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
