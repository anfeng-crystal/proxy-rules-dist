// RuleForge FlClash JavaScript override.
// Generated from the same RuleForge policy model, maintained as a client-specific file.
// Keep subscription proxies and DNS/TUN ownership in the client; rebuild groups, rule-providers and rules.
// Existing subscription dialer-proxy group dependencies are preserved automatically.
// Gemini defaults to the US policy group.
// Compatible with FlClash's QuickJS main(config) override engine. The script performs no fetch/timer/file I/O; remote rule-provider downloads are left to Mihomo.

const RULEFORGE_OPTIONS = {
  // Service routing switches
  Gemini: true,
  AI: true,
  YouTube: true,
  Netflix: true,
  DisneyPlus: true,
  Google: true,
  GitHub: true,
  Microsoft: true,
  Apple: true,
  Telegram: true,
  PayPal: true,
  GlobalMedia: true,
  GlobalSites: true,
  Domestic: true,

  // Infrastructure switches
  // true: rule-provider files are downloaded through "🚀 节点选择".
  // false: rule-provider files are downloaded through DIRECT.
  规则集走代理: true,

  // false by default. When enabled, inline nodes named with
  // 落地 / landing / exit / 自建 are chained through "🔗 链式中转"
  // unless the node already defines dialer-proxy.
  链式代理: false,
};


