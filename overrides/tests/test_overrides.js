"use strict";

// Run with: node --test overrides/tests/test_overrides.js
// Optional: RULEFORGE_BASELINE_DIR=/path/to/old/overrides to compare ordinary output.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const CLIENTS = ["bettbox", "clash-party", "clash-verge-rev", "flclash"];
const REGIONS = ["🇭🇰 香港", "🇹🇼 台湾", "🇯🇵 日本", "🇸🇬 新加坡", "🇺🇸 美国"];
const MAIN = REGIONS.map(name => `${name}节点`);
const AUTO = REGIONS.map(name => `${name}自动`);
const FALLBACK = REGIONS.map(name => `${name}故障转移`);
const CATCH_ALL = "🐟 漏网之鱼";
const CHAIN = "🔗 链式中转";
const CATCH_CHOICES = ["🚀 节点选择", ...MAIN, ...AUTO, ...FALLBACK, "🌍 全部节点", "DIRECT"];
const clone = value => JSON.parse(JSON.stringify(value));
const node = (name, extra = {}) => ({
  name, type: "ss", server: "example.test", port: 443,
  cipher: "aes-128-gcm", password: "test-fixture", ...extra,
});

function apply(client, input, options = {}, root = ROOT) {
  const context = vm.createContext({ input: clone(input), options: clone(options) });
  const source = fs.readFileSync(path.join(root, `${client}.override.js`), "utf8");
  const optionName = client === "bettbox" ? "ruleOptionsEnable" : "RULEFORGE_OPTIONS";
  vm.runInContext(`${source}\nObject.assign(${optionName}, options); output = main(input, "test");`, context);
  return clone(context.output);
}

function byName(config, name) {
  const group = config["proxy-groups"].find(item => item.name === name);
  assert.ok(group, `missing group ${name}`);
  return group;
}

function assertGraph(config) {
  const groups = config["proxy-groups"];
  assert.equal(new Set(groups.map(group => group.name)).size, groups.length, "duplicate group names");
  const vertices = new Map([
    ...(config.proxies || []).map(proxy => [proxy.name, proxy]),
    ...groups.map(group => [group.name, group]),
  ]);
  const builtin = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"]);
  const visited = new Set();
  const visiting = new Set();
  function visit(name) {
    if (builtin.has(name)) return;
    assert.ok(vertices.has(name), `unresolved reference ${name}`);
    assert.ok(!visiting.has(name), `dependency cycle at ${name}`);
    if (visited.has(name)) return;
    visiting.add(name);
    const object = vertices.get(name);
    for (const member of object.proxies || []) visit(member);
    if (object["dialer-proxy"]) visit(object["dialer-proxy"]);
    for (const provider of object.use || []) {
      assert.ok(config["proxy-providers"]?.[provider], `unresolved provider ${provider}`);
    }
    visiting.delete(name);
    visited.add(name);
  }
  for (const name of vertices.keys()) visit(name);
  for (const provider of [
    ...Object.values(config["proxy-providers"] || {}),
    ...Object.values(config["rule-providers"] || {}),
  ]) {
    if (provider.proxy) visit(provider.proxy);
    if (provider["dialer-proxy"]) visit(provider["dialer-proxy"]);
    if (provider.override?.["dialer-proxy"]) visit(provider.override["dialer-proxy"]);
    for (const proxy of provider.payload || []) {
      if (proxy && proxy["dialer-proxy"]) visit(proxy["dialer-proxy"]);
    }
  }
}

function assertDefaults(config) {
  const names = config["proxy-groups"].map(group => group.name);
  assert.equal(names.at(-1), CATCH_ALL);
  assert.deepEqual(byName(config, CATCH_ALL).proxies, CATCH_CHOICES);
  assert.deepEqual(names.filter(name => [...MAIN, ...AUTO, ...FALLBACK].includes(name)), [...MAIN, ...AUTO, ...FALLBACK]);
  assert.ok(!names.includes("🇭🇰 香港手动"));
  assert.equal(byName(config, "🧠 Gemini").proxies[0], "🇺🇸 美国节点");
  assert.deepEqual(byName(config, "🇨🇳 国内应用").proxies, ["DIRECT"]);
  assert.ok(config.rules.includes("GEOIP,CN,DIRECT,no-resolve"));
  assert.equal(config.rules.at(-1), `MATCH,${CATCH_ALL}`);
  assertGraph(config);
}

