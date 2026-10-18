# RuleForge → Throne Android 2.0.3（原生完整配置适配层）

本目录为 **Throne 专用**、与 `overrides/flclash.override.js` 分离的适配器。它复用 `sing-box/generate_sfa.py` 的 RuleForge 规则排序、DNS 和业务策略映射；只实现订阅输入、节点格式适配及 Throne TUN 入口特性，不复制或修改各业务规则。

## 支持与限制

- 输入：**原生 sing-box JSON**（`outbounds` 或出站数组）、**Clash/Mihomo YAML/JSON**（`proxies`）、HTTPS 订阅 URL；多个机场可以合并，重名节点稳定追加 `[2]`。Clash YAML 需要 `PyYAML`。
- 目前支持 Clash 的 SS、Trojan、VMess、VLESS、Hysteria2、TUIC、SOCKS5、HTTP 节点及部分 WS/gRPC/H2/HTTPUpgrade 传输、TLS/uTLS/Reality。**不是通用订阅转换器**：不支持的节点或传输默认报错，不会静默忽略。确需忽略时显式使用 `--allow-skip`。暂不支持订阅中的代理链、插件、任意订阅脚本、WireGuard 节点、v2ray URI/base64 链接文本等。
- 输出：**包含真实节点凭据**的 Sing-box 完整 JSON；策略组包括 `节点选择`、`全部节点`、地区手动/自动、`Gemini`、`AI`、`YouTube`、`GitHub`、`SpeedTest`、`国内应用`、`漏网之鱼` 等，使用 `sing-box/<类别>/<类别>.json` 远程 source 规则。Gemini 规则在 AI 之前，Gemini 默认美国、国内应用仅直连。`澳门`、`印度` 等未单独识别的节点仍在 `全部节点` 和 `其他` 候选中，不会丢掉。
- `urltest` 默认每 600 秒探测，支持自定义 `--test-url` 与 `--test-interval`；不伪造 Sing-box 不提供的有序故障转移；不引入 NetworkTest。
- Throne 2.0.3 的普通机场订阅导入**只读取节点**，会忽略分流配置；这个适配层生成的 **完整 JSON 必须作为「自定义配置 → Sing-box 完整配置」**导入，不能作为普通机场订阅导入。**当前 Throne 不会自动将新机场订阅重新组合到已有完整 JSON**：机场更新后需重新运行生成器并将新文件重新导入。远程分类规则的更新独立由 Sing-box 管理。
- Throne 会清理完整配置中自定义的 `experimental.clash_api`；此脚本不开放控制端口，不承诺在 Throne 内用外部 Dashboard 控制所有分组。使用内置状态功能并以设备实际运行结果为准。

## 使用

在**私有设备/环境**中获取仓库源文件并执行。不要将真实订阅 URL、凭据、生成的 JSON 或对应日志发到公共仓库或公开 CI。

```bash
python3 -m pip install -r throne/requirements.txt

# 本地 Clash YAML（无需网络获取机场节点）
python3 throne/adapter.py --input ./airport.yaml --output "$HOME/throne.local.json"

# 使用一个或多个 HTTPS 机场订阅；URL 往往有密钥，不要公开命令历史
python3 throne/adapter.py --subscription 'https://your-private-subscription.example/sub?token=SECRET' \
  --output "$HOME/throne.local.json"

# 推荐使用私有环境变量避免在命令参数中重复记录订阅 URL；多行代表多个机场
export THRONE_SUBSCRIPTION_URLS="$(cat /path/to/private-subscription-urls.txt)"
python3 throne/adapter.py --output "$HOME/throne.local.json" --force

# 可选：保留附加分类、修改测速间隔、过滤节点名
python3 throne/adapter.py --input ./airport.yaml --output "$HOME/throne.local.json" --force \
  --extra-category Douyin --extra-category WeChat --extra-category Game \
  --test-interval 600 --exclude '试用|剩余流量'
```

**Throne 导入：** 在配置/节点列表添加 **自定义配置**，将类型设为 **Sing-box 完整配置（fullconfig）**，把私有 `throne.local.json` 的内容粘贴到 JSON 编辑器并保存，选中该配置后启动 VPN。不要把整个 JSON 填进普通「订阅 URL」或「远程路由配置」框。界面路径以当前 2.0.3 为准，不同语言下措辞略有差异。

输出文件在 POSIX 系统上以 `0600` 权限创建；重复生成需要显式加 `--force`。推荐保存在公开仓库目录**外**，例如个人目录。`throne/*.local.json` 已在 `.gitignore` 中忽略，但这无法防止你将文件复制到其他目录后意外上传。

## 架构与参数

```text
机场 HTTPS 订阅 / Clash YAML / sing-box JSON
             ↓  安全解析、显式兼容性校验、重名节点消歧
       throne/adapter.py
             ↓  真实 sing-box outbounds
     sing-box/generate_sfa.py （统一策略模型）
             ↓  Throne Android TUN/DNS 修正
          throne.local.json（仅存私有环境）
             ↓  Throne「自定义配置 → Sing-box 完整配置」
```

适配层额外设置 `tun.dns_mode=hijack`、`route.auto_detect_interface=true`，将缓存 ID 与 SFA 隔离。不追加 `experimental.clash_api`；不修改现有 FlClash、Loon、QuanX、Bettbox 分流语义。

`--region-map` 支持按完整节点名指定 `HK/TW/JP/SG/US/OTHER`；如果机场命名同时含“中转香港”和“美国落地”等信息，建议人工覆盖地区判定，而不是冒险猜测出口位置。额外分类应当使用仓库已经发布的类别。默认不开 Ads；默认 SpeedTest 开启，NetworkTest 不启用。

## 验证

```bash
python3 -m unittest discover -s throne/tests -v
python3 -m compileall -q throne/adapter.py sing-box/generate_sfa.py
python3 throne/adapter.py --input throne/tests/fixtures/native-demo.json \
  --output "$HOME/throne-demo.local.json"
sing-box check -c "$HOME/throne-demo.local.json"
```

演示节点使用 `.invalid` 地址和假凭据，只可做 JSON/内核静态检查，无法联网。静态检查不能证明 Android TUN、DNS 防泄漏、节点可用性或策略切换表现；部署后应测试 Gemini、YouTube、QQ/抖音/红果评论与头像等实际业务。

**重要：** 当前的 Throne 客户端未实现 FlClash 那种“远程 JS 根据本机已更新机场节点动态重建全部策略组”的能力。若必须免重新导入配置并让节点增删自动生效，需要修改 Throne 客户端本身的配置生成逻辑，而不是单纯增加远程 JSON 文件。
