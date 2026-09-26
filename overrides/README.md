# RuleForge 客户端覆写（V7）

| 客户端 | Pages 路径 |
|---|---|
| Bettbox | `https://anfeng-crystal.github.io/proxy-rules-dist/overrides/bettbox.override.js` |
| Clash Party（Smart-aware） | `https://anfeng-crystal.github.io/proxy-rules-dist/overrides/clash-party.override.js` |
| Clash Verge Rev | `https://anfeng-crystal.github.io/proxy-rules-dist/overrides/clash-verge-rev.override.js` |
| FlClash | `https://anfeng-crystal.github.io/proxy-rules-dist/overrides/flclash.override.js` |

说明：
- 旧根路径 `clash-party-verge-rev.override.js` 建议暂时保留，避免已有客户端引用失效。
- 新安装统一使用 `overrides/` 下的客户端专用文件。
- 覆写保留订阅中的实际节点、代理集和 DNS，重建策略组与业务分流。`🇨🇳 国内应用` 组仅含 `DIRECT`，`GEOIP,CN` 也直接使用 `DIRECT`。
- 境外业务组可以直接选择地区节点、地区自动或地区故障转移；Gemini 默认选择 `🇺🇸 美国节点`。更新脚本后刷新订阅并重新连接客户端。