function main(config) {
  const RULE_BASE = "https://anfeng-crystal.github.io/proxy-rules-dist/clash";
  const RULE_INTERVAL = 86400;
  const DEFAULT_TEST_URL = "http://www.gstatic.com/generate_204";
  const TEST_INTERVAL = 600;
  const TEST_TOLERANCE = 50;

  const ORIGINAL_PROXY_GROUPS = Array.isArray(config["proxy-groups"])
    ? config["proxy-groups"].filter(group => group && typeof group === "object")
    : [];

  const TEST_URL = resolveTestUrl(ORIGINAL_PROXY_GROUPS);

  const COMMON_EXCLUDE =
    "(?i)(到期|剩余|流量|套餐|官网|网址|订阅|群组|客服|工单|更新|刷新|traffic|expire|expired|reset|remain|used|total|test|测试|试用|trial|direct|reject|广告|ads|^\\s*\\d+(\\.\\d+)?\\s*[kmgtpe](i?b)?\\s*(\\||/)\\s*\\d+(\\.\\d+)?\\s*[kmgtpe](i?b)?\\s*$)";

  // Naming convention for future inline landing/self-hosted nodes.
  // When the visual "链式代理" switch is enabled, inline nodes whose names match this
  // expression get dialer-proxy=🔗 链式中转 unless they already define dialer-proxy.
  const CHAIN_LANDING_NAME_RE = /(落地|landing|exit|自建)/i;
  const CHAIN_LANDING_MIHOMO_FILTER = "(?i)(落地|landing|exit|自建)";
  const CHAIN_GROUP = "🔗 链式中转";

  const MICROSOFT_LOGIN_PROXY_RULES = [
    "DOMAIN,login.live.com,🚀 节点选择",
    "DOMAIN,logincdn.msauth.net,🚀 节点选择",
  ];

  const REGION_CONFIGS = [
    ["🇭🇰 香港", "(?i)(香港|港澳|港区|hong ?kong|hongkong|🇭🇰|港服|港线|(^|[^a-z])(hkg|hk)($|[^a-z]))"],
    ["🇯🇵 日本", "(?i)(日本|japan|tokyo|東京|osaka|大阪|🇯🇵|(^|[^a-z])(jp|tyo|nrt|hnd)($|[^a-z]))"],
    [
      "🇺🇸 美国",
      "(?i)(美国|美國|united ?states|seattle|san ?jose|los ?angeles|new ?york|🇺🇸|(^|[^a-z])(usa|us|lax|sfo|sea|nyc|jfk|ord|dfw|atl|sjc)($|[^a-z]))",
    ],
    ["🇸🇬 新加坡", "(?i)(新加坡|singapore|狮城|獅城|星洲|🇸🇬|(^|[^a-z])(sg|sin|sgp)($|[^a-z]))"],
    ["🇹🇼 台湾", "(?i)(台湾|臺灣|台灣|taiwan|taipei|台北|🇹🇼|formosa|(^|[^a-z])(tw|tpe)($|[^a-z]))"],
  ];

  const RULE_BINDINGS = [
    ["Gemini", "🧠 Gemini"],
    ["AI", "🤖 AI"],
    ["YouTube", "📺 YouTube"],
    ["Netflix", "🎬 Netflix"],
    ["DisneyPlus", "🏰 DisneyPlus"],
    ["Google", "🇬 Google"],
    ["GitHub", "🐙 GitHub"],
    ["Microsoft", "🪟 Microsoft"],
    ["Apple", "🍎 Apple"],
    ["Telegram", "✈️ Telegram"],
    ["PayPal", "💳 PayPal"],
    ["GlobalMedia", "🎞️ 境外流媒体"],
    ["GlobalSites", "🌐 境外网站"],
    ["Domestic", "🇨🇳 国内应用"],
  ];

  const POLICY_GROUPS = [
    [
      "Gemini",
      "🧠 Gemini",
      // The first member of a select group is the default selection.
      // Gemini defaults to the US region as requested.
      ["🇺🇸 美国", "🇸🇬 新加坡", "🇯🇵 日本", "🇭🇰 香港", "🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移", "🌍 全部节点", "🇹🇼 台湾", "DIRECT"],
    ],
    [
      "AI",
      "🤖 AI",
      ["🇺🇸 美国", "🇸🇬 新加坡", "🇯🇵 日本", "🇭🇰 香港", "🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移"],
    ],
    [
      "YouTube",
      "📺 YouTube",
      ["🇭🇰 香港", "🇯🇵 日本", "🇺🇸 美国", "🇸🇬 新加坡", "🇹🇼 台湾", "🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移"],
    ],
    [
      "Netflix",
      "🎬 Netflix",
      ["🇭🇰 香港", "🇯🇵 日本", "🇺🇸 美国", "🇸🇬 新加坡", "🇹🇼 台湾", "🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移"],
    ],
    [
      "DisneyPlus",
      "🏰 DisneyPlus",
      ["🇭🇰 香港", "🇯🇵 日本", "🇺🇸 美国", "🇸🇬 新加坡", "🇹🇼 台湾", "🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移"],
    ],
    [
      "Google",
      "🇬 Google",
      ["🇭🇰 香港", "🇯🇵 日本", "🇺🇸 美国", "🇸🇬 新加坡", "🇹🇼 台湾", "🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移"],
    ],
    [
      "GitHub",
      "🐙 GitHub",
      ["🇭🇰 香港", "🇯🇵 日本", "🇺🇸 美国", "🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移"],
    ],
    [
      "Microsoft",
      "🪟 Microsoft",
      ["DIRECT", "🇭🇰 香港", "🇯🇵 日本", "🇺🇸 美国", "🇸🇬 新加坡", "🇹🇼 台湾", "🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移"],
    ],
    [
      "Apple",
      "🍎 Apple",
      ["DIRECT", "🇭🇰 香港", "🇯🇵 日本", "🇺🇸 美国", "🇸🇬 新加坡", "🇹🇼 台湾", "🚀 节点选择", "⚡️ 自动选择"],
    ],
    [
      "Telegram",
      "✈️ Telegram",
      ["🇸🇬 新加坡", "🇭🇰 香港", "🇺🇸 美国", "🇯🇵 日本", "🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移"],
    ],
    [
      "PayPal",
      "💳 PayPal",
      ["🇭🇰 香港", "🇺🇸 美国", "🇸🇬 新加坡", "🇯🇵 日本", "🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移"],
    ],
    [
      "GlobalMedia",
      "🎞️ 境外流媒体",
      ["🇭🇰 香港", "🇯🇵 日本", "🇺🇸 美国", "🇸🇬 新加坡", "🇹🇼 台湾", "🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移"],
    ],
    [
      "GlobalSites",
      "🌐 境外网站",
      ["🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移", "🌍 全部节点", "🇭🇰 香港", "🇯🇵 日本", "🇺🇸 美国", "🇸🇬 新加坡", "🇹🇼 台湾"],
    ],
    [
      "Domestic",
      "🇨🇳 国内应用",
      ["DIRECT", "🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移", "🌍 全部节点"],
    ],
  ];

  if (isOptionEnabled("链式代理")) {
    applyChainDialerToInlineLandingNodes();
  }

  config["proxy-groups"] = buildGroups();
  config["rule-providers"] = buildProviders();
  config.rules = buildRules();

  return config;

  function isOptionEnabled(name) {
    return RULEFORGE_OPTIONS[name] !== false;
  }

  function resolveTestUrl(groups) {
    const urlTestGroup = groups.find(group => group && group.type === "url-test" && isHttpUrl(group.url));
    if (urlTestGroup) return groupUrl(urlTestGroup);

    const failoverGroup = groups.find(
      group => group && (group.type === "fallback" || group.type === "load-balance") && isHttpUrl(group.url),
    );
    if (failoverGroup) return groupUrl(failoverGroup);

    return DEFAULT_TEST_URL;
  }

  function groupUrl(group) {
    return typeof group.url === "string" ? group.url.trim() : DEFAULT_TEST_URL;
  }

  function isHttpUrl(value) {
    return (
      typeof value === "string" &&
      /^https?:\/\/(?:\[[0-9a-f:.]+\]|[^@:\/\s?#]+)(?::\d{1,5})?(?:[\/?#]\S*)?$/i.test(value.trim())
    );
  }

  function selectGroup(name, proxies) {
    return { name, type: "select", proxies: unique(proxies) };
  }

  function allNodesGroup() {
    return {
      name: "🌍 全部节点",
      type: "select",
      "include-all": true,
      "exclude-filter": COMMON_EXCLUDE,
    };
  }

  function regionSelectGroup(name, filter) {
    return {
      name,
      type: "select",
      proxies: [`${name}自动`, `${name}故障转移`],
      "include-all": true,
      filter,
      "exclude-filter": COMMON_EXCLUDE,
    };
  }

  function autoTestGroup(name, filter) {
    const group = {
      name,
      type: "url-test",
      url: TEST_URL,
      interval: TEST_INTERVAL,
      tolerance: TEST_TOLERANCE,
      lazy: true,
      "include-all": true,
      "exclude-filter": COMMON_EXCLUDE,
    };
    if (filter) group.filter = filter;
    return group;
  }

  function fallbackGroup(name, filter) {
    const group = {
      name,
      type: "fallback",
      url: TEST_URL,
      interval: TEST_INTERVAL,
      lazy: true,
      "include-all": true,
      "exclude-filter": COMMON_EXCLUDE,
    };
    if (filter) group.filter = filter;
    return group;
  }

  function chainRelayGroup() {
    return {
      name: CHAIN_GROUP,
      type: "select",
      proxies: ["⚡️ 自动选择", "🛟 故障转移", "🌍 全部节点", "🇭🇰 香港", "🇯🇵 日本", "🇺🇸 美国", "🇸🇬 新加坡", "🇹🇼 台湾", "DIRECT"],
      "include-all": true,
      "exclude-filter": `${COMMON_EXCLUDE}|${CHAIN_LANDING_MIHOMO_FILTER}`,
    };
  }

  function buildGroups() {
    const regionEntryNames = REGION_CONFIGS.map(([name]) => name);
    const regionAutoNames = REGION_CONFIGS.map(([name]) => `${name}自动`);
    const regionFallbackNames = REGION_CONFIGS.map(([name]) => `${name}故障转移`);

    const groups = [
      selectGroup("🚀 节点选择", ["⚡️ 自动选择", "🛟 故障转移", "🌍 全部节点", ...regionEntryNames, "DIRECT"]),
      selectGroup("⚡️ 自动选择", [...regionAutoNames, "🌍 全部节点", "DIRECT"]),
      selectGroup("🛟 故障转移", [...regionFallbackNames, "🌍 全部节点", "DIRECT"]),
      allNodesGroup(),
    ];

    for (const [name, filter] of REGION_CONFIGS) groups.push(regionSelectGroup(name, filter));
    for (const [name, filter] of REGION_CONFIGS) groups.push(autoTestGroup(`${name}自动`, filter));
    for (const [name, filter] of REGION_CONFIGS) groups.push(fallbackGroup(`${name}故障转移`, filter));

    if (isOptionEnabled("链式代理")) {
      groups.push(chainRelayGroup());
    }

    for (const [optionName, name, proxies] of POLICY_GROUPS) {
      if (isOptionEnabled(optionName)) groups.push(selectGroup(name, proxies));
    }

    groups.push(
      selectGroup("🐟 漏网之鱼", ["🚀 节点选择", "⚡️ 自动选择", "🛟 故障转移", "🌍 全部节点", "DIRECT"]),
    );

    // Preserve only the subscription groups that are actually required by existing
    // dialer-proxy chains. Dependencies are collected recursively through group.proxies.
    // If a required subscription group collides with a generated RuleForge group name,
    // it is safely aliased and every affected dialer-proxy/group reference is rewritten.
    preserveRequiredOriginalGroups(groups);

    return dedupeGroups(groups);
  }

  function preserveRequiredOriginalGroups(groups) {
    if (!ORIGINAL_PROXY_GROUPS.length) return;

    const originalByName = new Map();
    for (const group of ORIGINAL_PROXY_GROUPS) {
      if (!group || typeof group.name !== "string" || !group.name) continue;
      if (!originalByName.has(group.name)) originalByName.set(group.name, group);
    }
    if (!originalByName.size) return;

    const required = new Set();

    function collect(name) {
      if (typeof name !== "string" || !originalByName.has(name) || required.has(name)) return;
      required.add(name);

      const group = originalByName.get(name);
      if (Array.isArray(group.proxies)) {
        for (const member of group.proxies) collect(member);
      }
      collect(group["dialer-proxy"]);
    }

    // Inline subscription/custom proxies may already have a chain dependency.
    if (Array.isArray(config.proxies)) {
      for (const proxy of config.proxies) {
        if (!proxy || typeof proxy !== "object") continue;
        collect(proxy["dialer-proxy"]);
      }
    }

    // Proxy-provider overrides can also use dialer-proxy.
    const proxyProviders = config["proxy-providers"];
    if (proxyProviders && typeof proxyProviders === "object") {
      for (const providerName of Object.keys(proxyProviders)) {
        const provider = proxyProviders[providerName];
        if (!provider || typeof provider !== "object") continue;
        const override = provider.override;
        if (override && typeof override === "object") collect(override["dialer-proxy"]);
      }
    }

    if (!required.size) return;

    const generatedNames = new Set(groups.map(group => group && group.name).filter(Boolean));
    const reservedNames = new Set([...generatedNames, ...originalByName.keys()]);
    const aliasByName = new Map();

    for (const name of required) {
      if (!generatedNames.has(name)) {
        aliasByName.set(name, name);
        continue;
      }

      const base = `🧩 机场·${name}`;
      let alias = base;
      let index = 2;
      while (reservedNames.has(alias)) alias = `${base} ${index++}`;
      aliasByName.set(name, alias);
      reservedNames.add(alias);
    }

    function remap(name) {
      return typeof name === "string" && aliasByName.has(name) ? aliasByName.get(name) : name;
    }

    // Rewrite roots that point at aliased original groups.
    if (Array.isArray(config.proxies)) {
      for (const proxy of config.proxies) {
        if (!proxy || typeof proxy !== "object") continue;
        if (typeof proxy["dialer-proxy"] === "string") {
          proxy["dialer-proxy"] = remap(proxy["dialer-proxy"]);
        }
      }
    }

    if (proxyProviders && typeof proxyProviders === "object") {
      for (const providerName of Object.keys(proxyProviders)) {
        const provider = proxyProviders[providerName];
        if (!provider || typeof provider !== "object") continue;
        const override = provider.override;
        if (override && typeof override === "object" && typeof override["dialer-proxy"] === "string") {
          override["dialer-proxy"] = remap(override["dialer-proxy"]);
        }
      }
    }

    // Keep original ordering where possible, but only append groups in the dependency closure.
    for (const original of ORIGINAL_PROXY_GROUPS) {
      if (!original || typeof original.name !== "string" || !required.has(original.name)) continue;

      const cloned = deepClone(original);
      cloned.name = remap(original.name);

      if (Array.isArray(cloned.proxies)) {
        cloned.proxies = cloned.proxies.map(remap);
      }
      if (typeof cloned["dialer-proxy"] === "string") {
        cloned["dialer-proxy"] = remap(cloned["dialer-proxy"]);
      }

      groups.push(cloned);
    }
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function dedupeGroups(groups) {
    const seen = new Set();
    return groups.filter(group => {
      if (!group || typeof group.name !== "string" || !group.name) return false;
      if (seen.has(group.name)) return false;
      seen.add(group.name);
      return true;
    });
  }

  function buildProviders() {
    const providers = {};
    const providerProxy = isOptionEnabled("规则集走代理") ? "🚀 节点选择" : "DIRECT";

    for (const [name] of RULE_BINDINGS) {
      if (!isOptionEnabled(name)) continue;
      providers[name] = {
        type: "http",
        behavior: "classical",
        format: "yaml",
        path: `./rule-providers/anfeng_${name}.yaml`,
        url: `${RULE_BASE}/${name}/${name}.yaml`,
        interval: RULE_INTERVAL,
        proxy: providerProxy,
      };
    }
    return providers;
  }

  function buildRules() {
    const rules = ["GEOSITE,private,DIRECT", "GEOIP,private,DIRECT,no-resolve"];

    if (isOptionEnabled("Microsoft")) rules.push(...MICROSOFT_LOGIN_PROXY_RULES);

    for (const [name, policy] of RULE_BINDINGS) {
      if (isOptionEnabled(name)) rules.push(`RULE-SET,${name},${policy}`);
    }

    // Keep the essential CN IP direct fallback even when the Domestic provider switch is disabled.
    if (isOptionEnabled("Domestic")) {
      rules.push("GEOIP,CN,🇨🇳 国内应用,no-resolve");
    } else {
      rules.push("GEOIP,CN,DIRECT,no-resolve");
    }

    rules.push("MATCH,🐟 漏网之鱼");
    return rules;
  }

  function applyChainDialerToInlineLandingNodes() {
    if (!Array.isArray(config.proxies)) return;

    for (const proxy of config.proxies) {
      if (!proxy || typeof proxy !== "object") continue;
      if (typeof proxy.name !== "string" || !CHAIN_LANDING_NAME_RE.test(proxy.name)) continue;
      if (proxy.type === "direct" || proxy.type === "reject") continue;

      // Respect subscription/custom definitions that already specify their own chain.
      if (!proxy["dialer-proxy"]) proxy["dialer-proxy"] = CHAIN_GROUP;
    }
  }

  function unique(values) {
    return Array.from(new Set(values.filter(value => typeof value !== "undefined" && value !== null && value !== "")));
  }
}
