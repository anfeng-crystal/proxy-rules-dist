# proxy-rules

[中文主文档](README.md) | English

`proxy-rules` builds one normalized rule source into QuanX, Loon, Clash, and Mihomo outputs. The Chinese README is the canonical guide for the public repo; this file is the English companion. Upstream projects are treated as raw materials; local overrides and protection exceptions are applied before generated files are published.

## Phase Two Maintenance

Phase two keeps the legacy `sources/*.json` layout compatible while the new maintenance split becomes the primary path. **New structure first, legacy files kept for compatibility.** When adding or changing rules, prefer the new structure and only backfill legacy files when needed.

Recommended responsibilities:

- `catalog`: describes categories themselves, including leaf, family, and scenario-entry relationships, policy names, ordering, and availability.
- `upstream`: registers remote sources only; it brings rules in, but does not define the final meaning.
- `groups`: builds composed views from leaves or families for convenient subscription entry points.

Category usage follows the same split, but the public subscription layer is intentionally coarse:

- Service-level leaf categories are the real maintenance source for troubleshooting and audits.
- Public rule subscriptions expose only aggregate rules and standalone brand buckets.
- Family and legacy intermediate buckets stay inside the build graph and are not emitted as public rule files.

Reclassification and protection rules use two mechanisms:

- `category_suppressions`: remove a domain from a broad upstream category when it is captured too early, so a narrower leaf or family can own it.
- `exceptions.json`: keep protection domains, false-positive fixes, and long-lived exceptions here.

Output URLs stay stable:

- Existing `README.md`, `README.en.md`, `snippets/`, `dist/`, and public Pages URLs remain compatible.
- Default snippets and full templates reference the public aggregate buckets only.

## Icons

The icon library is published on the same public Pages host. The manifest lives at `icons/manifest.json`. Pages refreshes keep the same icon URLs, and GitHub Release snapshots keep the same `icons/` path for rollback and comparison.

The generated `icons/manifest.json` currently exposes these real fields: `id`, `label`, `symbol`, `background`, `foreground`, `description`, `categories`, `targets`, `file`, and `url`. The `url` field points at the stable Pages icon path and is what client snippets use by default.

Recommended source metadata is split into two fields:

- `source`: which upstream project, mirror, or curated source the icon came from.
- `license`: which license applies, so you can tell whether the asset can be copied, recolored, and stored locally, or should stay as an external link and index entry only.

Copyable open sources become local `dist/icons/*.svg` fallbacks. Link-only or index-only sources stay as source metadata and public URLs without a local mirror.

Common client entry points:

- QuanX policy template: `snippets/quanx-policy-groups.full.conf`
- Loon policy template: `snippets/loon-policy-groups.full.conf`
- Clash Party / Clash Verge Rev template: `snippets/mihomo-clash-party-verge-rev.template.yaml`
- QuanX icons: `snippets/quanx-policy-icons.conf`
- Loon icons: `snippets/loon-policy-icons.conf`
- Clash icons: `snippets/clash-icon-urls.yaml`

The default client snippets continue to use the Pages icon URLs to keep the path stable. `source` and `license` remain maintenance-layer metadata and do not change the default URL.

If the generator renames any of these files later, this repo will follow the published names, but the Pages and Release layers will still ship them together.

## Layout

```text
sources/
  catalog/              Leaf categories, policies, and maintenance order.
  groups/               Internal composites and public aggregate buckets.
  upstream/             Remote upstream rule sources.
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
  icons/                Icon manifest, SVG assets, and source index.
snippets/
  *.conf, *.yaml        Client subscription snippets and policy templates.
site/
  src/pages/index.astro Astro landing page entry.
  public/               Static assets.
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
  "category": "ExampleLeaf",
  "rules": [
    {"type": "domain_suffix", "value": "example.com"},
    {"type": "domain_suffix", "value": "static.example.com"}
  ]
}
```

Service-level leaf categories contain real rules and remain the maintenance source. Public users should consume the aggregate buckets generated from those leaves. Composite categories never contain domains directly. They include leaf categories or other composites, and the builder expands and deduplicates them during generation.

Public remote rule IDs are English and stable. Policy group display names stay in Chinese or visible brand names.