function assertRepeated(client, first, options = {}) {
  let output = first;
  for (let pass = 0; pass < 3; pass++) {
    output = apply(client, output, options);
    assert.deepEqual(output, first, `changed on repeat ${pass + 1}`);
    assertGraph(output);
  }
}

function reverseKeys(value) {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseKeys(item)]));
}

const ordinaryFixtures = {
  empty: {},
  inline: {
    proxies: [node("HK 01"), node("US 01"), node("自建 US landing")],
    dns: { enable: true, "enhanced-mode": "fake-ip", nameserver: ["https://example.test/dns-query"] },
    tun: { enable: true, stack: "system", "auto-route": false },
    "proxy-groups": [{ name: "airport auto", type: "url-test", url: "https://example.test/test", proxies: ["HK 01"] }],
  },
  provider: {
    "proxy-providers": { airport: { type: "file", path: "./airport.yaml", override: { udp: true } } },
    dns: { enable: false }, tun: { enable: false },
    "proxy-groups": [{ name: "airport failover", type: "fallback", url: "https://example.test/fallback", use: ["airport"] }],
  },
};

test("bettbox: visual metadata groups existing business keys without changing defaults", () => {
  const context = vm.createContext({});
  const source = fs.readFileSync(path.join(ROOT, "bettbox.override.js"), "utf8");
  vm.runInContext(`${source}\nmetadata = Compatible_With_Bettbox; options = ruleOptionsEnable;`, context);
  const metadata = clone(context.metadata);
  const options = clone(context.options);
  const businessKeys = [
    "Gemini", "AI", "YouTube", "Netflix", "DisneyPlus", "Google", "GitHub",
    "Microsoft", "Apple", "Telegram", "PayPal", "GlobalMedia", "GlobalSites", "Domestic",
  ];
  assert.equal(metadata.ruleOptionsEnable, true);
  assert.deepEqual(metadata.policyGroupOptions, businessKeys);
  assert.deepEqual(Object.keys(options), [...businessKeys, "规则集走代理", "链式代理"]);
  assert.ok(businessKeys.every(key => options[key] === true));
  assert.equal(options["规则集走代理"], true);
  assert.equal(options["链式代理"], false);
  assert.deepEqual(Object.keys(options).filter(key => !metadata.policyGroupOptions.includes(key)), ["规则集走代理", "链式代理"]);
});

test("bettbox: NTP-only transport retains its dependency closure without DNS", () => {
  const input = {
    proxies: [node("upstream")],
    ntp: { enable: true, server: "ntp.example.test", port: 123, interval: 30, "dialer-proxy": "ntp transport" },
    "proxy-groups": [
      { name: "ntp transport", type: "select", proxies: ["ntp nested"] },
      { name: "ntp nested", type: "select", proxies: ["upstream"] },
      { name: "unused", type: "select", proxies: ["DIRECT"] },
    ],
  };
  const result = apply("bettbox", input);
  assert.deepEqual(result.ntp, input.ntp);
  assert.deepEqual(byName(result, result.ntp["dialer-proxy"]).proxies, ["ntp nested"]);
  assert.deepEqual(byName(result, "ntp nested").proxies, ["upstream"]);
  assert.ok(!result["proxy-groups"].some(group => group.name === "unused"));
  assertDefaults(result);
  assertRepeated("bettbox", result);
});

test("bettbox: NTP transport aliases generated-group collisions and reserves inline names", () => {
  const alias = `🧩 机场·${CATCH_ALL}`;
  const input = {
    proxies: [node("upstream"), node(alias)],
    ntp: { enable: true, server: "ntp.example.test", port: 123, interval: 30, "dialer-proxy": CATCH_ALL },
    "proxy-groups": [{ name: CATCH_ALL, type: "select", proxies: ["upstream"] }],
  };
  const result = apply("bettbox", input);
  assert.deepEqual(result.ntp, { ...input.ntp, "dialer-proxy": `${alias} 2` });
  assert.deepEqual(byName(result, result.ntp["dialer-proxy"]).proxies, ["upstream"]);
  assertDefaults(result);
  assertRepeated("bettbox", result);
});

