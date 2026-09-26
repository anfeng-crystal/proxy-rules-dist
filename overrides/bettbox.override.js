// RuleForge Bettbox JavaScript override.
// Bettbox >= v1.18.8 visual options compatible.
// Keep subscription proxies and DNS in the client; rebuild groups, providers and rules.
// Chain proxy support is opt-in and disabled by default.
// Existing subscription chain dependencies are preserved automatically, even when chain mode is off.

const Compatible_With_Bettbox = { ruleOptionsEnable: true };

// V7: Domestic is visible with DIRECT only; GEOIP,CN remains literal DIRECT.
// Bettbox visual switches. Bettbox will merge UI selections into this object before main() runs.
const ruleOptionsEnable = {
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

  // Infrastructure options
  规则集走代理: true,
  链式代理: false,
};

function main(config, profileName) {
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
    ["🇭🇰 香港", "🇭🇰 香港节点", "(?i)^(?!.*(?:落地|landing|exit|自建)).*(?:香港|港澳|港区|hong ?kong|hongkong|🇭🇰|港服|港线|(^|[^a-z])(hkg|hk)($|[^a-z]))"],
    ["🇯🇵 日本", "🇯🇵 日本节点", "(?i)^(?!.*(?:落地|landing|exit|自建)).*(?:日本|japan|tokyo|東京|osaka|大阪|🇯🇵|(^|[^a-z])(jp|tyo|nrt|hnd)($|[^a-z]))"],
    ["🇸🇬 新加坡", "🇸🇬 新加坡节点", "(?i)^(?!.*(?:落地|landing|exit|自建)).*(?:新加坡|singapore|狮城|獅城|星洲|🇸🇬|(^|[^a-z])(sg|sin|sgp)($|[^a-z]))"],
    ["🇹🇼 台湾", "🇹🇼 台湾节点", "(?i)^(?!.*(?:落地|landing|exit|自建)).*(?:台湾|臺灣|台灣|taiwan|taipei|台北|🇹🇼|formosa|(^|[^a-z])(tw|tpe)($|[^a-z]))"],
    ["🇺🇸 美国", "🇺🇸 美国节点", "(?i)^(?!.*(?:落地|landing|exit|自建)).*(?:美国|美國|united ?states|seattle|san ?jose|los ?angeles|new ?york|🇺🇸|(^|[^a-z])(usa|us|lax|sfo|sea|nyc|jfk|ord|dfw|atl|sjc)($|[^a-z]))"],
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
      ["🇺🇸 美国节点", "🚀 节点选择", "🇭🇰 香港节点", "🇯🇵 日本节点", "🇸🇬 新加坡节点", "🇹🇼 台湾节点", "🇭🇰 香港自动", "🇯🇵 日本自动", "🇸🇬 新加坡自动", "🇹🇼 台湾自动", "🇺🇸 美国自动", "🇭🇰 香港故障转移", "🇯🇵 日本故障转移", "🇸🇬 新加坡故障转移", "🇹🇼 台湾故障转移", "🇺🇸 美国故障转移", "🌍 全部节点", "DIRECT"],
    ],
    [
      "AI",
      "🤖 AI",
      ["🇺🇸 美国节点", "🇸🇬 新加坡节点", "🇯🇵 日本节点", "🇭🇰 香港节点", "🚀 节点选择", "🇹🇼 台湾节点", "🇭🇰 香港自动", "🇯🇵 日本自动", "🇸🇬 新加坡自动", "🇹🇼 台湾自动", "🇺🇸 美国自动", "🇭🇰 香港故障转移", "🇯🇵 日本故障转移", "🇸🇬 新加坡故障转移", "🇹🇼 台湾故障转移", "🇺🇸 美国故障转移", "🌍 全部节点"],
    ],
    [
      "YouTube",
      "📺 YouTube",
      ["🇭🇰 香港节点", "🇯🇵 日本节点", "🇺🇸 美国节点", "🇸🇬 新加坡节点", "🇹🇼 台湾节点", "🚀 节点选择", "🇭🇰 香港自动", "🇯🇵 日本自动", "🇸🇬 新加坡自动", "🇹🇼 台湾自动", "🇺🇸 美国自动", "🇭🇰 香港故障转移", "🇯🇵 日本故障转移", "🇸🇬 新加坡故障转移", "🇹🇼 台湾故障转移", "🇺🇸 美国故障转移", "🌍 全部节点"],
    ],
    [
      "Netflix",
      "🎬 Netflix",
      ["🇭🇰 香港节点", "🇯🇵 日本节点", "🇺🇸 美国节点", "🇸🇬 新加坡节点", "🇹🇼 台湾节点", "🚀 节点选择", "🇭🇰 香港自动", "🇯🇵 日本自动", "🇸🇬 新加坡自动", "🇹🇼 台湾自动", "🇺🇸 美国自动", "🇭🇰 香港故障转移", "🇯🇵 日本故障转移", "🇸🇬 新加坡故障转移", "🇹🇼 台湾故障转移", "🇺🇸 美国故障转移", "🌍 全部节点"],
    ],
    [
      "DisneyPlus",
      "🏰 DisneyPlus",
      ["🇭🇰 香港节点", "🇯🇵 日本节点", "🇺🇸 美国节点", "🇸🇬 新加坡节点", "🇹🇼 台湾节点", "🚀 节点选择", "🇭🇰 香港自动", "🇯🇵 日本自动", "🇸🇬 新加坡自动", "🇹🇼 台湾自动", "🇺🇸 美国自动", "🇭🇰 香港故障转移", "🇯🇵 日本故障转移", "🇸🇬 新加坡故障转移", "🇹🇼 台湾故障转移", "🇺🇸 美国故障转移", "🌍 全部节点"],
    ],
    [
      "Google",
      "🇬 Google",
      ["🇭🇰 香港节点", "🇯🇵 日本节点", "🇺🇸 美国节点", "🇸🇬 新加坡节点", "🇹🇼 台湾节点", "🚀 节点选择", "🇭🇰 香港自动", "🇯🇵 日本自动", "🇸🇬 新加坡自动", "🇹🇼 台湾自动", "🇺🇸 美国自动", "🇭🇰 香港故障转移", "🇯🇵 日本故障转移", "🇸🇬 新加坡故障转移", "🇹🇼 台湾故障转移", "🇺🇸 美国故障转移", "🌍 全部节点"],
    ],
    [
      "GitHub",
      "🐙 GitHub",
      ["🇭🇰 香港节点", "🇯🇵 日本节点", "🇺🇸 美国节点", "🚀 节点选择", "🇸🇬 新加坡节点", "🇹🇼 台湾节点", "🇭🇰 香港自动", "🇯🇵 日本自动", "🇸🇬 新加坡自动", "🇹🇼 台湾自动", "🇺🇸 美国自动", "🇭🇰 香港故障转移", "🇯🇵 日本故障转移", "🇸🇬 新加坡故障转移", "🇹🇼 台湾故障转移", "🇺🇸 美国故障转移", "🌍 全部节点"],
    ],
    [
      "Microsoft",
      "🪟 Microsoft",
      ["DIRECT", "🇭🇰 香港节点", "🇯🇵 日本节点", "🇺🇸 美国节点", "🇸🇬 新加坡节点", "🇹🇼 台湾节点", "🚀 节点选择", "🇭🇰 香港自动", "🇯🇵 日本自动", "🇸🇬 新加坡自动", "🇹🇼 台湾自动", "🇺🇸 美国自动", "🇭🇰 香港故障转移", "🇯🇵 日本故障转移", "🇸🇬 新加坡故障转移", "🇹🇼 台湾故障转移", "🇺🇸 美国故障转移", "🌍 全部节点"],
    ],
    [
      "Apple",
      "🍎 Apple",
      ["DIRECT", "🇭🇰 香港节点", "🇯🇵 日本节点", "🇺🇸 美国节点", "🇸🇬 新加坡节点", "🇹🇼 台湾节点", "🚀 节点选择", "🇭🇰 香港自动", "🇯🇵 日本自动", "🇸🇬 新加坡自动", "🇹🇼 台湾自动", "🇺🇸 美国自动", "🇭🇰 香港故障转移", "🇯🇵 日本故障转移", "🇸🇬 新加坡故障转移", "🇹🇼 台湾故障转移", "🇺🇸 美国故障转移", "🌍 全部节点"],
    ],
    [
      "Telegram",
      "✈️ Telegram",
      ["🇸🇬 新加坡节点", "🇭🇰 香港节点", "🇺🇸 美国节点", "🇯🇵 日本节点", "🚀 节点选择", "🇹🇼 台湾节点", "🇭🇰 香港自动", "🇯🇵 日本自动", "🇸🇬 新加坡自动", "🇹🇼 台湾自动", "🇺🇸 美国自动", "🇭🇰 香港故障转移", "🇯🇵 日本故障转移", "🇸🇬 新加坡故障转移", "🇹🇼 台湾故障转移", "🇺🇸 美国故障转移", "🌍 全部节点"],
    ],
    [
      "PayPal",
      "💳 PayPal",
      ["🇭🇰 香港节点", "🇺🇸 美国节点", "🇸🇬 新加坡节点", "🇯🇵 日本节点", "🚀 节点选择", "🇹🇼 台湾节点", "🇭🇰 香港自动", "🇯🇵 日本自动", "🇸🇬 新加坡自动", "🇹🇼 台湾自动", "🇺🇸 美国自动", "🇭🇰 香港故障转移", "🇯🇵 日本故障转移", "🇸🇬 新加坡故障转移", "🇹🇼 台湾故障转移", "🇺🇸 美国故障转移", "🌍 全部节点"],
    ],
    [
      "GlobalMedia",
      "🎞️ 境外流媒体",
      ["🇭🇰 香港节点", "🇯🇵 日本节点", "🇺🇸 美国节点", "🇸🇬 新加坡节点", "🇹🇼 台湾节点", "🚀 节点选择", "🇭🇰 香港自动", "🇯🇵 日本自动", "🇸🇬 新加坡自动", "🇹🇼 台湾自动", "🇺🇸 美国自动", "🇭🇰 香港故障转移", "🇯🇵 日本故障转移", "🇸🇬 新加坡故障转移", "🇹🇼 台湾故障转移", "🇺🇸 美国故障转移", "🌍 全部节点"],
    ],
    [
      "GlobalSites",
      "🌐 境外网站",
      ["🚀 节点选择", "🇭🇰 香港节点", "🇯🇵 日本节点", "🇺🇸 美国节点", "🇸🇬 新加坡节点", "🇹🇼 台湾节点", "🇭🇰 香港自动", "🇯🇵 日本自动", "🇸🇬 新加坡自动", "🇹🇼 台湾自动", "🇺🇸 美国自动", "🇭🇰 香港故障转移", "🇯🇵 日本故障转移", "🇸🇬 新加坡故障转移", "🇹🇼 台湾故障转移", "🇺🇸 美国故障转移", "🌍 全部节点"],
    ],
    [
      "Domestic",
      "🇨🇳 国内应用",
      ["DIRECT"],
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
    return ruleOptionsEnable[name] !== false;
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

  function regionSelectGroup(mainName, baseName, filter) {
    return {
      name: mainName,
      type: "select",
      proxies: [`${baseName}自动`, `${baseName}故障转移`],
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
    const regionMainNames = REGION_CONFIGS.map(([, mainName]) => mainName);
    const regionAutoNames = REGION_CONFIGS.map(([baseName]) => `${baseName}自动`);
    const regionFallbackNames = REGION_CONFIGS.map(([baseName]) => `${baseName}故障转移`);
    return {
      name: CHAIN_GROUP,
      type: "select",
      proxies: [...regionMainNames, ...regionAutoNames, ...regionFallbackNames, "DIRECT"],
      "include-all": true,
      "exclude-filter": `${COMMON_EXCLUDE}|${CHAIN_LANDING_MIHOMO_FILTER}`,
    };
  }

  function buildGroups() {
    const regionMainNames = REGION_CONFIGS.map(([, mainName]) => mainName);
    const regionAutoNames = REGION_CONFIGS.map(([baseName]) => `${baseName}自动`);
    const regionFallbackNames = REGION_CONFIGS.map(([baseName]) => `${baseName}故障转移`);
    const groups = [];

    // 1. Business routing groups.
    for (const [optionName, name, proxies] of POLICY_GROUPS) {
      if (isOptionEnabled(optionName)) groups.push(selectGroup(name, proxies));
    }

    // 2. Regional manual groups: regional auto + failover + actual nodes.
    for (const [baseName, mainName, filter] of REGION_CONFIGS) {
      groups.push(regionSelectGroup(mainName, baseName, filter));
    }

    // 3. Regional auto groups.
    for (const [baseName, , filter] of REGION_CONFIGS) {
      groups.push(autoTestGroup(`${baseName}自动`, filter));
    }

    // 4. Regional failover groups.
    for (const [baseName, , filter] of REGION_CONFIGS) {
      groups.push(fallbackGroup(`${baseName}故障转移`, filter));
    }

    // 5. Helpers. No redundant global 自动选择/故障转移 groups.
    groups.push(
      selectGroup("🚀 节点选择", [
        ...regionMainNames,
        ...regionAutoNames,
        ...regionFallbackNames,
        "🌍 全部节点",
        "DIRECT",
      ]),
      allNodesGroup(),
    );

    if (isOptionEnabled("链式代理")) groups.push(chainRelayGroup());

    // Existing chain dependencies are kept before the final catch-all.
    preserveRequiredOriginalGroups(groups);

    // 6. Catch-all always last.
    groups.push(
      selectGroup("🐟 漏网之鱼", [
        "🚀 节点选择",
        ...regionMainNames,
        ...regionAutoNames,
        ...regionFallbackNames,
        "🌍 全部节点",
        "DIRECT",
      ]),
    );

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

    // Keep CN IP as a literal direct fallback; do not route it through the
    // visible Domestic policy group.
    rules.push("GEOIP,CN,DIRECT,no-resolve");

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
