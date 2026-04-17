# proxy-rules 规则发布仓库

中文 | [English](README.en.md)

`proxy-rules` 使用一份规范化源数据生成 QuanX、Loon、Clash 和 Mihomo 的规则订阅、图标清单与发布页。仓库把上游规则当作输入，先完成归一化、分类、重分类和保护例外处理，再输出到 `dist/`、`snippets/` 和公开 Pages。

## 项目定位

- 单一源数据维护多客户端规则。
- 叶子分类只作为内部维护和聚合输入，不作为默认公开订阅入口。
- 公开规则订阅只发布大规则聚合和独立品牌桶。
- 场景入口负责日常使用，维护层分类负责审计、补充和回归。
- `dist/` 是生成产物，`sources/` 和 `overrides/` 是维护源。

## 支持客户端

- QuanX
- Loon
- Clash
- Mihomo

## 规则结构

- `sources/catalog/categories.json`：叶子分类、策略名和维护顺序。
- `sources/groups/composites.json`：内部聚合和公开大规则桶。
- `sources/upstream/sources.json`：远程上游来源，负责引入外部规则。
- `overrides/*.json`：手工规则、保护域名和固定例外。
- `src/ruleforge/`：构建、归一化、输出和校验逻辑。
- `dist/`：客户端规则、图标和构建报告。
- `snippets/`：客户端订阅片段和策略组模板。
- `site/`：Astro 公开发布页源码。

## 公开规则与策略组

- 远程规则 ID、文件名、目录名和 provider 名统一使用英文：`Domestic`、`NetworkTest`、`AI`、`Apple`、`Microsoft`、`Google`、`GitHub`、`Dev`、`Payment`、`Game`、`Telegram`、`YouTube`、`Netflix`、`DisneyPlus`、`Spotify`、`TikTok`、`Twitter`、`Facebook`、`Instagram`、`GlobalSites`、`Ads`。
- 配置里的策略组展示名继续使用中文或品牌名：`国内应用`、`网络检测`、`AI`、`Apple`、`Microsoft`、`Google`、`GitHub`、`Dev`、`Payment`、`Game`、`Telegram`、`YouTube`、`Netflix`、`DisneyPlus`、`Spotify`、`TikTok`、`Twitter`、`Facebook`、`Instagram`、`境外网站`、`Ads`、`漏网之鱼`。
- 远程规则到策略组的映射示例：`RULE-SET,Domestic,国内应用`、`RULE-SET,NetworkTest,网络检测`、`RULE-SET,GlobalSites,境外网站`。
- `国内应用` 聚合所有国内应用、国内 AI、国内支付金融和国内直连兜底，默认走 `国内应用` 策略。
- `AI` 只聚合海外 AI；`Payment` 只聚合海外支付金融；`Ads` 聚合广告、隐私和劫持拦截类。
- `境外网站` 聚合未单独成桶的长尾境外服务，不吞并独立品牌桶。
- `LocalNetwork` 只放入 QuanX/Loon 本地规则段和 Mihomo 前置本地 rules，不进入远程规则入口和策略组。

## 发布地址

- 公开主页：`https://anfeng-crystal.github.io/proxy-rules-dist/`
- 中文说明：`README.md`
- 英文副本：`README.en.md`
- 规则清单：`manifest.json`
- 构建报告：`report.md`
- 图标清单：`icons/manifest.json`
- QuanX 远程规则：`snippets/quanx-filter-remote.conf`
- Loon 远程规则：`snippets/loon-remote-rule.conf`
- Clash Providers：`snippets/clash-rule-providers.yaml`
- Clash Rules：`snippets/clash-rules.yaml`
- QuanX 完整模板：`snippets/quanx-policy-groups.full.conf`
- Loon 完整模板：`snippets/loon-policy-groups.full.conf`
- Clash Party / Clash Verge Rev 模板：`snippets/mihomo-clash-party-verge-rev.template.yaml`
- GitHub Releases：`https://github.com/anfeng-crystal/proxy-rules/releases`

## 如何使用

1. 先从公开主页打开对应客户端入口。
2. 按客户端导入远程规则片段。
3. 默认订阅已经是大规则聚合，不需要逐个订阅叶子分类。
4. 需要精细维护时，修改 `sources/` 和 `overrides/` 的叶子输入，再由公开桶聚合发布。
5. QuanX 的完整模板使用 `snippets/quanx-policy-groups.full.conf`。
6. Loon 的完整模板使用 `snippets/loon-policy-groups.full.conf`。
7. Clash Party / Clash Verge Rev 使用 `snippets/mihomo-clash-party-verge-rev.template.yaml`。
8. 图标订阅分别使用 `snippets/quanx-policy-icons.conf`、`snippets/loon-policy-icons.conf` 和 `snippets/clash-icon-urls.yaml`。

## 本地构建

```bash
PYTHONPATH=src python3 -m unittest discover -s tests
python3 -m compileall -q src tests
PYTHONPATH=src python3 -m ruleforge.cli build --offline --json
```

联网构建会按公开 Pages 地址刷新输出：

```bash
PYTHONPATH=src python3 -m ruleforge.cli build \
  --base-url https://anfeng-crystal.github.io/proxy-rules-dist \
  --json
```

## 目录结构

```text
sources/
  catalog/              叶子分类、策略名和维护顺序。
  groups/               内部聚合和公开大规则桶。
  upstream/             远程上游来源。
overrides/
  *.json                手工规则、保护域名和固定例外。
src/ruleforge/
  build.py              构建编排。
  normalize.py          输入解析和归一化。
  emitters.py           QuanX、Loon、Clash 和 Mihomo 输出。
dist/
  quanx/                Quantumult X 规则。
  loon/                 Loon 规则。
  clash/                Clash classical rule-provider。
  mihomo/               Mihomo classical rule-provider。
  icons/                图标清单、SVG 资源和来源索引。
snippets/
  *.conf, *.yaml        客户端订阅片段和策略组模板。
site/
  src/pages/index.astro Astro 发布页入口。
  public/               静态资源。
```

## 注意事项

- `dist/` 是构建产物，不建议手工编辑。
- 保护域名和误杀修正优先放到 `overrides/exceptions.json`。
- 新服务先建叶子分类，再放入对应公开大规则桶；默认发布层不暴露维护层分类。
- 公开页面和发布快照使用同一路径，日常使用优先 Pages，归档和回滚优先 Releases。
- `dist/quanx`、`dist/loon`、`dist/clash` 和 `dist/mihomo` 只发布公开 allowlist 文件。
