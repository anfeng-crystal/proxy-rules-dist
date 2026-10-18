#!/usr/bin/env python3
"""Private subscription -> Throne Android 2.0.3 sing-box full configuration.

Reuses ../sing-box/generate_sfa.py for RuleForge policies, rule order and DNS.
Clash/Mihomo YAML input requires PyYAML; sing-box JSON needs only stdlib.
No subscription credentials are published or logged.
"""
from __future__ import annotations

import argparse
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://anfeng-crystal.github.io/proxy-rules-dist/sing-box"
GENERATOR = ROOT / "sing-box" / "generate_sfa.py"
MAX_BYTES = 16 * 1024 * 1024
SKIP_NAMES = re.compile(
    r"到期|剩余|流量|套餐|官网|网址|订阅|群组|客服|工单|更新|刷新|"
    r"traffic|expire|expired|reset|remain|(?:^|\W)trial(?:\W|$)|"
    r"(?:^|\W)(?:direct|reject|ads)(?:\W|$)", re.I
)
SUPPORTED = {"ss", "trojan", "vmess", "vless", "hysteria2", "hy2", "tuic", "socks5", "http"}


def load_generator():
    if not GENERATOR.is_file():
        raise ValueError("RuleForge's sing-box/generate_sfa.py is missing")
    spec = importlib.util.spec_from_file_location("ruleforge_sfa_generator", GENERATOR)
    if spec is None or spec.loader is None:
        raise ValueError("Unable to load the RuleForge generator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _pairs_unique(pairs):
    out = {}
    for key, value in pairs:
        if key in out:
            raise ValueError("Duplicate key in subscription JSON")
        out[key] = value
    return out


def decode_document(body: bytes, source_name: str = "subscription"):
    if len(body) > MAX_BYTES:
        raise ValueError("Subscription exceeds 16 MiB")
    try:
        content = body.decode("utf-8-sig")
    except UnicodeError:
        raise ValueError("Subscription is not UTF-8") from None
    try:
        result = json.loads(content, object_pairs_hook=_pairs_unique)
    except json.JSONDecodeError:
        try:
            import yaml
        except ImportError:
            raise ValueError("YAML subscription needs PyYAML: pip install PyYAML") from None
        class UniqueSafeLoader(yaml.SafeLoader):
            pass
        def construct_mapping(loader, node):
            loader.flatten_mapping(node)
            pairs = loader.construct_pairs(node, deep=True)
            return _pairs_unique(pairs)
        UniqueSafeLoader.add_constructor(
            yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, construct_mapping
        )
        try:
            result = yaml.load(io.StringIO(content), Loader=UniqueSafeLoader)
        except yaml.YAMLError:
            raise ValueError("Subscription is not valid JSON or Clash YAML") from None
    if not isinstance(result, (list, dict)):
        raise ValueError("Subscription must contain a JSON object/array or a Clash YAML object")
    return result


class HTTPSOnlyRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        if urllib.parse.urlsplit(newurl).scheme.lower() != "https":
            raise ValueError("Refusing a subscription redirect to non-HTTPS")
        return super().redirect_request(request, fp, code, msg, headers, newurl)


def download_subscription(url: str, user_agent: str) -> bytes:
    parts = urllib.parse.urlsplit(url)
    if parts.scheme.lower() != "https" or not parts.hostname or parts.username or parts.password:
        raise ValueError("Subscription URL must be HTTPS (without userinfo)")
    if not isinstance(user_agent, str) or "\r" in user_agent or "\n" in user_agent:
        raise ValueError("Invalid subscription User-Agent")
    opener = urllib.request.build_opener(HTTPSOnlyRedirect())
    request = urllib.request.Request(url, headers={"User-Agent": user_agent, "Accept": "*/*"})
    try:
        with opener.open(request, timeout=20) as response:
            if urllib.parse.urlsplit(response.url).scheme.lower() != "https":
                raise ValueError("Refusing a subscription redirect to non-HTTPS")
            raw = response.read(MAX_BYTES + 1)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        # URLs often contain secret tokens; never interpolate the exception, URL or response.
        raise ValueError(f"Cannot fetch the HTTPS subscription ({type(exc).__name__})") from None
    if len(raw) > MAX_BYTES:
        raise ValueError("Subscription exceeds 16 MiB")
    return raw


def _required(source, key: str):
    val = source.get(key)
    if val is None or val == "" or isinstance(val, bool):
        raise ValueError(f"Missing {key}")
    return val


def _port(source):
    val = _required(source, "port")
    if not str(val).isdigit() or not 1 <= int(val) <= 65535:
        raise ValueError("Invalid port")
    return int(val)


def _tls(p, required=False):
    requested = required or p.get("tls") is True or bool(p.get("reality-opts"))
    features = ("sni", "servername", "alpn", "skip-cert-verify", "client-fingerprint")
    if not requested and any(p.get(k) for k in features):
        raise ValueError("TLS options were supplied without TLS")
    if not requested:
        return None
    tls = {"enabled": True}
    sni = p.get("sni") or p.get("servername")
    if sni:
        tls["server_name"] = str(sni)
    if p.get("skip-cert-verify") is True:
        tls["insecure"] = True
    if p.get("alpn"):
        if not isinstance(p["alpn"], list) or not all(isinstance(x, str) for x in p["alpn"]):
            raise ValueError("TLS ALPN must be a list of strings")
        tls["alpn"] = p["alpn"]
    if p.get("client-fingerprint"):
        tls["utls"] = {"enabled": True, "fingerprint": str(p["client-fingerprint"])}
    if p.get("reality-opts"):
        opts = p["reality-opts"]
        if not isinstance(opts, dict) or not opts.get("public-key"):
            raise ValueError("Reality requires public-key")
        tls["reality"] = {"enabled": True, "public_key": str(opts["public-key"])}
        if opts.get("short-id"):
            tls["reality"]["short_id"] = str(opts["short-id"])
    return tls


def _transport(p):
    network = str(p.get("network") or "tcp").lower()
    if network == "tcp":
        return None
    if network == "ws":
        opts = p.get("ws-opts") or {}
        if not isinstance(opts, dict):
            raise ValueError("ws-opts must be an object")
        value = {"type": "ws", "path": str(opts.get("path") or "/")}
        if opts.get("headers"):
            if not isinstance(opts["headers"], dict):
                raise ValueError("WS headers must be a mapping")
            value["headers"] = {str(k): str(v) for k, v in opts["headers"].items()}
        return value
    if network == "grpc":
        opts = p.get("grpc-opts") or {}
        if not isinstance(opts, dict):
            raise ValueError("grpc-opts must be an object")
        return {"type": "grpc", "service_name": str(opts.get("grpc-service-name") or "")}
    if network in ("http", "h2"):
        opts = p.get("http-opts") or {}
        if not isinstance(opts, dict):
            raise ValueError("http-opts must be an object")
        value = {"type": "http"}
        if opts.get("path"):
            value["path"] = opts["path"][0] if isinstance(opts["path"], list) else opts["path"]
        if opts.get("headers", {}).get("Host"):
            hosts = opts["headers"]["Host"]
            value["host"] = hosts if isinstance(hosts, list) else [hosts]
        return value
    if network == "httpupgrade":
        opts = p.get("httpupgrade-opts") or {}
        if not isinstance(opts, dict):
            raise ValueError("httpupgrade-opts must be an object")
        value = {"type": "httpupgrade", "path": str(opts.get("path") or "/")}
        if opts.get("host"):
            value["host"] = str(opts["host"])
        return value
    raise ValueError(f"Unsupported network transport: {network}")


def clash_proxy_to_singbox(p: dict):
    """Fail closed for important dependencies rather than silently breaking a node."""
    if not isinstance(p, dict):
        raise ValueError("Clash node must be an object")
    kind = str(p.get("type") or "").lower()
    if kind not in SUPPORTED:
        raise ValueError("Unsupported Clash proxy type")
    for key in ("plugin", "plugin-opts", "dialer-proxy", "underlying-proxy", "reality", "ech-opts",
                "ports", "mport", "hop-interval", "udp-relay-mode", "reduce-rtt", "disable-sni"):
        if p.get(key):
            raise ValueError(f"Unsupported dependency/feature: {key}")
    for key in ("smux", "mux"):
        if isinstance(p.get(key), dict) and p[key].get("enabled"):
            raise ValueError(f"Unsupported dependency/feature: {key}")
    name = _required(p, "name")
    server = _required(p, "server")
    if not isinstance(name, str) or not name.strip() or not isinstance(server, str) or not server.strip():
        raise ValueError("Invalid name or server")
    out = {"tag": name.strip(), "type": {"ss": "shadowsocks", "hy2": "hysteria2", "socks5": "socks"}.get(kind, kind),
           "server": server, "server_port": _port(p)}
    if kind == "ss":
        out["method"] = str(_required(p, "cipher"))
        out["password"] = str(_required(p, "password"))
    elif kind in ("trojan", "hysteria2", "hy2"):
        out["password"] = str(_required(p, "password"))
    elif kind in ("vmess", "vless", "tuic"):
        out["uuid"] = str(_required(p, "uuid"))
        if kind == "tuic":
            out["password"] = str(_required(p, "password"))
        elif kind == "vmess":
            out["security"] = str(p.get("cipher") or "auto")
            out["alter_id"] = int(p.get("alterId") or 0)
        elif p.get("flow"):
            out["flow"] = str(p["flow"])
    elif kind in ("socks5", "http"):
        if p.get("username"):
            out["username"] = str(p["username"])
        if p.get("password"):
            out["password"] = str(p["password"])
    required_tls = kind in ("trojan", "hysteria2", "hy2", "tuic")
    tls = _tls(p, required_tls)
    if tls is not None:
        out["tls"] = tls
    if kind in ("hysteria2", "hy2"):
        if p.get("obfs"):
            if p["obfs"] != "salamander":
                raise ValueError("Unsupported Hysteria2 obfs")
            out["obfs"] = {"type": "salamander", "password": str(_required(p, "obfs-password"))}
        for clash_key, dest_key in (("up", "up_mbps"), ("down", "down_mbps")):
            if isinstance(p.get(clash_key), int) and p[clash_key] > 0:
                out[dest_key] = p[clash_key]
    if kind == "tuic" and p.get("congestion-controller"):
        out["congestion_control"] = str(p["congestion-controller"])
    transport = _transport(p)
    if transport:
        if kind not in ("vmess", "vless", "trojan"):
            raise ValueError("Transport is unsupported for this proxy type")
        out["transport"] = transport
    return out


def collect_nodes(sources, include, exclude, allow_skip, generator):
    nodes, used, failures = [], set(), []
    include_re = re.compile(include, re.I) if include else None
    exclude_re = re.compile(exclude, re.I) if exclude else None
    discarded = 0
    for number, value in enumerate(sources, 1):
        clash = isinstance(value, dict) and "proxies" in value
        if clash:
            items = value["proxies"]
            if not isinstance(items, list):
                raise ValueError("Clash proxies must be a list")
            candidates = []
            for index, item in enumerate(items, 1):
                if not isinstance(item, dict):
                    failures.append((number, index, "Not an object"))
                    continue
                name = item.get("name", "")
                if isinstance(name, str) and (SKIP_NAMES.search(name) or (include_re and not include_re.search(name)) or
                                             (exclude_re and exclude_re.search(name))):
                    discarded += 1
                    continue
                try:
                    candidates.append(clash_proxy_to_singbox(item))
                except (ValueError, TypeError, OverflowError) as exc:
                    failures.append((number, index, str(exc)))
        else:
            # SFA generator validates native sing-box nodes, groups and dependencies.
            try:
                candidates, ignored = generator.extract_nodes(value)
            except generator.ProfileError as exc:
                raise ValueError(f"Source {number}: {exc}") from None
            discarded += ignored
        for item in candidates:
            name = item["tag"]
            if not clash and (SKIP_NAMES.search(name) or (include_re and not include_re.search(name)) or
                              (exclude_re and exclude_re.search(name))):
                discarded += 1
                continue
            # Two airports may both name their first node HK-01. Resolve without dropping either.
            unique = name
            suffix = 2
            while unique in used:
                unique = f"{name} [{suffix}]"
                suffix += 1
            used.add(unique)
            copied = dict(item)
            copied["tag"] = unique
            nodes.append(copied)
    if failures and not allow_skip:
        details = "; ".join(f"source {src} proxy #{idx}: {reason}" for src, idx, reason in failures[:5])
        raise ValueError(f"{len(failures)} incompatible proxies (use --allow-skip to explicitly omit them): {details}")
    if not nodes:
        raise ValueError("No supported proxy nodes remain after filtering")
    # Validate converted nodes as native nodes, including unknown dependencies.
    try:
        generator.extract_nodes(nodes)
    except generator.ProfileError as exc:
        raise ValueError(f"Converted node validation failed: {exc}") from None
    return nodes, {"skipped": len(failures), "filtered": discarded}


def build_throne_config(nodes, generator, *, region_map=None, extras=(), ads=False,
                        rule_base=BASE, test_interval=600, test_url="https://www.gstatic.com/generate_204"):
    config, summary = generator.build_profile(
        {"outbounds": nodes}, rule_base, extras=extras, ads=ads, region_map=region_map
    )
    tun = next((inbound for inbound in config["inbounds"] if inbound.get("type") == "tun"), None)
    if tun is None:
        raise ValueError("Generated configuration has no TUN inbound")
    tun["dns_mode"] = "hijack"
    config["route"]["auto_detect_interface"] = True
    config["experimental"]["cache_file"]["cache_id"] = "ruleforge-throne"
    config["experimental"].pop("clash_api", None)  # Throne strips custom external controllers.
    if not 60 <= test_interval <= 3600:
        raise ValueError("Test interval must be between 60 and 3600 seconds")
    parsed_test = urllib.parse.urlsplit(test_url)
    if (parsed_test.scheme.lower() != "https" or not parsed_test.hostname
            or parsed_test.username or parsed_test.password or any(c.isspace() for c in test_url)):
        raise ValueError("Test URL must be a valid credential-free HTTPS URL")
    for outbound in config["outbounds"]:
        if outbound.get("type") == "urltest":
            outbound["interval"] = f"{test_interval}s"
            outbound["url"] = test_url
    generator.audit_profile(config)
    return config, summary


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", action="append", type=Path, default=[], help="Local sing-box JSON or Clash YAML; repeat")
    parser.add_argument("--subscription", action="append", default=[], help="Private HTTPS Clash/sing-box subscription URL; repeat")
    parser.add_argument("--output", type=Path, required=True, help="PRIVATE Throne full JSON profile (contains credentials)")
    parser.add_argument("--user-agent", default="clash.meta", help="Subscription request User-Agent")
    parser.add_argument("--rule-base", default=BASE)
    parser.add_argument("--include", help="Regex matching node names to keep")
    parser.add_argument("--exclude", help="Regex matching node names to omit")
    parser.add_argument("--allow-skip", action="store_true", help="Explicitly skip incompatible Clash proxy types")
    parser.add_argument("--extra-category", action="append", default=[], help="Additional published RuleForge bucket")
    parser.add_argument("--ads", action="store_true", help="Enable Ads blocking category")
    parser.add_argument("--region-map", type=Path, help="Local JSON: node name -> HK/TW/JP/SG/US/OTHER")
    parser.add_argument("--test-interval", type=int, default=600, help="Automatic node retest seconds (default 600)")
    parser.add_argument("--test-url", default="https://www.gstatic.com/generate_204")
    parser.add_argument("--force", action="store_true", help="Replace an existing private output atomically")
    args = parser.parse_args(argv)
    try:
        generator = load_generator()
        env_urls = os.environ.get("THRONE_SUBSCRIPTION_URLS", "").splitlines()
        urls = args.subscription + [u.strip() for u in env_urls if u.strip()]
        if not args.input and not urls:
            raise ValueError("Provide --input, --subscription or THRONE_SUBSCRIPTION_URLS")
        if any(file.resolve() == args.output.resolve() for file in args.input):
            raise ValueError("Output cannot replace input")
        if args.region_map and args.region_map.resolve() == args.output.resolve():
            raise ValueError("Output cannot replace region map")
        bodies = []
        for path in args.input:
            if path.stat().st_size > MAX_BYTES:
                raise ValueError("Local subscription exceeds 16 MiB")
            bodies.append(path.read_bytes())
        for url in urls:
            bodies.append(download_subscription(url, args.user_agent))
        sources = [decode_document(body) for body in bodies]
        nodes, stats = collect_nodes(sources, args.include, args.exclude, args.allow_skip, generator)
        region_map = generator.load_json(args.region_map) if args.region_map else None
        config, summary = build_throne_config(
            nodes, generator, region_map=region_map, extras=args.extra_category, ads=args.ads,
            rule_base=args.rule_base, test_interval=args.test_interval, test_url=args.test_url
        )
        args.output.parent.mkdir(parents=True, exist_ok=True)
        generator.write_private_json(args.output, config, args.force)
    except (ValueError, OSError, re.error, UnicodeError) as exc:
        # Explicit --subscription args and tokens are never included in exception messages.
        parser.error(str(exc))
    print(f"Created private Throne profile: {summary['nodes']} nodes; "
          f"groups: {summary['regions']}; filtered: {stats['filtered']}; skipped: {stats['skipped']}; "
          f"remote rule sets: {summary['rule_sets']}", file=sys.stderr)
    print("Credentials are inside the generated file. Do not publish it. "
          "Reimport after subscription changes; Throne 2.0.3 does not auto-refresh full configs.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