for (const target of ["DIRECT", "upstream", "🚀 节点选择"]) {
  test(`bettbox: NTP existing target ${target} preserves ordinary routing`, () => {
    const base = { proxies: [node("upstream")] };
    const ntp = { enable: true, server: "ntp.example.test", port: 123, interval: 30, "dialer-proxy": target };
    const result = apply("bettbox", { ...base, ntp });
    assert.deepEqual(result, { ...apply("bettbox", base), ntp });
    assertDefaults(result);
    assertRepeated("bettbox", result);
  });
}

for (const client of CLIENTS) {
  for (const [scenario, input] of Object.entries(ordinaryFixtures)) {
    test(`${client}: ${scenario}, defaults and client-owned fields`, () => {
      const result = apply(client, input);
      assert.equal(result["proxy-groups"].length, 32);
      assertDefaults(result);
      for (const key of ["proxies", "proxy-providers", "dns", "tun"]) {
        assert.deepEqual(result[key], input[key], `${key} changed`);
      }
      assertRepeated(client, result);
      if (process.env.RULEFORGE_BASELINE_DIR) {
        assert.deepEqual(result, apply(client, input, {}, process.env.RULEFORGE_BASELINE_DIR));
      }
    });
  }

  test(`${client}: disabled switches keep existing behavior`, () => {
    const options = { Gemini: false, Domestic: false, Microsoft: false, "规则集走代理": false };
    const result = apply(client, ordinaryFixtures.inline, options);
    for (const name of ["🧠 Gemini", "🇨🇳 国内应用", "🪟 Microsoft"]) {
      assert.ok(!result["proxy-groups"].some(group => group.name === name));
    }
    assert.ok(result.rules.includes("GEOIP,CN,DIRECT,no-resolve"));
    assert.ok(!result.rules.some(rule => rule.includes("login.live.com")));
    assert.ok(Object.values(result["rule-providers"]).every(provider => provider.proxy === "DIRECT"));
    assertGraph(result);
    assertRepeated(client, result, options);
    if (process.env.RULEFORGE_BASELINE_DIR) {
      assert.deepEqual(result, apply(client, ordinaryFixtures.inline, options, process.env.RULEFORGE_BASELINE_DIR));
    }
  });

  test(`${client}: catch-all collision preserves subscription chain and generated catch-all`, () => {
    const input = {
      proxies: [node("HK 01", { "dialer-proxy": CATCH_ALL }), node("upstream")],
      "proxy-groups": [{ name: CATCH_ALL, type: "select", proxies: ["upstream"] }],
    };
    const result = apply(client, input);
    const alias = result.proxies[0]["dialer-proxy"];
    assert.equal(alias, `🧩 机场·${CATCH_ALL}`);
    assert.deepEqual(byName(result, alias).proxies, ["upstream"]);
    assertDefaults(result);
    assertRepeated(client, result);
  });

  test(`${client}: provider and nested group dependencies survive alias collisions`, () => {
    const alias = `🧩 机场·${CATCH_ALL}`;
    const input = {
      proxies: [node("upstream"), node("backup")],
      "proxy-providers": { airport: { type: "file", path: "./airport.yaml", override: { "dialer-proxy": CATCH_ALL } } },
      "proxy-groups": [
        { name: CATCH_ALL, type: "select", proxies: [alias], "dialer-proxy": "nested dialer" },
        { name: alias, type: "select", proxies: ["upstream"] },
        { name: "nested dialer", type: "select", proxies: ["backup"] },
        { name: "unused", type: "select", proxies: ["DIRECT"] },
      ],
    };
    const result = apply(client, input);
    const root = result["proxy-providers"].airport.override["dialer-proxy"];
    assert.equal(root, `${alias} 2`);
    assert.deepEqual(byName(result, root).proxies, [alias]);
    assert.equal(byName(result, root)["dialer-proxy"], "nested dialer");
    assert.deepEqual(byName(result, alias).proxies, ["upstream"]);
    assert.deepEqual(byName(result, "nested dialer").proxies, ["backup"]);
    assert.ok(!result["proxy-groups"].some(group => group.name === "unused"));
    assertDefaults(result);
    assertRepeated(client, result);
  });

  test(`${client}: opt-in chain remains stable across repeated applications`, () => {
    const options = { "链式代理": true };
    const input = { proxies: [node("自建 US landing"), node("HK 01")] };
    const result = apply(client, input, options);
    assert.equal(result["proxy-groups"].length, 33);
    assert.equal(result.proxies[0]["dialer-proxy"], CHAIN);
    assertDefaults(result);
    assertRepeated(client, result, options);
    assert.deepEqual(apply(client, reverseKeys(result), options), result, "object key order changed graph recognition");
    // Switching off auto-assignment must not erase an already-required chain.
    const disabled = apply(client, result);
    assert.equal(disabled.proxies[0]["dialer-proxy"], CHAIN);
    assertGraph(disabled);
    assertRepeated(client, disabled);
  });

  test(`${client}: a generated-looking parent retains a differing subscription child`, () => {
    const options = { "链式代理": true };
    const template = apply(client, {}, options);
    const parent = clone(byName(template, CHAIN));
    const input = {
      proxies: [node("custom exit", { "dialer-proxy": CHAIN }), node("upstream")],
      "proxy-groups": [parent, { name: MAIN[0], type: "select", proxies: ["upstream"] }],
    };
    const result = apply(client, input, options);
    const alias = result.proxies[0]["dialer-proxy"];
    assert.equal(alias, `🧩 机场·${CHAIN}`);
    assert.equal(byName(result, alias).proxies[0], `🧩 机场·${MAIN[0]}`);
    assert.deepEqual(byName(result, `🧩 机场·${MAIN[0]}`).proxies, ["upstream"]);
    assertDefaults(result);
    assertRepeated(client, result, options);
  });

  for (const type of ["url-test", "load-balance"]) {
    test(`${client}: ${type} dialer dependencies are stable`, () => {
      const input = {
        proxies: [node("HK 01", { "dialer-proxy": "uplink" }), node("upstream")],
        "proxy-groups": [{ name: "uplink", type, url: "https://example.test/test", interval: 300, proxies: ["upstream"] }],
      };
      const result = apply(client, input);
      assert.equal(result.proxies[0]["dialer-proxy"], "uplink");
      if (client === "clash-party") {
        assert.deepEqual(byName(result, "uplink").proxies, ["uplink ·内核"]);
        assert.equal(byName(result, "uplink ·内核").type, type);
        assert.equal(result["proxy-groups"].length, 34);
      } else {
        assert.deepEqual(byName(result, "uplink"), input["proxy-groups"][0]);
        assert.equal(result["proxy-groups"].length, 33);
      }
      assertDefaults(result);
      assertRepeated(client, result);
    });
  }
}

