# Ardor lite portable handoff

Ardor's Indian-equity research examines whether a plausible market mechanism survives information timing, actual-instrument execution, costs, dependence-aware inference and attribution. The archived evidence supports zero certified/live strategies. Failed, invalid, blocked and discovery-only records are retained with their distinct outcomes.

This package completes evidence preparation phases 0–3 and portable handoff preparation. It includes the catalog, six cases, reviewed chart inputs and figures, independent synthetic method examples, provenance/publication inventories and offline checks. A separate website repository has not been created or deployed.

Start with [the receiving-agent brief](docs/HANDOFF.md), [the portable plan](docs/PLAN_ardor_lite.md), [validation](docs/VALIDATION.md), and [reproduction boundaries](docs/REPRODUCIBILITY.md). Browse [featured evidence](evidence/summaries/featured-evidence.md), [the catalog](content/research.json), [methods](docs/METHODS.md), or open [the offline chart explorer](charts/explorer.html).

Run from this directory:

```sh
python3 scripts/validate.py
python3 -m unittest discover -s tests -v
```

Python 3.12 is the supported baseline. Validation and examples use only the standard library. Figure regeneration requires the pinned optional dependency in requirements-charts.txt. Everything needed for inspection and validation is bundled; no Ardor checkout, database, network, credentials, private snapshots or market data is needed.