- `Domestic` -> `国内应用`: all mainland China apps, domestic AI, domestic payment/finance, and domestic direct fallbacks.
- `NetworkTest` -> `网络检测`: connectivity, public IP, DNS leak, and browser fingerprint checks.
- `AI`: overseas AI only.
- `Apple`, `Microsoft`, `Google`, and `GitHub`: standalone brand buckets.
- `Dev`: developer ecosystems other than the standalone GitHub bucket.
- `Payment`: overseas payment and financial services only.
- `Game`: overseas game services only.
- `Telegram`, `YouTube`, `Netflix`, `DisneyPlus`, `Spotify`, `TikTok`, `Twitter`, `Facebook`, and `Instagram`: standalone media/social buckets.
- `GlobalSites` -> `境外网站`: long-tail overseas services that do not have standalone buckets.
- `Ads`: advertising, privacy, and hijacking reject rules.

Recommended usage:

- Keep `LocalNetwork` in local rule sections; it is not a remote rule subscription and is not a visible policy group.
- Add new services as leaves first, then include them in the appropriate public aggregate bucket.
- Do not publish maintenance-layer leaves or intermediate buckets in default snippets, manifest, report, or public rule directories.

### Domestic and overseas families

For day-to-day maintenance, first organize services into families, then use those families to compose scenario entries.

- Domestic families can be grouped by platform, infrastructure, content, finance, government, education, and transport.
- Overseas families can be grouped by core services, communication, social, media, games, development, and payment.
- Service-level leaf categories sit under families and remain the true source for maintenance and troubleshooting.
- Public `dist/quanx`, `dist/loon`, `dist/clash`, and `dist/mihomo` directories emit only the allowlisted aggregate files.

## Policy Templates

Generated templates:

```text
snippets/quanx-policy-groups.template.conf
snippets/clash-proxy-groups.template.yaml
snippets/quanx-policy-groups.full.conf
snippets/loon-policy-groups.full.conf
snippets/mihomo-clash-party-verge-rev.template.yaml
```

Fill the remote subscription placeholders with your node subscriptions. The templates keep `LocalNetwork` in local rule sections, expose one `NetworkTest` remote rule mapped to the `网络检测` policy, and use `Domestic`, `GlobalSites`, `Dev`, `Ads`, and the independent media/social remote IDs by default.

## Iterating Missing Domains

1. Inspect client logs for domain, matched rule, and current policy.
2. Add clear domains to the matching `overrides/<Category>.json`.
3. Create a new service-level leaf category if the service does not fit existing groups.
4. If an upstream broad category captures a domain too early, add a `category_suppressions` entry in `overrides/exceptions.json`.
5. Add mistakenly rejected domains to `overrides/exceptions.json`.
6. Run offline and online builds, then inspect `dist/report.md`.
7. Promote stable upstream sources into `sources/upstream.json` with `required=false`.

## Publishing

The public subscription layer uses aggregate URLs such as:

```text
https://anfeng-crystal.github.io/proxy-rules-dist/
https://anfeng-crystal.github.io/proxy-rules-dist/README.md
https://anfeng-crystal.github.io/proxy-rules-dist/README.en.md
https://anfeng-crystal.github.io/proxy-rules-dist/quanx/Domestic/Domestic.list
https://anfeng-crystal.github.io/proxy-rules-dist/quanx/AI/AI.list
https://anfeng-crystal.github.io/proxy-rules-dist/quanx/GlobalSites/GlobalSites.list
```

`.github/workflows/release-snapshot.yml` creates a dated GitHub Release snapshot after `Publish dist` succeeds. The archive bundles `dist/`, `snippets/`, `README.md`, `README.en.md`, and the Astro site source under `site/`, which makes rollback and comparison straightforward.

If `dist/` contains `icons/`, Pages and Release snapshots pick it up automatically; no extra release lane is needed.

Pages is the latest subscription surface. Releases are the rollback snapshot layer. Use Pages for daily consumption and Releases when you need to restore or compare a specific build day.

The CI gate sequence is: unit tests, `compileall`, offline build, public Pages build, then snapshot publication after a successful publish run. That keeps structural and output issues out of the release trail.