for (const type of ["url-test", "load-balance"]) {
  test(`clash-party: ${type} wrappers cover provider/group dialers but not plain members`, () => {
    const input = {
      proxies: [node("upstream")],
      "proxy-providers": { airport: { type: "file", path: "./airport.yaml", override: { "dialer-proxy": "outer" } } },
      "proxy-groups": [
        { name: "outer", type: "select", proxies: ["plain member"], "dialer-proxy": "inner dialer" },
        { name: "plain member", type, url: "https://example.test/test", proxies: ["upstream"] },
        { name: "inner dialer", type, url: "https://example.test/test", proxies: ["upstream"] },
      ],
    };
    const result = apply("clash-party", input);
    assert.equal(byName(result, "plain member").type, type);
    assert.deepEqual(byName(result, "inner dialer").proxies, ["inner dialer ·内核"]);
    assertDefaults(result);
    assertRepeated("clash-party", result);
  });
}

for (const client of CLIENTS) {
  for (const field of ["proxy", "dialer-proxy", "payload"]) {
    test(`${client}: proxy-provider ${field} retains its transport dependency`, () => {
      const provider = { type: "http", url: "https://example.test/sub.yaml", path: "./airport.yaml" };
      if (field === "payload") provider.payload = [node("provider exit", { "dialer-proxy": CATCH_ALL })];
      else provider[field] = CATCH_ALL;
      const input = {
        proxies: [node("upstream")],
        "proxy-providers": { airport: provider },
        "proxy-groups": [{ name: CATCH_ALL, type: "url-test", url: "https://example.test/test", proxies: ["upstream"] }],
      };
      const result = apply(client, input);
      const alias = `🧩 机场·${CATCH_ALL}`;
      const actual = result["proxy-providers"].airport;
      assert.equal(field === "payload" ? actual.payload[0]["dialer-proxy"] : actual[field], alias);
      const transport = byName(result, alias);
      if (client === "clash-party") {
        assert.equal(transport.type, "select");
        assert.equal(byName(result, transport.proxies[0]).type, "url-test");
      } else assert.equal(transport.type, "url-test");
      assertDefaults(result);
      assertRepeated(client, result);
    });
  }

  test(`${client}: DNS transports keep encoded selectors and fragment parameters`, () => {
    const raw = `https://example.test/dns-query#${encodeURIComponent(CATCH_ALL)}&h3=true&ecs=1.2.3.0/24`;
    const input = {
      proxies: [node("upstream")],
      "proxy-groups": [{ name: CATCH_ALL, type: "load-balance", url: "https://example.test/test", proxies: ["upstream"] }],
      dns: {
        enable: true,
        nameserver: [raw, "https://example.test/dns-query#eth0&h3=true"],
        fallback: [raw], "default-nameserver": [raw],
        "proxy-server-nameserver": [raw], "direct-nameserver": [raw],
        "nameserver-policy": { "+.example.com": raw },
        "proxy-server-nameserver-policy": { "+.example.com": [raw] },
      },
    };
    const result = apply(client, input);
    const alias = `🧩 机场·${CATCH_ALL}`;
    const expected = `https://example.test/dns-query#${encodeURIComponent(alias)}&h3=true&ecs=1.2.3.0/24`;
    for (const field of ["nameserver", "fallback", "default-nameserver", "proxy-server-nameserver", "direct-nameserver"]) {
      assert.equal(result.dns[field][0], expected);
    }
    assert.equal(result.dns.nameserver[1], input.dns.nameserver[1]);
    assert.equal(result.dns["nameserver-policy"]["+.example.com"], expected);
    assert.deepEqual(result.dns["proxy-server-nameserver-policy"]["+.example.com"], [expected]);
    if (client === "clash-party") assert.equal(byName(result, alias).type, "select");
    else assert.equal(byName(result, alias).type, "load-balance");
    assertDefaults(result);
    assertRepeated(client, result);
  });

  test(`${client}: retain only referenced DNS, TUN and sniffer rule providers`, () => {
    const input = {
      proxies: [node("upstream")],
      "proxy-groups": [{ name: CATCH_ALL, type: "select", proxies: ["upstream"] }],
      "rule-providers": {
        AI: { type: "http", behavior: "domain", format: "yaml", url: "https://example.test/domains.yaml", path: "./dns-domains.yaml", proxy: CATCH_ALL },
        Local: { type: "inline", behavior: "domain", payload: ["+.example.test"] },
        IPs: { type: "inline", behavior: "ipcidr", payload: ["192.0.2.0/24"] },
        ExcludeIPs: { type: "inline", behavior: "ipcidr", payload: ["198.51.100.0/24"] },
        "🧩 机场规则·AI": { type: "inline", behavior: "domain", payload: ["+.unused.test"] },
        unused: { type: "inline", behavior: "domain", payload: ["+.unused.test"] },
      },
      dns: {
        enable: true, nameserver: ["223.5.5.5"],
        "nameserver-policy": { "rule-set:AI,Local": ["223.5.5.5"], "+.example.test": "223.5.5.5" },
        "proxy-server-nameserver-policy": { "rule-set:Local,AI": "223.5.5.5" },
        "fake-ip-filter": ["rule-set:AI,Local", "*.lan"],
        "fallback-filter": { domain: ["+.example.test"] },
      },
      tun: { enable: true, "route-address-set": ["IPs"], "route-exclude-address-set": ["ExcludeIPs"] },
      sniffer: {
        enable: true, "force-domain": ["rule-set:AI"], "skip-domain": ["rule-set:Local,AI"],
        "skip-src-address": ["rule-set:IPs"], "skip-dst-address": ["rule-set:ExcludeIPs"],
      },
    };
    const result = apply(client, input);
    const alias = "🧩 机场规则·AI 2";
    assert.equal(result["rule-providers"][alias].proxy, `🧩 机场·${CATCH_ALL}`);
    assert.equal(result["rule-providers"][alias].url, input["rule-providers"].AI.url);
    assert.equal(result["rule-providers"].AI.url, "https://anfeng-crystal.github.io/proxy-rules-dist/clash/AI/AI.yaml");
    assert.ok(result.rules.includes("RULE-SET,AI,🤖 AI"));
    for (const name of ["Local", "IPs", "ExcludeIPs"]) {
      assert.deepEqual(result["rule-providers"][name], input["rule-providers"][name]);
    }
    assert.ok(!result["rule-providers"].unused);
    assert.ok(!result["rule-providers"]["🧩 机场规则·AI"]);
    assert.deepEqual(result.dns["nameserver-policy"][`rule-set:${alias},Local`], ["223.5.5.5"]);
    assert.equal(result.dns["proxy-server-nameserver-policy"][`rule-set:Local,${alias}`], "223.5.5.5");
    assert.deepEqual(result.dns["fake-ip-filter"], [`rule-set:${alias},Local`, "*.lan"]);
    assert.deepEqual(result.dns["fallback-filter"], input.dns["fallback-filter"]);
    assert.deepEqual(result.tun, input.tun);
    assert.deepEqual(result.sniffer["force-domain"], [`rule-set:${alias}`]);
    assert.deepEqual(result.sniffer["skip-domain"], [`rule-set:Local,${alias}`]);
    assertDefaults(result);
    assertRepeated(client, result);
  });

  test(`${client}: fake-IP rule mode and TUN provider-name collisions are remapped`, () => {
    const input = {
      "rule-providers": {
        AI: { type: "inline", behavior: "domain", payload: ["+.example.test"] },
        Google: { type: "inline", behavior: "ipcidr", payload: ["192.0.2.0/24"] },
      },
      dns: { "fake-ip-filter-mode": "rule", "fake-ip-filter": ["RULE-SET,AI,real-ip", "MATCH,fake-ip"] },
      tun: { "route-address-set": ["Google"], "route-exclude-address-set": ["Google"] },
      sniffer: { "skip-src-address": ["rule-set:Google"] },
    };
    const result = apply(client, input);
    assert.deepEqual(result.dns["fake-ip-filter"], ["RULE-SET,🧩 机场规则·AI,real-ip", "MATCH,fake-ip"]);
    assert.deepEqual(result.tun["route-address-set"], ["🧩 机场规则·Google"]);
    assert.deepEqual(result.tun["route-exclude-address-set"], ["🧩 机场规则·Google"]);
    assert.deepEqual(result.sniffer["skip-src-address"], ["rule-set:🧩 机场规则·Google"]);
    assert.deepEqual(result["rule-providers"]["🧩 机场规则·AI"], input["rule-providers"].AI);
    assert.deepEqual(result["rule-providers"]["🧩 机场规则·Google"], input["rule-providers"].Google);
    assertDefaults(result);
    assertRepeated(client, result);
  });
}

