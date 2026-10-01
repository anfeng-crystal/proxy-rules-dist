RuleForge native sing-box / SFA

Published categories: 39/39; source format JSON version 3.
Rule base: https://anfeng-crystal.github.io/proxy-rules-dist/sing-box
Each Category/Category.json is a native route rule set; Category/Category.dns.json contains domain matchers only.
No .srs binaries are produced or required for category rules. External CNIP uses the official SagerNet binary set.
GEOIP,CN is handled only by that profile-level CNIP rule; omissions/moves are recorded in conversion-report.json.

CIDRs with host bits are canonicalized to the stated prefix's network; every changed original and result is reported.
sfa-template.json is a non-connectable example with five .invalid Trojan nodes and dummy passwords.
Do not import the example expecting a working connection. Use local native sing-box JSON nodes instead:
python3 generate_sfa.py nodes.json sfa.local.json --rule-base https://anfeng-crystal.github.io/proxy-rules-dist/sing-box
The generator is standard-library-only and makes no network requests. The output contains credentials: keep it local.
The default profile enables 15 categories. Optional categories and Ads can be enabled with generator flags.
Validate the generated configuration using your own matching sing-box core and test it in SFA before relying on it.
Static checks do not prove runtime connectivity, DNS leak protection, or successful binary compilation.
