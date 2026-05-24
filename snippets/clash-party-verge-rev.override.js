// RuleForge Clash Party / Clash Verge Rev JavaScript override.
// Keep subscriptions, nodes, DNS, and private local rules in the client.

function main(config, profileName) {
  const RULE_BASE = "https://anfeng-crystal.github.io/proxy-rules-dist/clash";
  const RULE_INTERVAL = 86400;
  const TEST_URL = "https://www.gstatic.com/generate_204";
  const TEST_INTERVAL = 600;
  const TEST_TOLERANCE = 50;
  const COMMON_EXCLUDE =
    "(?i)(到期|剩余|流量|套餐|官网|网址|订阅|群组|客服|工单|更新|刷新|traffic|expire|expired|reset|remain|used|total|test|测试|试用|trial|直连|direct|reject|广告|ads)";
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
      "(?i)(美国|美國|usa|united ?states|america|us|lax|sfo|sea|nyc|jfk|ord|dfw|atl|sjc|san ?jose|los ?angeles|new ?york|🇺🇸)"
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

  function selectGroup(name, proxies) {
    return { name, type: "select", proxies: unique(proxies) };
  }

  function nodePoolGroup(name, filter) {
    const group = {
      name,
      type: "select",
      "include-all": true,
      "exclude-filter": COMMON_EXCLUDE
    };
    if (filter) group.filter = filter;
    return group;
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

  function buildRegionCollections() {
    const entryGroups = [];
    const autoGroups = [];
    const fallbackGroups = [];
    const nodeGroups = [];
    for (const [regionName, filter] of REGION_CONFIGS) {
      entryGroups.push(selectGroup(regionName, [`${regionName}节点`, `${regionName}自动`, `${regionName}故障转移`, "🌍 全部节点", "DIRECT"]));
      autoGroups.push(autoTestGroup(`${regionName}自动`, filter));
      fallbackGroups.push(fallbackGroup(`${regionName}故障转移`, filter));
      nodeGroups.push(nodePoolGroup(`${regionName}节点`, filter));
    }
    return { entryGroups, autoGroups, fallbackGroups, nodeGroups };
  }

  function buildGroups() {
    const regionEntryNames = REGION_CONFIGS.map(([name]) => name);
    const regionAutoNames = REGION_CONFIGS.map(([name]) => `${name}自动`);
    const regionFallbackNames = REGION_CONFIGS.map(([name]) => `${name}故障转移`);
    const { entryGroups, autoGroups, fallbackGroups, nodeGroups } = buildRegionCollections();
    return [
      selectGroup("🚀 节点选择", ["⚡️ 自动选择", "🛟 故障转移", "🌍 全部节点", ...regionEntryNames, "DIRECT"]),
      selectGroup("⚡️ 自动选择", [...regionAutoNames, "🌍 全部节点", "DIRECT"]),
      selectGroup("🛟 故障转移", [...regionFallbackNames, "🌍 全部节点", "DIRECT"]),
      nodePoolGroup("🌍 全部节点"),
      ...entryGroups,
      ...autoGroups,
      ...fallbackGroups,
      ...nodeGroups,
      ...POLICY_GROUPS.map(([name, proxies]) => selectGroup(name, proxies))
    ];
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
      ...RULE_BINDINGS.map(([name, policy]) => `RULE-SET,${name},${policy}`),
      "GEOIP,CN,🇨🇳 国内应用,no-resolve",
      "MATCH,🐟 漏网之鱼"
    ];
  }

  function unique(values) {
    return Array.from(new Set(values.filter(value => typeof value !== "undefined" && value !== null && value !== "")));
  }
}