for (const client of CLIENTS) {
  test(`${client}: arbitrary rule-provider keys remain own enumerable properties`, () => {
    const input = JSON.parse('{"dns":{"nameserver-policy":{"rule-set:__proto__":["223.5.5.5"]}},"rule-providers":{"__proto__":{"type":"inline","behavior":"domain","payload":["+.example.com"]}}}');
    const result = apply(client, input);
    assert.ok(Object.prototype.hasOwnProperty.call(result["rule-providers"], "__proto__"));
    assert.deepEqual(result["rule-providers"].__proto__, input["rule-providers"].__proto__);
    assert.deepEqual(result.dns, input.dns);
    assertRepeated(client, result);
  });

  for (const type of ["file", "http"]) {
    test(`${client}: generated HTTP cache does not overwrite a retained ${type} provider path`, () => {
      const original = { type, behavior: "domain", format: "yaml", path: "./rule-providers/anfeng_AI.yaml" };
      if (type === "http") original.url = "https://example.test/original.yaml";
      const input = {
        dns: { "nameserver-policy": { "rule-set:AI": "223.5.5.5" } },
        "rule-providers": { AI: original },
        "proxy-providers": { airport: { type: "file", path: "./rule-providers/anfeng_AI_ruleforge.yaml" } },
      };
      const result = apply(client, input);
      assert.deepEqual(result["rule-providers"]["🧩 机场规则·AI"], original);
      assert.equal(result["rule-providers"].AI.path, "./rule-providers/anfeng_AI_ruleforge_2.yaml");
      assert.deepEqual(result["proxy-providers"], input["proxy-providers"]);
      assertDefaults(result);
      assertRepeated(client, result);
    });
  }
}

