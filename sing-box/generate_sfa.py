#!/usr/bin/env python3
"""Generate a local, real-IP SFA profile from native sing-box JSON.

Python standard library only. No network requests, converter services, or installs.
Targets the documented sing-box 1.14.2 schema; static checks are not core validation.
"""

from __future__ import annotations

import argparse
import copy
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.parse import urlsplit


PROXY_TYPES = frozenset({
    "socks", "http", "shadowsocks", "vmess", "trojan", "vless",
    "hysteria", "hysteria2", "tuic", "anytls",
})
DISCARDED_TYPES = frozenset({"direct", "block", "dns", "selector", "urltest"})
REGIONS = ("HK", "TW", "JP", "SG", "US", "OTHER")
REGION_LABELS = {
    "HK": "香港", "TW": "台湾", "JP": "日本", "SG": "新加坡",
    "US": "美国", "OTHER": "其他",
}
REGION_PATTERNS = {
    "HK": r"香港|Hong[\s_-]*Kong|🇭🇰|(?<![a-z])HK(?![a-z])",
    "TW": r"台湾|台灣|Taiwan|🇹🇼|(?<![a-z])TW(?![a-z])",
    "JP": r"日本|东京|東京|Japan|🇯🇵|(?<![a-z])JP(?![a-z])",
    "SG": r"新加坡|狮城|獅城|Singapore|🇸🇬|(?<![a-z])SG(?![a-z])",
    "US": r"美国|美國|美西|美东|美東|United[\s_-]*States|🇺🇸|(?<![a-z])US(?:A)?(?![a-z])",
}
CORE_CATEGORIES = (
    "SpeedTest", "Gemini", "AI", "YouTube", "Netflix", "DisneyPlus", "Google", "GitHub",
    "PayPal", "GlobalMedia", "Telegram", "Microsoft", "Apple", "Domestic",
    "GlobalSites",
)
DISPLAY_LABELS = {"Domestic": "国内应用", "GlobalSites": "境外网站",
                  "GlobalMedia": "境外流媒体"}
EXTRA_FOREIGN = (
    "Dev", "Payment", "Game", "Spotify", "TikTok", "Twitter", "Facebook",
    "Instagram",
)
EXTRA_DOMESTIC = (
    "Bilibili", "Douyin", "WeChat", "TencentVideo", "iQIYI", "Youku",
    "NetEaseMusic", "Weibo", "Zhihu", "Baidu", "Alibaba", "Tencent", "JD",
    "Meituan", "Pinduoduo",
)
EXTRA_CATEGORIES = EXTRA_FOREIGN + EXTRA_DOMESTIC
LOCAL_DOMAINS = {"domain": ["localhost"], "domain_suffix": [".local", ".lan", ".home.arpa", ".localdomain"]}
MICROSOFT_LOGIN = ["login.live.com", "logincdn.msauth.net"]
DEFAULT_CNIP_URL = "https://raw.githubusercontent.com/SagerNet/sing-geoip/rule-set/geoip-cn.srs"
DEPENDENCY_KEYS = frozenset({
    "detour", "domain_resolver", "certificate_path", "client_certificate_path",
    "client_key_path", "private_key_path", "public_key_path",
})


class ProfileError(ValueError):
    """A local input cannot safely be represented by this template."""


def no_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ProfileError("JSON contains a duplicate object key")
        result[key] = value
    return result


def load_json(path: Path):
    if str(path).startswith(("https:", "http:")):
        raise ProfileError("Input must be a local file, never a subscription URL")
    if path.stat().st_size > 32 * 1024 * 1024:
        raise ProfileError("Input exceeds the 32 MiB safety limit")
    try:
        with path.open("r", encoding="utf-8-sig") as handle:
            return json.load(handle, object_pairs_hook=no_duplicate_keys,
                             parse_constant=lambda _: (_ for _ in ()).throw(ProfileError("Non-finite JSON numbers are not allowed")))
    except json.JSONDecodeError as error:
        raise ProfileError(f"Invalid JSON at line {error.lineno}, column {error.colno}") from None


