// RuleForge Clash Party / Clash Verge Rev JavaScript override.
// Keep subscriptions, nodes, and DNS in the client; rebuild groups, providers, and rules.

function main(config, profileName) {
  const RULE_BASE = "https://anfeng-crystal.github.io/proxy-rules-dist/clash";
  const RULE_INTERVAL = 86400;
  const DEFAULT_TEST_URL = "http://www.gstatic.com/generate_204";
  const ORIGINAL_PROXY_GROUPS = Array.isArray(config["proxy-groups"]) ? config["proxy-groups"] : [];
  const TEST_URL = resolveTestUrl(ORIGINAL_PROXY_GROUPS);
  const TEST_INTERVAL = 600;
  const TEST_TOLERANCE = 50;
  const COMMON_EXCLUDE =
    "(?i)(到期|剩余|流量|套餐|官网|网址|订阅|群组|客服|工单|更新|刷新|traffic|expire|expired|reset|remain|used|total|test|测试|试用|trial|direct|reject|广告|ads|^\\s*\\d+(\\.\\d+)?\\s*[kmgtpe](i?b)?\\s*(\\||/)\\s*\\d+(\\.\\d+)?\\s*[kmgtpe](i?b)?\\s*$)";
  const MICROSOFT_LOGIN_PROXY_RULES = [
    "DOMAIN,login.live.com,🚀 节点选择",
    "DOMAIN,logincdn.msauth.net,🚀 节点选择"
  ];
  const REGION_CONFIGS = [
    [
      "🇭🇰 香港",
      "(?i)(香港|港澳|港区|hong ?kong|hongkong|hkg|hk|🇭🇰|港服|港线)"
    ],
    [
      "🇯🇵 日本",
      "(?i)(日本|japan|jp|tokyo|東京|osaka|大阪|tyo|nrt|hnd|🇯🇵)"
    ],
    [
      "🇺🇸 美国",
      "(?i)(美国|美國|united ?states|seattle|san ?jose|los ?angeles|new ?york|🇺🇸|(^|[^a-z])(usa|us|lax|sfo|sea|nyc|jfk|ord|dfw|atl|sjc)($|[^a-z]))"
    ],
    [
      "🇸🇬 新加坡",
      "(?i)(新加坡|singapore|sg|sin|sgp|狮城|獅城|星洲|🇸🇬)"
    ],
    [
      "🇹🇼 台湾",
      "(?i)(台湾|臺灣|台灣|taiwan|tw|tpe|taipei|台北|🇹🇼|formosa)"
    ]
  ];
  const RULE_BINDINGS = [
    [
      "Gemini",
      "🧠 Gemini"
    ],
    [
      "AI",
      "🤖 AI"
    ],
    [
      "YouTube",
      "📺 YouTube"
    ],
    [
      "Netflix",
      "🎬 Netflix"
    ],
    [
      "DisneyPlus",
      "🏰 DisneyPlus"
    ],
    [
      "Google",
      "🇬 Google"
    ],
    [
      "GitHub",
      "🐙 GitHub"
    ],
    [
      "Microsoft",
      "🪟 Microsoft"
    ],
    [
      "Apple",
      "🍎 Apple"
    ],
    [
      "Telegram",
      "✈️ Telegram"
    ],
    [
      "PayPal",
      "💳 PayPal"
    ],
    [
      "GlobalMedia",
      "🎞️ 境外流媒体"
    ],
    [
      "GlobalSites",
      "🌐 境外网站"
    ],
    [
      "Domestic",
      "🇨🇳 国内应用"
    ]
  ];
  const POLICY_GROUPS = [
    [
      "🧠 Gemini",
      [
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移",
        "🌍 全部节点",
        "🇭🇰 香港",
        "🇯🇵 日本",
        "🇺🇸 美国",
        "🇸🇬 新加坡",
        "🇹🇼 台湾",
        "DIRECT"
      ]
    ],
    [
      "🤖 AI",
      [
        "🇺🇸 美国",
        "🇸🇬 新加坡",
        "🇯🇵 日本",
        "🇭🇰 香港",
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移"
      ]
    ],
    [
      "📺 YouTube",
      [
        "🇭🇰 香港",
        "🇯🇵 日本",
        "🇺🇸 美国",
        "🇸🇬 新加坡",
        "🇹🇼 台湾",
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移"
      ]
    ],
    [
      "🎬 Netflix",
      [
        "🇭🇰 香港",
        "🇯🇵 日本",
        "🇺🇸 美国",
        "🇸🇬 新加坡",
        "🇹🇼 台湾",
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移"
      ]
    ],
    [
      "🏰 DisneyPlus",
      [
        "🇭🇰 香港",
        "🇯🇵 日本",
        "🇺🇸 美国",
        "🇸🇬 新加坡",
        "🇹🇼 台湾",
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移"
      ]
    ],
    [
      "🇬 Google",
      [
        "🇭🇰 香港",
        "🇯🇵 日本",
        "🇺🇸 美国",
        "🇸🇬 新加坡",
        "🇹🇼 台湾",
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移"
      ]
    ],
    [
      "🐙 GitHub",
      [
        "🇭🇰 香港",
        "🇯🇵 日本",
        "🇺🇸 美国",
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移"
      ]
    ],
    [
      "🪟 Microsoft",
      [
        "DIRECT",
        "🇭🇰 香港",
        "🇯🇵 日本",
        "🇺🇸 美国",
        "🇸🇬 新加坡",
        "🇹🇼 台湾",
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移"
      ]
    ],
    [
      "🍎 Apple",
      [
        "DIRECT",
        "🇭🇰 香港",
        "🇯🇵 日本",
        "🇺🇸 美国",
        "🇸🇬 新加坡",
        "🇹🇼 台湾",
        "🚀 节点选择",
        "⚡️ 自动选择"
      ]
    ],
    [
      "✈️ Telegram",
      [
        "🇸🇬 新加坡",
        "🇭🇰 香港",
        "🇺🇸 美国",
        "🇯🇵 日本",
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移"
      ]
    ],
    [
      "💳 PayPal",
      [
        "🇭🇰 香港",
        "🇺🇸 美国",
        "🇸🇬 新加坡",
        "🇯🇵 日本",
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移"
      ]
    ],
    [
      "🎞️ 境外流媒体",
      [
        "🇭🇰 香港",
        "🇯🇵 日本",
        "🇺🇸 美国",
        "🇸🇬 新加坡",
        "🇹🇼 台湾",
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移"
      ]
    ],
    [
      "🌐 境外网站",
      [
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移",
        "🌍 全部节点",
        "🇭🇰 香港",
        "🇯🇵 日本",
        "🇺🇸 美国",
        "🇸🇬 新加坡",
        "🇹🇼 台湾"
      ]
    ],
    [
      "🇨🇳 国内应用",
      [
        "DIRECT",
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移",
        "🌍 全部节点"
      ]
    ],
    [
      "🐟 漏网之鱼",
      [
        "🚀 节点选择",
        "⚡️ 自动选择",
        "🛟 故障转移",
        "🌍 全部节点",
        "DIRECT"
      ]
    ]
  ];

  config["proxy-groups"] = buildGroups();
  config["rule-providers"] = buildProviders();
  config.rules = buildRules();

  return config;

  function resolveTestUrl(groups) {
    // Preserve provider-selected health checks; some subscriptions require an HTTP probe.
    const urlTestGroup = groups.find(group => group && group.type === "url-test" && isHttpUrl(group.url));
    if (urlTestGroup) return urlTestGroup.url.trim();
    const failoverGroup = groups.find(
      group => group && (group.type === "fallback" || group.type === "load-balance") && isHttpUrl(group.url)
    );
    if (failoverGroup) return failoverGroup.url.trim();
    return DEFAULT_TEST_URL;
  }

  function isHttpUrl(value) {
    return typeof value === "string" && /^https?:\/\/(?:\[[0-9a-f:.]+\]|[^@:\/\s?#]+)(?::\d{1,5})?(?:[\/?#]\S*)?$/i.test(value.trim());
  }

  function selectGroup(name, proxies) {
    return { name, type: "select", proxies: unique(proxies) };
  }

  function allNodesGroup() {
    const group = {
      name: "🌍 全部节点",
      type: "select",
      "include-all": true,
      "exclude-filter": COMMON_EXCLUDE
    };
    return group;
  }

  function regionSelectGroup(name, filter) {
    return {
      name,
      type: "select",
      proxies: [`${name}自动`, `${name}故障转移`],
      "include-all": true,
      filter,
      "exclude-filter": COMMON_EXCLUDE
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
      "exclude-filter": COMMON_EXCLUDE
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
      "exclude-filter": COMMON_EXCLUDE
    };
    if (filter) group.filter = filter;
    return group;
  }

  function buildGroups() {
    const regionEntryNames = REGION_CONFIGS.map(([name]) => name);
    const regionAutoNames = REGION_CONFIGS.map(([name]) => `${name}自动`);
    const regionFallbackNames = REGION_CONFIGS.map(([name]) => `${name}故障转移`);
    const groups = [
      selectGroup("🚀 节点选择", ["⚡️ 自动选择", "🛟 故障转移", "🌍 全部节点", ...regionEntryNames, "DIRECT"]),
      selectGroup("⚡️ 自动选择", [...regionAutoNames, "🌍 全部节点", "DIRECT"]),
      selectGroup("🛟 故障转移", [...regionFallbackNames, "🌍 全部节点", "DIRECT"]),
      allNodesGroup()
    ];
    for (const [name, filter] of REGION_CONFIGS) groups.push(regionSelectGroup(name, filter));
    for (const [name, filter] of REGION_CONFIGS) groups.push(autoTestGroup(`${name}自动`, filter));
    for (const [name, filter] of REGION_CONFIGS) groups.push(fallbackGroup(`${name}故障转移`, filter));
    for (const [name, proxies] of POLICY_GROUPS) groups.push(selectGroup(name, proxies));
    return groups;
  }

  function buildProviders() {
    const providers = {};
    for (const [name] of RULE_BINDINGS) {
      providers[name] = {
        type: "http",
        behavior: "classical",
        format: "yaml",
        path: `./rule-providers/anfeng_${name}.yaml`,
        url: `${RULE_BASE}/${name}/${name}.yaml`,
        interval: RULE_INTERVAL,
        proxy: "DIRECT"
      };
    }
    return providers;
  }

  function buildRules() {
    return [
      "GEOSITE,private,DIRECT",
      "GEOIP,private,DIRECT,no-resolve",
      ...MICROSOFT_LOGIN_PROXY_RULES,
      ...RULE_BINDINGS.map(([name, policy]) => `RULE-SET,${name},${policy}`),
      "GEOIP,CN,🇨🇳 国内应用,no-resolve",
      "MATCH,🐟 漏网之鱼"
    ];
  }

  function unique(values) {
    return Array.from(new Set(values.filter(value => typeof value !== "undefined" && value !== null && value !== "")));
  }
}
