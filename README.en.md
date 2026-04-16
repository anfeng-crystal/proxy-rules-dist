# proxy-rules

[中文主文档](README.md) | English

`proxy-rules` builds one normalized rule source into QuanX, Loon, Clash, and Mihomo outputs. The Chinese README is the canonical guide for the public repo; this file is the English companion. Upstream projects are treated as raw materials; local overrides and protection exceptions are applied before generated files are published.

## Phase One Maintenance

Phase one keeps the legacy `sources/*.json` layout compatible while introducing a clearer maintenance split. **New structure first, legacy files kept for compatibility.** When adding or changing rules, prefer the new structure and only backfill legacy files when needed.

Recommended responsibilities:

- `catalog`: describes categories themselves, including leaf, family, and scenario-entry relationships, policy names, ordering, and availability.
- `upstream`: registers remote sources only; it brings rules in, but does not define the final meaning.
- `groups`: builds composed views from leaves or families for convenient subscription entry points.

Category usage follows the same split:

- Leaf categories are the real maintenance source and are suitable for precise troubleshooting and standalone subscription.
- Family categories group related services together for auditing and bulk maintenance.
- Scenario entries are convenience entry points for clients; every `All` class belongs here and should not be treated as a precise maintenance source.

Reclassification and protection rules use two mechanisms:

- `category_suppressions`: remove a domain from a broad upstream category when it is captured too early, so a narrower leaf or family can own it.
- `exceptions.json`: keep protection domains, false-positive fixes, and long-lived exceptions here.

Output URLs stay unchanged:

- Existing `README.md`, `README.en.md`, `snippets/`, `dist/`, and public Pages URLs remain compatible.
- The new structure changes maintenance workflow only; it does not change subscription URL usage.

## Layout

```text
sources/
  categories.json       Leaf categories, policies, and output order.
  composites.json       Aggregate rule sets that include existing categories.
  upstream.json         Remote upstream rule sources, kept compatible in phase one.
overrides/
  *.json                Manual rules that are always included.
  exceptions.json       Reject protection and broad-category suppression rules.
src/ruleforge/
  build.py              Build orchestration.
  normalize.py          Input parser and canonical normalizer.
  emitters.py           QuanX, Loon, Clash, Mihomo, and snippets emitters.
dist/
  quanx/                Generated Quantumult X rules.
  loon/                 Generated Loon rules.
  clash/                Generated Clash classical providers.
  mihomo/               Generated Mihomo classical providers.
snippets/
  *.conf, *.yaml        Client subscription snippets and policy templates.
site/
  index.html            Published landing page template.
```

## Build

```bash
PYTHONPATH=src python3 -m unittest discover -s tests
python3 -m compileall -q src tests
PYTHONPATH=src python3 -m ruleforge.cli build --offline --json
```

Online build:

```bash
PYTHONPATH=src python3 -m ruleforge.cli build \
  --base-url https://anfeng-crystal.github.io/proxy-rules-dist \
  --json
```

## Model

Manual rules use a small canonical JSON format:

```json
{
  "category": "OpenAI",
  "rules": [
    {"type": "domain_suffix", "value": "chatgpt.com"},
    {"type": "domain_suffix", "value": "openai.com"}
  ]
}
```

Leaf categories contain real rules and can be subscribed on their own. Family categories group related services. Scenario entries are convenience bundles for clients; every `All` class belongs here and should not be treated as a precise maintenance source. Composite categories never contain domains directly. They include leaf categories or other composites, and the builder expands and deduplicates them during generation.

Key leaf and composite entries:

- `LocalNetwork`: local network, intranet, loopback, and captive portal endpoints. Subscribe this separately when you want to peel intranet traffic out of broader bundles.
- `ConnectivityCheck`: system connectivity and reachability checks.
- `ChinaWhitelist`: an inspectable mainland China whitelist.
- `GlobalAI`: overseas AI services.
- `ChinaAI`: mainland China AI services.
- `AIAll`: mixed AI catalog for auditing; avoid using it as the only routing entry unless that is intentional.
- `DirectAll`: local network, connectivity checks, domestic services, and China whitelist.
- `DomesticAll`: mainland China services, banks, government, education, cloud, CDN, games, and regional fallback.
- `AppleServices`: Apple core, CDN, push, and media services.
- `MicrosoftServices`: Microsoft core, cloud, developer, Xbox, and Copilot services.
- `Developer`: GitHub, GitLab, Docker, npm, PyPI, Maven, Go, Rust, RubyGems, Gradle, JetBrains, VSCode, and Homebrew.
- `GlobalGame` and `ChinaGame`: overseas and mainland game service bundles.
- `GlobalMedia`: overseas streaming and media services.
- `RejectAll`: advertising, privacy, and hijacking reject bundle.
- `ProxyAll`: broad overseas fallback bundle.

Recommended usage:

- Use `LocalNetwork`, `ConnectivityCheck`, and `ChinaWhitelist` when you want to split intranet and direct traffic out from broader bundles.
- Use `GlobalAI` for overseas AI, `ChinaAI` for domestic AI, and `AIAll` only when you want a full audit or migration view.
- Use `DirectAll`, `DomesticAll`, and `ProxyAll` as convenience bundles, not as the only entry points.
- Treat every `All` class as a scenario entry, not as a precise maintenance source.

## Policy Templates

Generated templates:

```text
snippets/quanx-policy-groups.template.conf
snippets/clash-proxy-groups.template.yaml
```

Replace `节点A/节点B/节点C` with real node names or existing proxy groups.

## Iterating Missing Domains

1. Inspect client logs for domain, matched rule, and current policy.
2. Add clear domains to the matching `overrides/<Category>.json`.
3. Create a new leaf category if the service does not fit existing groups.
4. If an upstream broad category captures a domain too early, add a `category_suppressions` entry in `overrides/exceptions.json`.
5. Add mistakenly rejected domains to `overrides/exceptions.json`.
6. Run offline and online builds, then inspect `dist/report.md`.
7. Promote stable upstream sources into `sources/upstream.json` with `required=false`.

## Publishing

The public subscription layer is:

```text
https://anfeng-crystal.github.io/proxy-rules-dist/
https://anfeng-crystal.github.io/proxy-rules-dist/README.md
https://anfeng-crystal.github.io/proxy-rules-dist/README.en.md
https://anfeng-crystal.github.io/proxy-rules-dist/quanx/LocalNetwork/LocalNetwork.list
https://anfeng-crystal.github.io/proxy-rules-dist/quanx/GlobalAI/GlobalAI.list
https://anfeng-crystal.github.io/proxy-rules-dist/quanx/ChinaAI/ChinaAI.list
https://anfeng-crystal.github.io/proxy-rules-dist/clash/ProxyAll/ProxyAll.yaml
```
