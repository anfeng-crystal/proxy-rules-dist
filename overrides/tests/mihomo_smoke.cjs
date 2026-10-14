"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");

// Generate credential-free configurations; file-based rule sets avoid HTTP fetches.
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "bettbox.override.js"), "utf8");
const safeRoot = process.env.MIHOMO_SMOKE_HOME || os.tmpdir();
fs.mkdirSync(safeRoot, { recursive: true });
const tmp = fs.mkdtempSync(path.join(safeRoot, "bettbox-mihomo-"));
const node = name => ({
  name, type: "ss", server: "192.0.2.1", port: 443,
  cipher: "aes-128-gcm", password: "ci-only-password",
});
const regions = ["🇭🇰 香港01", "🇹🇼 台湾01", "🇯🇵 日本01", "🇸🇬 新加坡01", "🇺🇸 美国01"];

function build(name, options = {}, extra = {}) {
  const input = {
    mode: "rule",
    "mixed-port": 7890,
    "allow-lan": false,
    "log-level": "warning",
    "geodata-mode": true,
    proxies: regions.map(node),
    "proxy-providers": {},
    dns: { enable: false },
    ...extra,
  };
  const context = vm.createContext({ input, options });
  vm.runInContext(
    source + '\nObject.assign(ruleOptionsEnable, options); output = main(input, "CI");',
    context,
  );
  const result = JSON.parse(JSON.stringify(context.output));
  assert.equal(result["proxy-groups"].at(-1).name, "🐟 漏网之鱼");
  const folder = path.join(tmp, name);
  fs.mkdirSync(folder, { recursive: true });
  for (const [id, provider] of Object.entries(result["rule-providers"])) {
    const stub = path.join(folder, "providers", id + ".yaml");
    fs.mkdirSync(path.dirname(stub), { recursive: true });
    fs.writeFileSync(stub, "payload:\n  - DOMAIN,example.invalid\n");
    provider.type = "file";
    provider.path = stub;
    delete provider.url;
    delete provider.interval;
    delete provider.proxy;
  }
  const filename = path.join(folder, "config.json");
  fs.writeFileSync(filename, JSON.stringify(result, null, 2));
  return filename;
}
const configs = [
  build("default"),
  build("chain", { "链式代理": true }, {
    proxies: [...regions.map(node), node("自建 US landing")],
  }),
  build("unsafe", { "链式代理": true }, {
    proxies: [...regions.map(node), {
      ...node("🇭🇰 chained proxy"), "dialer-proxy": "🔗 链式中转",
    }],
  }),
];
for (const name of configs) console.log(name);