// Model the documented Smart rename stage, not a live Clash Party execution.
// Source: github.com/mihomo-party-org/clash-party/blob/smart_core/src/main/config/smartOverride.ts
function smartRename(input) {
  const config = clone(input);
  const renamed = new Map();
  for (const group of config["proxy-groups"]) {
    if (!["url-test", "load-balance"].includes(group.type)) continue;
    renamed.set(group.name, `${group.name}(Smart Group)`);
    group.name = renamed.get(group.name);
    group.type = "smart";
    group["policy-priority"] = "";
    group.uselightgbm = false;
    group.collectdata = false;
    for (const key of ["url", "interval", "lazy"]) delete group[key];
  }
  for (const group of config["proxy-groups"]) {
    if (group.proxies) group.proxies = group.proxies.map(name => renamed.get(name) || name);
  }
  return config;
}

test("clash-party: Smart stage leaves node/provider/rule-provider/DNS transports valid", () => {
  const input = {
    proxies: [node("exit", { "dialer-proxy": "transport" }), node("upstream")],
    "proxy-groups": [{ name: "transport", type: "url-test", url: "https://example.test/test", proxies: ["upstream"] }],
    "proxy-providers": { airport: { type: "http", url: "https://example.test/sub.yaml", path: "./airport.yaml", proxy: "transport", "dialer-proxy": "transport" } },
    "rule-providers": { Local: { type: "http", behavior: "domain", format: "yaml", url: "https://example.test/local.yaml", path: "./local.yaml", proxy: "transport" } },
    dns: { nameserver: ["https://example.test/dns-query#transport&h3=true"], "nameserver-policy": { "rule-set:Local": "223.5.5.5" } },
  };
  const result = smartRename(apply("clash-party", input));
  assert.equal(byName(result, "transport").type, "select");
  assert.equal(byName(result, "transport ·内核(Smart Group)").type, "smart");
  assert.equal(result.proxies[0]["dialer-proxy"], "transport");
  assert.equal(result["proxy-providers"].airport.proxy, "transport");
  assert.equal(result["proxy-providers"].airport["dialer-proxy"], "transport");
  assert.equal(result["rule-providers"].Local.proxy, "transport");
  assert.equal(result.dns.nameserver[0], "https://example.test/dns-query#transport&h3=true");
  assertGraph(result);
  assert.deepEqual(smartRename(apply("clash-party", result)), result);
});