def https_url(value: str, label: str) -> str:
    try:
        parts = urlsplit(value)
        port = parts.port
    except ValueError:
        raise ProfileError(f"{label} is not a valid HTTPS URL") from None
    if (parts.scheme != "https" or not parts.hostname or parts.username is not None
            or parts.password is not None or parts.query or parts.fragment
            or re.search(r"\s", value) or "\\" in value or (port is not None and port < 1)):
        raise ProfileError(f"{label} must be an HTTPS URL without credentials, query, fragment, or whitespace")
    return value.rstrip("/")


def dependencies(value, path="node"):
    if isinstance(value, dict):
        for key, child in value.items():
            if key in DEPENDENCY_KEYS and child not in (None, "", [], {}):
                raise ProfileError(f"Unsupported node dependency at {path}.{key}; flatten it locally first")
            dependencies(child, f"{path}.{key}")
    elif isinstance(value, list):
        for child in value:
            dependencies(child, path)


def extract_nodes(source):
    """Validate all upstream tags/groups; copy proxy nodes only, without rewriting."""
    if isinstance(source, dict):
        if "proxies" in source or "proxy-groups" in source:
            raise ProfileError("Clash/Mihomo input is unsupported; obtain native sing-box JSON")
        if source.get("endpoints"):
            raise ProfileError("Top-level endpoints are unsupported; provide standalone proxy outbounds")
        raw = source.get("outbounds")
    else:
        raw = source
    if not isinstance(raw, list) or not raw:
        raise ProfileError("Input must be a nonempty outbounds array or a sing-box object containing one")
    tags = set()
    groups = {}
    nodes = []
    discarded = 0
    for index, node in enumerate(raw):
        if not isinstance(node, dict):
            raise ProfileError(f"Outbound {index + 1} must be an object")
        tag = node.get("tag")
        if not isinstance(tag, str) or not tag.strip() or any(ord(c) < 32 for c in tag):
            raise ProfileError(f"Outbound {index + 1} needs a nonempty tag without control characters")
        if tag in tags:
            raise ProfileError("Duplicate outbound tags are not allowed")
        tags.add(tag)
        kind = node.get("type")
        if not isinstance(kind, str):
            raise ProfileError(f"Outbound {index + 1} needs a string type")
        if kind in PROXY_TYPES:
            dependencies(node)
            server = node.get("server")
            port = node.get("server_port")
            if not isinstance(server, str) or not server.strip() or re.search(r"\s", server):
                raise ProfileError(f"Proxy outbound {index + 1} needs a nonempty server")
            if isinstance(port, bool) or not isinstance(port, int) or not 1 <= port <= 65535:
                raise ProfileError(f"Proxy outbound {index + 1} needs a server_port between 1 and 65535")
            nodes.append(copy.deepcopy(node))
        elif kind in DISCARDED_TYPES:
            discarded += 1
            if kind in {"selector", "urltest"}:
                members = node.get("outbounds")
                if (not isinstance(members, list) or not members
                        or any(not isinstance(member, str) or not member for member in members)
                        or len(members) != len(set(members))):
                    raise ProfileError(f"Upstream group {index + 1} has an invalid or empty outbounds list")
                default = node.get("default")
                if default is not None and default not in members:
                    raise ProfileError(f"Upstream group {index + 1} has a default outside its member list")
                groups[tag] = members
        else:
            raise ProfileError(f"Unsupported outbound type at position {index + 1}; use standalone supported proxy nodes")
    for members in groups.values():
        if any(member not in tags for member in members):
            raise ProfileError("Upstream group references a missing outbound")
    visited, active = set(), set()

    def visit(tag):
        if tag in active:
            raise ProfileError("Upstream groups contain a reference cycle")
        if tag in visited or tag not in groups:
            return
        active.add(tag)
        for member in groups[tag]:
            visit(member)
        active.remove(tag)
        visited.add(tag)

    for tag in groups:
        visit(tag)
    if not nodes:
        raise ProfileError("Input contains no supported real proxy nodes")
    return nodes, discarded


