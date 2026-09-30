"""Static Stash override regressions; run with Python 3 and PyYAML.

The merge model follows https://stash.wiki/configuration/override.
This does not run the Stash client or make network connectivity claims.
"""

import copy
import json
import re
import unittest
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
REGIONS = ["🇭🇰 香港", "🇹🇼 台湾", "🇯🇵 日本", "🇸🇬 新加坡", "🇺🇸 美国"]
BUILTINS = {"DIRECT", "REJECT", "REJECT-DROP", "PASS"}
METADATA_KEYS = {"name", "desc", "author", "version"}


class UniqueKeyLoader(yaml.SafeLoader):
    """Reject duplicate YAML keys instead of silently accepting the last one."""


def unique_mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError(f"Duplicate YAML key: {key}")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping
)


def read_override(path):
    text = path.read_text(encoding="utf-8")
    data = yaml.load(text, Loader=UniqueKeyLoader)
    # These overrides only use replacement directives at the document root.
    replace = set(re.findall(r"^([\w-]+):\s*#!replace\s*$", text, re.M))
    return data, replace


def merge_value(old, new):
    if isinstance(old, dict) and isinstance(new, dict):
        result = copy.deepcopy(old)
        for key, value in new.items():
            result[key] = merge_value(result.get(key), value)
        return result
    if isinstance(old, list) and isinstance(new, list):
        return copy.deepcopy(new + old)
    return copy.deepcopy(new)


def apply_override(base, override):
    data, replace = override
    result = copy.deepcopy(base)
    for key, value in data.items():
        if key in METADATA_KEYS:
            continue
        result[key] = (
            copy.deepcopy(value)
            if key in replace
            else merge_value(result.get(key), value)
        )
    return result


class StashOverrideTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.files = {
            path.relative_to(ROOT).as_posix(): read_override(path)
            for path in ROOT.rglob("*.stoverride")
        }
        cls.index = json.loads((ROOT / "modules/index.json").read_text())
        cls.core = cls.files["modules/99-core.stoverride"]
        cls.full = cls.files["ruleforge-full.stoverride"]
        cls.base = {
            "proxies": [{"name": "HK 01", "type": "direct"}],
            "proxy-providers": {"example": {"type": "file", "path": "nodes.yaml"}},
            "proxy-groups": [{"name": "Old group", "type": "select", "proxies": ["DIRECT"]}],
            "rule-providers": {"old": {"type": "file", "path": "old.yaml"}},
            "rules": ["DOMAIN,old.example,Old group", "MATCH,Old group"],
            "dns": {"enable": True, "nameserver": ["system"]},
            "tun": {"enable": True},
        }

    def test_all_yaml_and_regex_syntax(self):
        self.assertEqual(len(self.files), 17)
        for filename, (data, _) in self.files.items():
            with self.subTest(filename=filename):
                self.assertIsInstance(data, dict)
                for group in data.get("proxy-groups", []):
                    self.assertIn(group["type"], {"select", "url-test", "fallback"})
                    if "filter" in group:
                        re.compile(group["filter"])

    def test_core_first_and_reverse_module_order(self):
        expected = ["99-core.stoverride"] + sorted(
            [name.removeprefix("modules/") for name in self.files
             if name.startswith("modules/") and not name.endswith(("99-core.stoverride", "90-chain.stoverride"))],
            reverse=True,
        )
        self.assertEqual(self.index["order"], expected)
        self.assertEqual([m["file"] for m in self.index["modules"]], expected)
        self.assertEqual(self.index["version"], self.core[0]["version"])
        self.assertEqual(self.index["version"], self.full[0]["version"])
        for module in self.index["modules"]:
            self.assertTrue((ROOT / "modules" / module["file"]).is_file())
            self.assertTrue(module["url"].endswith("/" + module["file"]))

    def test_strict_replacement_preserves_subscription_network_settings(self):
        for override in [self.core, self.full]:
            self.assertTrue({"rules", "proxy-groups"}.issubset(override[1]))
            result = apply_override(self.base, override)
            for key in ["proxies", "proxy-providers", "dns", "tun"]:
                self.assertEqual(result[key], self.base[key])
                self.assertNotIn(key, override[0])
            self.assertFalse(any("Old group" in r for r in result["rules"]))
            self.assertEqual(result["rules"][-1], "MATCH,🐟 漏网之鱼")

    def test_all_16384_business_module_combinations(self):
        # Exhaust every subset, preserving the specified installation order.
        names = self.index["order"][1:]
        modules = [self.files["modules/" + name][0] for name in names]
        self.assertEqual(len(modules), 14)
        for mask in range(1 << len(modules)):
            rules = list(self.core[0]["rules"])
            enabled = []
            providers = {}
            for i, data in enumerate(modules):
                if mask & (1 << i):
                    rules = data["rules"] + rules
                    enabled.insert(0, data)
                    providers.update(data.get("rule-providers", {}))
            expected = [r for data in enabled for r in data["rules"]] + self.core[0]["rules"]
            self.assertEqual(rules, expected)
            self.assertEqual(sum(r.startswith("MATCH,") for r in rules), 1)
            self.assertEqual(rules[-1], "MATCH,🐟 漏网之鱼")
            for rule in rules:
                parts = rule.split(",")
                if parts[0] == "RULE-SET":
                    self.assertIn(parts[1], providers)

    def test_all_modules_merge_and_full_file_have_same_business_rules(self):
        result = self.base
        expected = []
        for name in self.index["order"]:
            result = apply_override(result, self.files["modules/" + name])
        for name in sorted(self.index["order"][1:]):
            expected.extend(self.files["modules/" + name][0]["rules"])
        self.assertEqual(result["rules"], expected + self.core[0]["rules"])
        # The full file already places private/LAN rules first; preserve that.
        full_rules = self.full[0]["rules"]
        self.assertEqual(full_rules[:2], self.core[0]["rules"][:2])
        self.assertEqual(full_rules[2:-2], expected)
        self.assertEqual(full_rules[-2:], self.core[0]["rules"][-2:])
        self.assertEqual(result["proxy-groups"], self.full[0]["proxy-groups"])
        self.assertEqual(apply_override(result, self.core)["rules"], self.core[0]["rules"])

    def test_groups_and_rule_references(self):
        for data, _ in [self.core, self.full]:
            groups = data["proxy-groups"]
            names = [group["name"] for group in groups]
            self.assertEqual(len(names), len(set(names)))
            by_name = {group["name"]: group for group in groups}
            self.assertEqual(names[-1], "🐟 漏网之鱼")
            regional = [region + suffix for suffix in ["节点", "自动", "故障转移"] for region in REGIONS]
            self.assertEqual([name for name in names if name in regional], regional)
            self.assertFalse(any("手动" in name for name in names))
            self.assertEqual(by_name["🧠 Gemini"]["proxies"][0], "🇺🇸 美国节点")
            self.assertEqual(by_name["🇨🇳 国内应用"]["proxies"], ["DIRECT"])
            for region in REGIONS:
                self.assertEqual(by_name[region + "节点"]["proxies"], [region + "自动", region + "故障转移"])
            for group in groups:
                for target in group.get("proxies", []):
                    self.assertIn(target, set(names) | BUILTINS)
            for rule in data["rules"]:
                parts = rule.split(",")
                target = parts[-2] if parts[-1] == "no-resolve" else parts[-1]
                self.assertIn(target, set(names) | BUILTINS)
                if parts[0] == "RULE-SET":
                    self.assertIn(parts[1], data["rule-providers"])
            self.assertIn("GEOIP,CN,DIRECT,no-resolve", data["rules"])

    def test_pseudo_nodes_are_filtered_without_removing_real_nodes(self):
        bad = ["香港 剩余流量 10 GB", "HK traffic 30GB", "美国 到期 2026-12", "SG 套餐信息", "JP expired", "台湾 官网 example.com", "100 GB / 500 GB", "2.5TiB|10TiB"]
        good = ["香港 01", "台湾 02", "日本 03", "新加坡 04", "美国 05"]
        for data, _ in [self.core, self.full]:
            for group in data["proxy-groups"]:
                if not group.get("include-all"):
                    continue
                regex = re.compile(group["filter"])
                for name in bad:
                    self.assertIsNone(regex.search(name), (group["name"], name))
                for i, region in enumerate(REGIONS):
                    if group["name"].startswith(region):
                        self.assertIsNotNone(regex.search(good[i]))
                        self.assertIsNotNone(regex.search(region + "自动"))
                        self.assertIsNotNone(regex.search(region + "故障转移"))
                        self.assertIsNone(regex.search(good[i] + " 落地"))
                if group["name"] == "🌍 全部节点":
                    for name in good + ["自建落地 01"]:
                        self.assertIsNotNone(regex.search(name))


if __name__ == "__main__":
    unittest.main()