for (const client of CLIENTS) {
  test(`${client}: subscription aliases cannot collide with existing inline nodes`, () => {
    const input = {
      proxies: [node("exit", { "dialer-proxy": CATCH_ALL }), node(`🧩 机场·${CATCH_ALL}`), node("upstream")],
      "proxy-groups": [{ name: CATCH_ALL, type: "select", proxies: ["upstream"] }],
    };
    const result = apply(client, input);
    assert.equal(result.proxies[0]["dialer-proxy"], `🧩 机场·${CATCH_ALL} 2`);
    assert.deepEqual(byName(result, `🧩 机场·${CATCH_ALL} 2`).proxies, ["upstream"]);
    assertDefaults(result);
    assertRepeated(client, result);
  });
}

test("clash-party: engine wrapper names cannot collide with existing inline nodes", () => {
  const input = {
    proxies: [node("exit", { "dialer-proxy": "uplink" }), node("uplink ·内核"), node("upstream")],
    "proxy-groups": [{ name: "uplink", type: "url-test", url: "https://example.test/test", proxies: ["upstream"] }],
  };
  const result = apply("clash-party", input);
  assert.deepEqual(byName(result, "uplink").proxies, ["uplink ·内核 2"]);
  assertGraph(result);
  assertRepeated("clash-party", result);
});
