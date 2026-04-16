# 代理规则发布仓库

中文 | [English](README.en.md)

`proxy-rules` 用一份规范化源数据生成 QuanX、Loon、Clash 和 Mihomo 规则。叶子分类可以单独订阅，聚合分类只是方便快速选取的一层。仓库把上游规则当作原料，先合并本地 `overrides`，再应用防误杀例外，最后发布到 `dist/` 和公开 GitHub Pages。

## 第二阶段维护约定

第二阶段继续兼容旧的 `sources/*.json` 结构，同时以新的维护分层为主；**新结构优先，旧结构保留兼容**。后续新增和调整尽量先落到新结构里，再按需回填旧文件，避免把维护入口继续堆在单一大桶里。

推荐把职责分开看：

- `catalog`：只描述分类本身，包括叶子、家族和场景入口的关系、策略名、顺序和可用范围。
- `upstream`：只登记远程来源，负责把外部规则带进来，不负责最终语义。
- `groups`：只做组合视图，把若干叶子或家族拼成可订阅入口，便于快速使用和迁移。

分类使用也按这个原则：

- 服务级叶子是真实维护源，适合精细排障和单独订阅。
- 家族分类是同领域汇总，适合审计、归类和批量维护。
- 场景入口是给客户端快速选取用的，`All` 类都属于这一层，不是精细维护源。

重分类和保护规则统一走下面两类：

- `category_suppressions`：当上游宽泛分类过早收走某个域名时，用它把域名从宽泛分类移出，交回更细的叶子或家族分类。
- `exceptions.json`：放保护域名、误杀修正和长期固定例外，优先保证关键链路稳定。

输出层保持不变：

- `README.md`、`README.en.md`、`snippets/`、`dist/` 和公开 Pages 的现有地址保持兼容。
- 新结构只影响维护方式，不改变对外订阅 URL 的用法。

## 公开入口

- 站点首页：`https://anfeng-crystal.github.io/proxy-rules-dist/`
- 中文主文档：`README.md`
- 英文副本：`README.en.md`
- QuanX 远程规则：`snippets/quanx-filter-remote.conf`
- Loon 远程规则：`snippets/loon-remote-rule.conf`
- Clash Providers：`snippets/clash-rule-providers.yaml`
- Clash Rules：`snippets/clash-rules.yaml`

## 目录

```text
sources/
  categories.json       叶子分类、策略名和输出顺序。
  composites.json       聚合规则，只 include 已有分类，不直接写域名。
  upstream.json         远程上游规则源，第一阶段继续兼容，默认 required=false。
overrides/
  *.json                必保手工规则，离线构建也会输出。
  exceptions.json       永远不能进入 REJECT 的保护域名，以及从宽泛分类移出的重分类规则。
src/ruleforge/
  build.py              构建编排。
  normalize.py          输入解析和规则归一化。
  emitters.py           QuanX、Loon、Clash、Mihomo 和 snippets 输出。
dist/
  quanx/                Quantumult X 规则。
  loon/                 Loon 规则。
  clash/                Clash classical rule-provider。
  mihomo/               Mihomo classical rule-provider。
snippets/
  *.conf, *.yaml        客户端订阅片段和多策略组模板。
site/
  index.html            发布页首页模板。
```

## 本地构建

```bash
PYTHONPATH=src python3 -m unittest discover -s tests
python3 -m compileall -q src tests
PYTHONPATH=src python3 -m ruleforge.cli build --offline --json
```

联网构建会拉取上游规则：

```bash
PYTHONPATH=src python3 -m ruleforge.cli build \
  --base-url https://anfeng-crystal.github.io/proxy-rules-dist \
  --json
```

## 规则模型

手工规则使用统一 JSON：

```json
{
  "category": "OpenAI",
  "rules": [
    {"type": "domain_suffix", "value": "chatgpt.com"},
    {"type": "domain_suffix", "value": "openai.com"}
  ]
}
```

支持类型：

- `domain`
- `domain_suffix`
- `domain_keyword`
- `ip_cidr`
- `ip_cidr6`
- `geoip`
- `process_name`
- `user_agent`
- `url_regex`

## 分类和聚合

服务级叶子是真实规则，可以单独订阅。家族分类用于把同领域服务收束到一起，便于审计、归类和批量维护。场景入口只负责快速选取，不承担精细维护职责；`All` 类都应该按这个定位理解。构建器负责递归展开和去重，排障和精细分流时优先看服务级叶子。

常用服务级叶子：

- `LocalNetwork`：本地私网、局域网、回环和 Captive Portal，适合单独订阅。
- `ConnectivityCheck`：系统联网检测、可达性检查和劫持探测。
- `ChinaWhitelist`：可审计的大陆白名单集合，适合排查误代理。
- `GlobalAI`：海外主流 AI，策略 `GlobalAI`。
- `ChinaAI`：国内 AI，策略 `DIRECT`。
- `Developer`：GitHub、GitLab、Docker、npm、PyPI、Maven、Go、Rust、RubyGems、Gradle、JetBrains、VSCode、Homebrew。
- `Payment`：PayPal 和 Stripe。
- `GlobalMedia`：海外流媒体和媒体服务。
- `ProxyAll`：海外兜底大包。

常用家族和场景入口：

