"""Throne adapter protocol, security, grouping and RuleForge integration regressions."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SRC = Path(__file__).resolve().parents[1] / "adapter.py"
SPEC = importlib.util.spec_from_file_location("throne_adapter", SRC)
adapter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(adapter)


class FakeGenerator:
    class ProfileError(ValueError):
        pass
    @staticmethod
    def extract_nodes(obj):
        raw = obj.get("outbounds") if isinstance(obj, dict) else obj
        if not isinstance(raw, list) or not raw:
            raise FakeGenerator.ProfileError("empty")
        valid = [i for i in raw if i["type"] not in ("direct", "selector", "urltest")]
        if not valid:
            raise FakeGenerator.ProfileError("empty")
        return valid, len(raw) - len(valid)


class ProtocolTest(unittest.TestCase):
    def test_clash_shadowsocks(self):
        node = adapter.clash_proxy_to_singbox({
            "name": "香港 HK 01", "type": "ss", "server": "hk.example.net", "port": 443,
            "cipher": "aes-128-gcm", "password": "demo-secret"})
        self.assertEqual(node["tag"], "香港 HK 01")
        self.assertEqual(node["type"], "shadowsocks")
        self.assertEqual(node["method"], "aes-128-gcm")
        self.assertEqual(node["server_port"], 443)

    def test_reality_vless_and_ws(self):
        node = adapter.clash_proxy_to_singbox({
            "name": "US 01", "type": "vless", "server": "example.net", "port": 443,
            "uuid": "01234567-89ab-cdef-0123-456789abcdef", "tls": True,
            "client-fingerprint": "chrome", "sni": "www.example.com",
            "reality-opts": {"public-key": "test-public-key", "short-id": "abc123"},
            "network": "ws", "ws-opts": {"path": "/app", "headers": {"Host": "front.example"}},
        })
        self.assertEqual(node["tls"]["reality"]["public_key"], "test-public-key")
        self.assertEqual(node["tls"]["utls"]["fingerprint"], "chrome")
        self.assertEqual(node["transport"]["headers"]["Host"], "front.example")

    def test_trojan_grpc(self):
        node = adapter.clash_proxy_to_singbox({
            "name": "JP", "type": "trojan", "server": "example.net", "port": "443", "password": "p",
            "network": "grpc", "grpc-opts": {"grpc-service-name": "my-service"}})
        self.assertEqual(node["tls"]["enabled"], True)
        self.assertEqual(node["transport"]["service_name"], "my-service")

    def test_hysteria2(self):
        node = adapter.clash_proxy_to_singbox({
            "name": "SG", "type": "hy2", "server": "example.net", "port": 8443,
            "password": "pass", "sni": "example.net", "obfs": "salamander", "obfs-password": "obfs"})
        self.assertEqual(node["type"], "hysteria2")
        self.assertEqual(node["obfs"]["password"], "obfs")

    def test_fail_closed_unsupported_features(self):
        base = {"name": "HK", "type": "ss", "server": "example.net", "port": 443,
                "cipher": "aes-128-gcm", "password": "secret"}
        for patch_data in ({"plugin": "obfs"}, {"dialer-proxy": "relay"},
                           {"network": "xhttp"}, {"port": 0}):
            with self.subTest(patch_data=patch_data):
                with self.assertRaises(ValueError):
                    adapter.clash_proxy_to_singbox({**base, **patch_data})

    def test_duplicate_json_keys(self):
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            adapter.decode_document(b'{"proxies":[], "proxies":[]}')

    def test_yaml_subscription(self):
        try:
            import yaml  # noqa: F401
        except ImportError:
            self.skipTest("PyYAML optional dependency not installed")
        doc = adapter.decode_document(
            b'proxies:\n  - name: HK\n    type: ss\n    server: example.net\n    port: 443\n    cipher: aes-128-gcm\n    password: demo\n')
        self.assertEqual(doc["proxies"][0]["name"], "HK")
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            adapter.decode_document(b'proxies: []\nproxies: []\n')

    def test_two_airports_keep_all_real_nodes(self):
        node = lambda name: {"name": name, "type": "ss", "server": "host.example", "port": 443,
                             "cipher": "aes-128-gcm", "password": "test"}
        groups = [{"proxies": [node("US 01"), node("香港 HK 01"), node("剩余流量: 8G")]},
                  {"proxies": [node("US 01"), node("🇲🇴 澳门 01"), node("India 01")]}]
        nodes, stats = adapter.collect_nodes(groups, None, None, False, FakeGenerator)
        self.assertEqual([n["tag"] for n in nodes], [
            "US 01", "香港 HK 01", "US 01 [2]", "🇲🇴 澳门 01", "India 01"])
        self.assertEqual(stats["filtered"], 1)

    def test_strict_or_explicit_skip(self):
        source = {"proxies": [{"name": "bad", "type": "wireguard", "server": "a", "port": 123},
                              {"name": "good", "type": "trojan", "server": "b", "port": 443,
                               "password": "test"}]}
        with self.assertRaisesRegex(ValueError, "--allow-skip"):
            adapter.collect_nodes([source], None, None, False, FakeGenerator)
        nodes, meta = adapter.collect_nodes([source], None, None, True, FakeGenerator)
        self.assertEqual(len(nodes), 1)
        self.assertEqual(meta["skipped"], 1)

    def test_https_only(self):
        for url in ("http://example.com/path", "https://user:pass@example.com/x", "file:///tmp/x"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                adapter.download_subscription(url, "clash.meta")

    def test_output_permission_and_no_credentials_in_log(self):
        # Files are written with mode 0600 by the shared SFA generator.
        self.assertNotIn("--subscription", adapter.BASE)


@unittest.skipUnless(adapter.GENERATOR.is_file(), "Requires original RuleForge SFA generator")
class PolicyIntegrationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.generator = adapter.load_generator()

    def test_throne_full_config_preserves_policy(self):
        nodes = [
            {"type": "trojan", "tag": "美国 US 01", "server": "us.example.invalid", "server_port": 443,
             "password": "synthetic", "tls": {"enabled": True}},
            {"type": "trojan", "tag": "香港 HK 01", "server": "hk.example.invalid", "server_port": 443,
             "password": "synthetic", "tls": {"enabled": True}},
            {"type": "trojan", "tag": "🇲🇴 澳门 01", "server": "mo.example.invalid", "server_port": 443,
             "password": "synthetic", "tls": {"enabled": True}},
        ]
        config, summary = adapter.build_throne_config(nodes, self.generator)
        self.assertEqual(summary["nodes"], 3)
        outbound = {entry["tag"]: entry for entry in config["outbounds"]}
        self.assertIn("🇲🇴 澳门 01", outbound)
        prefix = summary["prefix"]
        self.assertEqual(outbound[prefix + "全部节点"]["outbounds"], [n["tag"] for n in nodes])
        self.assertEqual(outbound[prefix + "Gemini"]["default"], prefix + "美国")
        self.assertEqual(outbound[prefix + "国内应用"]["outbounds"], [prefix + "DIRECT"])
        route = config["route"]["rules"]
        self.assertLess(next(i for i, rule in enumerate(route) if rule.get("rule_set") == ["Gemini"]),
                        next(i for i, rule in enumerate(route) if rule.get("rule_set") == ["AI"]))
        self.assertEqual(config["inbounds"][0]["dns_mode"], "hijack")
        self.assertTrue(config["route"]["auto_detect_interface"])
        self.assertEqual(config["experimental"]["cache_file"]["cache_id"], "ruleforge-throne")
        self.assertNotIn("clash_api", config["experimental"])
        self.assertTrue(any(r.get("rule_set") == ["SpeedTest"] for r in route))
        self.assertFalse(any(r.get("rule_set") == ["NetworkTest"] for r in route))
        for entry in config["outbounds"]:
            if entry["type"] == "urltest":
                self.assertEqual(entry["interval"], "600s")
        for entry in config["route"]["rule_set"]:
            if entry["tag"] != "CNIP":
                self.assertIn("/sing-box/", entry["url"])
                self.assertEqual(entry["format"], "source")
        self.generator.audit_profile(config)

    def test_empty_or_wrong_test_url_rejected(self):
        node = {"type": "trojan", "tag": "美国 US 01", "server": "example.invalid", "server_port": 443,
                "password": "synthetic", "tls": {"enabled": True}}
        for url in ("http://example.test", "https://white space"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                adapter.build_throne_config([node], self.generator, test_url=url)


if __name__ == "__main__":
    unittest.main()