def classify_nodes(nodes, region_map=None):
    region_map = {} if region_map is None else region_map
    if not isinstance(region_map, dict):
        raise ProfileError("Region map must be a JSON object mapping exact node tags to region codes")
    node_tags = {node["tag"] for node in nodes}
    if any(tag not in node_tags for tag in region_map):
        raise ProfileError("Region map contains a tag absent from the retained proxy nodes")
    if any(not isinstance(region, str) or region not in REGIONS for region in region_map.values()):
        raise ProfileError("Region map values must be HK, TW, JP, SG, US, or OTHER")
    result = {region: [] for region in REGIONS}
    for node in nodes:
        tag = node["tag"]
        if tag in region_map:
            region = region_map[tag]
        else:
            matches = [region for region, pattern in REGION_PATTERNS.items() if re.search(pattern, tag, re.I)]
            # Ambiguous names (for example HK-to-US relays) require a local override.
            region = matches[0] if len(matches) == 1 else "OTHER"
        result[region].append(tag)
    return {region: members for region, members in result.items() if members}


def choose_prefix(nodes, labels):
    existing = {node["tag"] for node in nodes}
    counter = 1
    while True:
        prefix = "RF:" if counter == 1 else f"RF{counter}:"
        if not any(prefix + label in existing for label in labels):
            return prefix
        counter += 1


