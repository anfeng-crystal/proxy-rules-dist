# proxy-rules 规则发布仓库

中文 | [English](README.en.md)

`proxy-rules` 使用一份规范化源数据生成 QuanX、Loon、Clash 和 Mihomo 的规则订阅、图标清单与发布页。仓库把上游规则当作输入，先完成归一化、分类、重分类和保护例外处理，再输出到 `dist/`、`snippets/` 和公开 Pages。

## 项目定位

- 单一源数据维护多客户端规则。
- 叶子分类负责精细维护和单独订阅。
- 家族分类负责同类服务归并和批量维护。
- 场景入口负责快速选取，不承担细分维护职责。
- `dist/` 是生成产物，`sources/` 和 `overrides/` 是维护源。

## 支持客户端

- QuanX
- Loon
- Clash
- Mihomo

## 规则结构

- `sources/categories.json`：叶子分类、策略名和输出顺序。
- `sources/composites.json`：聚合规则，只组合已有分类。
- `sources/upstream.json`：远程上游来源，负责引入外部规则。
- `overrides/*.json`：手工规则、保护域名和固定例外。
- `src/ruleforge/`：构建、归一化、输出和校验逻辑。
- `dist/`：客户端规则、图标和构建报告。
- `snippets/`：客户端订阅片段和策略组模板。
- `site/index.html`：公开发布页源文件。

## 策略组设计原则

- 先叶子，后家族，再场景入口。
- 先细分服务，再聚合归并，最后用兜底代理收口。
- 内网、直连、支付、更新、开发、AI、媒体和游戏应分层维护。
- `AIAll`、`DomesticAll`、`ProxyAll` 这类聚合组只适合作为快速入口或审计入口，不适合作为默认唯一入口。
- 规则排序优先保证例外、内网、细分服务，再放家族聚合、拦截规则和兜底规则。

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
- GitHub Releases：`https://github.com/anfeng-crystal/proxy-rules/releases`

## 如何使用

1. 先从公开主页打开对应客户端入口。
2. 按客户端导入远程规则片段。
3. 需要精细控制时，优先订阅叶子分类。
4. 需要快速切换时，再使用聚合分类。
5. QuanX 的策略组模板使用 `snippets/quanx-policy-groups.full.conf`。
6. 图标订阅分别使用 `snippets/quanx-policy-icons.conf`、`snippets/loon-policy-icons.conf` 和 `snippets/clash-icon-urls.yaml`。

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
  categories.json       叶子分类、策略名和输出顺序。
  composites.json       聚合规则，只组合已有分类。
  upstream.json         远程上游来源。
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
  index.html            发布页源文件。
```

## 注意事项

- `dist/` 是构建产物，不建议手工编辑。
- 保护域名和误杀修正优先放到 `overrides/exceptions.json`。
- 新服务先建叶子分类，再决定是否进入家族或场景入口。
- 公开页面和发布快照使用同一路径，日常使用优先 Pages，归档和回滚优先 Releases。
- 如果需要更细的拆分，优先看叶子分类，不要先把所有东西压进一个大桶。