- `DirectAll`：`LocalNetwork + ConnectivityCheck + DomesticAll + ChinaWhitelist`，适合快速直连入口，但不是内网的唯一入口。
- `DomesticAll`：大陆家族聚合，通常由平台、基础设施、内容、金融、政务、教育、交通等家族组成，适合快速直连入口。
- `AIAll`：混合 AI 目录，包含海外和国内 AI；更适合审计或迁移，不建议直接绑定单一出口。
- `AppleServices`：Apple 核心、CDN、Push 和媒体服务。
- `MicrosoftServices`：Microsoft 核心、云、开发、Xbox 和 Copilot 服务。
- `GlobalGame`：Steam、Epic、PlayStation、Xbox、Nintendo、Battle.net、Riot、HoYoverse。
- `ChinaGame`：腾讯游戏、网易游戏、米哈游大陆服务。
- `GameAll`：混合游戏目录，包含国内和海外游戏。
- `RejectAll`：广告、隐私和劫持拦截。

### 内网单独订阅示例

如果你想把内网单独拿出来，直接订阅下面这些叶子分类：

```text
LocalNetwork
ConnectivityCheck
ChinaWhitelist
```

`DirectAll` 只是一个方便入口，不会替代上面的叶子分类。  
`DomesticAll` 也不承担内网职责，它更偏向大陆家族聚合和区域直连。  
`ProxyAll`、`AIAll`、`DirectAll` 这类 `All` 分类都属于场景入口，不是日常维护源。

### 国内与海外家族

如果你要做更细的日常维护，建议先按家族分层，再由家族去拼装场景入口。

- 国内家族可以按平台、基础设施、内容、金融、政务、教育、交通来组织。
- 海外家族可以按核心服务、通信、社交、媒体、游戏、开发、支付来组织。
- 服务级叶子放在家族之下，作为真正的维护和排障来源。
- `All` 类只保留给快速订阅和审计视图，不作为细分维护主入口。

### AI 订阅建议

- `GlobalAI`：日常海外 AI 的首选入口。
- `ChinaAI`：国内 AI 的直连入口。
- `AIAll`：只在你想一次看全量时使用，适合审计和迁移，不适合作为默认唯一入口。

如果你主要排障 `ChatGPT / Claude / Gemini / Copilot`，优先看 `GlobalAI`。  
如果你想把 `AIAll` 继续拆回去，直接从 `GlobalAI` 和 `ChinaAI` 入手最省事。

## 多策略组

规则里会使用多个策略名，例如 `GlobalAI`、`Developer`、`Payment`、`Game`、`Apple`、`GlobalMedia`。生成器会输出模板：

```text
snippets/quanx-policy-groups.template.conf
snippets/clash-proxy-groups.template.yaml
```

把模板里的 `节点A/节点B/节点C` 替换成真实节点即可。建议客户端规则顺序是：

```text
LocalNetwork / ConnectivityCheck / ChinaWhitelist
GlobalAI / ChinaAI / Developer / Payment / Game
AppleServices / MicrosoftServices / GlobalMedia / GlobalServices
DirectAll / DomesticAll / AIAll / ProxyAll
RejectAll
FINAL 或 MATCH
```

`AIAll`、`DirectAll`、`DomesticAll` 适合快速入口和审计入口；要做排障或精细分流时，优先用 `LocalNetwork`、`ConnectivityCheck`、`ChinaWhitelist`、`GlobalAI`、`ChinaAI`、`Developer`、`Payment`、`GlobalServices` 这些更细的入口。

## 漏网之鱼怎么处理

1. 先看客户端命中日志，确认域名、当前策略和失败类型。
2. 能明确归属的域名，先加到对应 `overrides/<Category>.json`。
3. 如果是新服务，先建叶子分类，再按需加入 `sources/composites.json` 或新的 `groups` 组合视图。
4. 如果域名被上游宽泛分类收走，在 `overrides/exceptions.json` 的 `category_suppressions` 里把它从宽泛分类移出。
5. 如果被广告或隐私规则误杀，先加入 `overrides/exceptions.json`。
6. 离线构建确认无空分类，再联网构建观察 `dist/report.md`。
7. 某个上游长期稳定后，再加入 `sources/upstream.json`；不确定的源保持 `required=false`。

这个流程比直接塞进 `ProxyAll` 更容易排查，也能避免本地内网、银行、政务、票务和上传链路被误代理或误拒绝。

## 安全规则

`overrides/exceptions.json` 会在每次构建时从广告、隐私、劫持等拒绝类规则中移除保护域名。保护范围覆盖 OpenAI 上传链路、GitHub、Homebrew、开发生态、支付、Apple、Microsoft、游戏和关键云服务。

这些保护域名不建议进入 REJECT、rewrite 或 MITM 链路。

## 发布

`.github/workflows/update.yml` 每天定时构建并提交产物变更。

`.github/workflows/publish-dist.yml` 会把 `dist/`、`snippets/`、`README.md`、`README.en.md` 和 `site/index.html` 发布到公开仓库 `anfeng-crystal/proxy-rules-dist`。公开仓库根目录的 `README.md` 是中文主文档：

```text
https://anfeng-crystal.github.io/proxy-rules-dist/
https://anfeng-crystal.github.io/proxy-rules-dist/README.md
https://anfeng-crystal.github.io/proxy-rules-dist/README.en.md
https://anfeng-crystal.github.io/proxy-rules-dist/snippets/quanx-filter-remote.conf
https://anfeng-crystal.github.io/proxy-rules-dist/quanx/GlobalAI/GlobalAI.list
https://anfeng-crystal.github.io/proxy-rules-dist/quanx/LocalNetwork/LocalNetwork.list
https://anfeng-crystal.github.io/proxy-rules-dist/quanx/ChinaAI/ChinaAI.list
https://anfeng-crystal.github.io/proxy-rules-dist/quanx/DomesticAll/DomesticAll.list
https://anfeng-crystal.github.io/proxy-rules-dist/clash/ProxyAll/ProxyAll.yaml
```