def build_profile(source, rule_base, cnip_url=DEFAULT_CNIP_URL,
                  extras=(), ads=False, region_map=None, rule_format="source", cnip_format=None):
    rule_base = https_url(rule_base, "--rule-base")
    cnip_url = https_url(cnip_url, "--cnip-url")
    if rule_format not in {"source", "binary"}:
        raise ProfileError("Rule format must be source or binary")
    if cnip_format is None:
        cnip_format = {".json": "source", ".srs": "binary"}.get(Path(urlsplit(cnip_url).path).suffix)
    if cnip_format not in {"source", "binary"}:
        raise ProfileError("CNIP URL needs a .json or .srs extension, or an explicit --cnip-format")
    if len(extras) != len(set(extras)) or any(category not in EXTRA_CATEGORIES for category in extras):
        raise ProfileError("Extra categories must be unique supported category names")
    # Stable generated ordering does not depend on the option order.
    extras = tuple(category for category in EXTRA_CATEGORIES if category in extras)
    nodes, discarded = extract_nodes(source)
    regions = classify_nodes(nodes, region_map)
    labels = ["DIRECT", "节点选择", "全部节点", "规则下载", "漏网之鱼", *CORE_CATEGORIES, *extras]
    for region in regions:
        labels.extend([REGION_LABELS[region], REGION_LABELS[region] + "-自动测速"])
    prefix = choose_prefix(nodes, [DISPLAY_LABELS.get(label, label) for label in labels])
    tag = lambda label: prefix + DISPLAY_LABELS.get(label, label)
    direct, choice, download = tag("DIRECT"), tag("节点选择"), tag("规则下载")
    region_tags = [tag(REGION_LABELS[region]) for region in regions]
    node_tags = [node["tag"] for node in nodes]
    outbounds = [{"type": "direct", "tag": direct}, *nodes]
    for region, members in regions.items():
        automatic = tag(REGION_LABELS[region] + "-自动测速")
        outbounds.extend([
            {"type": "urltest", "tag": automatic, "outbounds": members,
             "url": "https://www.gstatic.com/generate_204", "interval": "5m",
             "tolerance": 50, "interrupt_exist_connections": False},
            {"type": "selector", "tag": tag(REGION_LABELS[region]),
             "outbounds": [automatic, *members], "default": automatic,
             "interrupt_exist_connections": False},
        ])
    default_choice = tag(REGION_LABELS["HK"]) if "HK" in regions else region_tags[0]
    outbounds.extend([
        {"type": "selector", "tag": tag("全部节点"), "outbounds": node_tags,
         "default": node_tags[0], "interrupt_exist_connections": False},
        {"type": "selector", "tag": choice, "outbounds": [*region_tags, tag("全部节点"), direct],
         "default": default_choice, "interrupt_exist_connections": False},
        {"type": "selector", "tag": download, "outbounds": [choice, direct],
         "default": choice, "interrupt_exist_connections": False},
    ])
    service_choices = [choice, *region_tags, tag("全部节点"), direct]
    hk = tag(REGION_LABELS["HK"]) if "HK" in regions else choice
    us = tag(REGION_LABELS["US"]) if "US" in regions else choice
    sg = tag(REGION_LABELS["SG"]) if "SG" in regions else choice
    defaults = {category: hk for category in CORE_CATEGORIES}
    defaults.update(Gemini=us, AI=us, Telegram=sg, Microsoft=direct,
                    Apple=direct, Domestic=direct, GlobalSites=choice, SpeedTest=choice)
    for category in extras:
        defaults[category] = direct if category in EXTRA_DOMESTIC else hk
    for category in (*CORE_CATEGORIES, *extras):
        # Domestic is deliberately direct-only; other selectors retain manual choices.
        options = [direct] if category == "Domestic" else service_choices.copy()
        outbounds.append({"type": "selector", "tag": tag(category),
                          "outbounds": options, "default": defaults[category],
                          "interrupt_exist_connections": False})
    outbounds.append({"type": "selector", "tag": tag("漏网之鱼"),
                      "outbounds": [choice, *region_tags, direct], "default": choice,
                      "interrupt_exist_connections": False})

    route_rules = [
        {"action": "sniff"},
        {"type": "logical", "mode": "or", "rules": [{"protocol": "dns"}, {"port": 53}],
         "action": "hijack-dns"},
        {"ip_is_private": True, "action": "route", "outbound": direct},
        {**copy.deepcopy(LOCAL_DOMAINS), "action": "route", "outbound": direct},
        {"domain": MICROSOFT_LOGIN.copy(), "action": "route", "outbound": choice},
    ]
    if ads:
        route_rules.append({"rule_set": ["Ads"], "action": "reject"})
    order = ["SpeedTest", "Gemini", "AI", "YouTube", "Netflix", "DisneyPlus", "Google", "GitHub",
             "Microsoft", "Apple", "Telegram", "PayPal", *extras,
             "GlobalMedia", "GlobalSites", "Domestic"]
    for category in order:
        route_rules.append({"rule_set": [category], "action": "route", "outbound": tag(category)})
    route_rules.extend([
        {"action": "resolve"},
        {"rule_set": ["CNIP"], "action": "route", "outbound": direct},
    ])

    dns_rules = [
        {**copy.deepcopy(LOCAL_DOMAINS), "action": "route", "server": "local"},
        {"domain": MICROSOFT_LOGIN.copy(), "action": "route", "server": "foreign"},
    ]
    if ads:
        dns_rules.append({"rule_set": ["AdsDNS"], "action": "reject"})
    for category in order:
        server = "domestic" if category in {"Domestic", "Microsoft", "Apple", *EXTRA_DOMESTIC} else "foreign"
        dns_rules.append({"rule_set": [category + "DNS"], "action": "route", "server": server})
    rule_sets = []
    extension = "json" if rule_format == "source" else "srs"
    for category in [*order, *( ["Ads"] if ads else [])]:
        for suffix, filename in [("", category + "." + extension), ("DNS", category + ".dns." + extension)]:
            rule_sets.append({"type": "remote", "tag": category + suffix, "format": rule_format,
                              "url": f"{rule_base}/{category}/{filename}", "update_interval": "1d",
                              "http_client": {"detour": download}})
    rule_sets.append({"type": "remote", "tag": "CNIP", "format": cnip_format, "url": cnip_url,
                      "update_interval": "1d", "http_client": {"detour": download}})

    profile = {
        "log": {"level": "info", "timestamp": True},
        "dns": {
            "servers": [
                {"type": "udp", "tag": "bootstrap", "server": "223.5.5.5", "server_port": 53, "detour": direct},
                {"type": "https", "tag": "domestic", "server": "dns.alidns.com", "server_port": 443,
                 "path": "/dns-query", "domain_resolver": "bootstrap", "detour": direct},
                {"type": "https", "tag": "foreign", "server": "1.1.1.1", "server_port": 443,
                 "path": "/dns-query", "detour": choice},
                {"type": "local", "tag": "local"},
            ],
            "rules": dns_rules, "final": "foreign", "reverse_mapping": True,
        },
        "inbounds": [{"type": "tun", "tag": "tun-in", "address": ["172.19.0.1/30", "fdfe:dcba:9876::1/126"],
                      "mtu": 1500, "auto_route": True}],
        "outbounds": outbounds,
        "route": {"rules": route_rules, "rule_set": rule_sets, "final": tag("漏网之鱼"),
                  "default_domain_resolver": "bootstrap"},
        "experimental": {"cache_file": {"enabled": True, "cache_id": "ruleforge-sfa", "store_dns": True}},
    }
    audit_profile(profile)
    return profile, {"regions": {region: len(members) for region, members in regions.items()},
                     "nodes": len(nodes), "discarded": discarded, "prefix": prefix,
                     "rule_sets": len(rule_sets)}


def audit_profile(profile):
    """Check generated references and basic invariants, not the sing-box schema."""
    outbounds = profile["outbounds"]
    out_tags = [node["tag"] for node in outbounds]
    if len(out_tags) != len(set(out_tags)):
        raise ProfileError("Internal audit: duplicate outbound tags")
    out_set = set(out_tags)
    for node in outbounds:
        if node["type"] in {"selector", "urltest"}:
            members = node["outbounds"]
            if not members or len(members) != len(set(members)) or not set(members) <= out_set:
                raise ProfileError("Internal audit: invalid group members")
            if node["type"] == "selector" and node["default"] not in members:
                raise ProfileError("Internal audit: invalid selector default")
    graph = {node["tag"]: node.get("outbounds", []) for node in outbounds}
    visited, active = set(), set()

    def visit(tag):
        if tag in active:
            raise ProfileError("Internal audit: cyclic outbound graph")
        if tag in visited:
            return
        active.add(tag)
        for child in graph[tag]:
            visit(child)
        active.remove(tag)
        visited.add(tag)

    for tag in out_tags:
        visit(tag)
    dns_tags = {server["tag"] for server in profile["dns"]["servers"]}
    rs = profile["route"]["rule_set"]
    rule_tags = {entry["tag"] for entry in rs}
    if len(rule_tags) != len(rs):
        raise ProfileError("Internal audit: duplicate rule-set tags")
    used_rules = set()
    for scope, section in (("route", profile["route"]), ("dns", profile["dns"])):
        for rule in section["rules"]:
            references = rule.get("rule_set", [])
            if not set(references) <= rule_tags:
                raise ProfileError("Internal audit: unknown rule-set reference")
            used_rules.update(references)
            if "outbound" in rule and rule["outbound"] not in out_set:
                raise ProfileError("Internal audit: unknown route outbound")
            if "server" in rule and rule["server"] not in dns_tags:
                raise ProfileError("Internal audit: unknown DNS server")
            if scope == "dns" and any(not ref.endswith("DNS") for ref in references):
                raise ProfileError("Internal audit: DNS matches require domain-only DNS rule sets")
    if used_rules != rule_tags:
        raise ProfileError("Internal audit: unused rule sets")
    if profile["route"]["final"] not in out_set or profile["dns"]["final"] not in dns_tags:
        raise ProfileError("Internal audit: missing final target")
    if profile["route"]["default_domain_resolver"] not in dns_tags:
        raise ProfileError("Internal audit: missing default domain resolver")
    for server in profile["dns"]["servers"]:
        if "detour" in server and server["detour"] not in out_set:
            raise ProfileError("Internal audit: missing DNS detour")
        if "domain_resolver" in server and server["domain_resolver"] not in dns_tags:
            raise ProfileError("Internal audit: missing DNS bootstrap resolver")
    for entry in rs:
        if entry["http_client"]["detour"] not in out_set:
            raise ProfileError("Internal audit: missing rule download detour")


def write_private_json(path: Path, value, force=False):
    data = (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode("utf-8")
    if not force:
        # O_EXCL also refuses an existing symlink; mode is restrictive from creation.
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            with os.fdopen(descriptor, "wb") as handle:
                handle.write(data)
                handle.flush()
                os.fsync(handle.fileno())
        except BaseException:
            path.unlink(missing_ok=True)
            raise
    else:
        descriptor, temporary = tempfile.mkstemp(prefix=".sfa-", suffix=".json", dir=path.parent)
        try:
            with os.fdopen(descriptor, "wb") as handle:
                handle.write(data)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
    if os.name == "posix":
        os.chmod(path, 0o600)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Local native sing-box JSON object or outbounds array")
    parser.add_argument("output", type=Path, help="New local SFA profile; contains credentials")
    parser.add_argument("--rule-base", required=True, help="Published public HTTPS sing-box rule directory")
    parser.add_argument("--rule-format", choices=("source", "binary"), default="source", help="Category rule format: source .json (default) or compiled binary .srs")
    parser.add_argument("--cnip-url", default=DEFAULT_CNIP_URL, help="CN IP-only rule set; defaults to the official SagerNet binary set")
    parser.add_argument("--cnip-format", choices=("source", "binary"), help="CNIP format; otherwise inferred from .json or .srs extension")
    parser.add_argument("--extra-category", action="append", default=[], choices=EXTRA_CATEGORIES,
                        help="Enable one already-published optional category; repeat to add more")
    parser.add_argument("--ads", action="store_true", help="Enable already-published Ads and AdsDNS reject rules")
    parser.add_argument("--region-map", type=Path, help="Local JSON exact node tag to HK/TW/JP/SG/US/OTHER mapping")
    parser.add_argument("--force", action="store_true", help="Explicitly replace an existing output file")
    args = parser.parse_args(argv)
    try:
        if args.input.resolve() == args.output.resolve():
            raise ProfileError("Output must not overwrite the input subscription")
        if args.region_map and args.region_map.resolve() == args.output.resolve():
            raise ProfileError("Output must not overwrite the region map")
        source = load_json(args.input)
        region_map = load_json(args.region_map) if args.region_map else None
        profile, summary = build_profile(source, args.rule_base, args.cnip_url,
                                         args.extra_category, args.ads, region_map, args.rule_format, args.cnip_format)
        write_private_json(args.output, profile, args.force)
    except FileExistsError:
        parser.error("Output already exists; choose a new path or explicitly use --force")
    except (ProfileError, OSError, UnicodeError) as error:
        parser.error(str(error))
    print("Created local profile. WARNING: output contains proxy credentials; do not upload or commit it.", file=sys.stderr)
    print(f"Nodes: {summary['nodes']}; regions: " + ", ".join(f"{region}={count}" for region, count in summary["regions"].items())
          + f"; ignored upstream utility/group outbounds: {summary['discarded']}; remote rule sets: {summary['rule_sets']}", file=sys.stderr)
    print("Only JSON/reference checks ran. Run sing-box 1.14.2 check locally; then test in SFA.", file=sys.stderr)
    if ".invalid" in args.rule_base or ".invalid" in args.cnip_url:
        print("WARNING: placeholder rule URL remains. This profile is NOT ready to start.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
