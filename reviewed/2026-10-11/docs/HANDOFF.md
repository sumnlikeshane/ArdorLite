# Receiving-agent brief

Prepared: 11 October 2026. Evidence preparation phases 0–3 are complete. This is a self-contained, reviewed local handoff for a later separate Ardor lite repository; no remote, destination checkout, website build or deployment has been created.

Read [AGENTS](../AGENTS.md), [the portable plan](PLAN_ardor_lite.md), [evidence policy](EVIDENCE_POLICY.md), [validation](VALIDATION.md) and [the manifest](../evidence/manifest.json). Run the documented checks before continuing.

## Contents and evidence scope

The [catalog](../content/research.json) contains 114 scoped records: the exact 49-record Vantage archive cohort plus 65 named designs, versions, parked paths and preview records. These overlap in mechanisms and stages; they are not 114 independent tested strategies. Its roster and tournament coverage maps explain changed identifiers and parent/version relationships. The [reconciliation](../evidence/summaries/catalog-reconciliation.md) defines every count. The frozen 27-family census, 26 current main registrations, 2,716 trial rows and 1,264 accepted Atlas cells have different boundaries and must never be added.

The project overview and previews are [project.json](../content/project.json) and [previews.json](../content/previews.json). Indian-equity research leads. Long-term, portfolio, hybrid AI and Solana content retain their incomplete/design/forecast or rights-blocked labels. Author biography, contact, repository and domain fields remain null until supplied; do not make active placeholder links.

Six cases stand alone:

- [Atlas and SSF](../content/cases/atlas-ssf.md): the accepted map has zero formal nominations; corrected SSF v1.0.1 stood down after execution/cost/capacity failures.
- [Momentum v2](../content/cases/momentum-v2.md): an intermediate execution pass did not survive residual-alpha attribution. The disputed benchmark arithmetic is omitted.
- [Swing autopsy](../content/cases/swing-autopsy.md): net-R drag and giveback were real. Fourteen saved policies include the baseline plus thirteen alternatives, all in-sample; corrected V2 remains killed. Missing bear metrics stay null.
- [Trend quality](../content/cases/trend-quality.md): selected positive historical metrics did not pass incremental-information and familywise gates. Four complete folds and the excluded partial fold are separate.
- [Delivery and insider](../content/cases/delivery-insider.md): strong co-occurrence is a different test from predictive forward interaction. The SSF settle proxy, artificial fill-rule bypass and non-PIT universe are disclosed.
- [Price bridge](../content/cases/price-bridge.md): numerical repair and exact linkage passed technical QA; source-rights certification failed. No strategy performance is claimed.

There are 204 exact-value/metadata claims and 18 chart input tables, with SVG/PNG figures, chart specifications and accessible Markdown equivalents. Open [the offline explorer](../charts/explorer.html) to inspect/sort recorded values. It fetches nothing and adds no inference. [Featured evidence](../evidence/summaries/featured-evidence.md) links these artifacts. Every headline remains attached to its controlling status and caveats.

[Five method examples](METHODS.md) are independently authored standard-library synthetic demonstrations: BH/BY, bps and R units, clustered-mean uncertainty, explicit-input bridge repair and lagged quality/training-only fold calibration. They are not historical engine excerpts or market evidence. Attribution and actual conceptual-source hashes are included. Implemented, optional and planned capabilities remain separate in [methods.json](../content/methods.json).

## Publication and provenance

[The manifest](../evidence/manifest.json), [allowlist](../evidence/allowlist.json), [publication inventory](../evidence/publication-inventory.json), [exclusion receipt](../evidence/exclusion-receipt.json) and [source index](../evidence/summaries/source-index.md) are the export boundary. Original source files are omitted. Each derivative has source IDs/hashes, its own hash, extraction/redaction rules and review state. Source paths are provenance labels; do not turn them into broken filesystem links or build dependencies.

Private staging captured the source root, HEAD/branch, selected-file working-tree state and actual bytes. Those private receipts and complete originals are outside the handoff. The source research and historical ledger bytes were preserved. Existing integrity incidents are limitations; showcase work did not repair, restore or reseal them.

[NOTICE](../NOTICE.md) retains project attribution and reserved rights. The source declares Proprietary. Direct engine/TradeX/Pine excerpts, upstream assets and restricted market rows were omitted. A blanket open-source licence has not been chosen. Future ownership/source-use decisions apply only to the specific affected material; the package is not a licence for original datasets or collection.

## Next incomplete work

Phase 4 destination installation remains pending because no separate destination path was supplied. Inspect the actual destination instructions and existing files before installing this package. Keep private provenance outside that checkout. Do not copy Ardor Git history. The portable copy of the plan has working links to bundled summaries and records its actual completed preparation steps.

Phase 5 implements the buildless semantic website from bundled catalog/evidence. Start with the overview and one complete case, then archive, methods, previews and author/evidence pages. Keep outcome labels adjacent to figures and include accessible tables. No live data, backend, database, user accounts or broker connection is needed.

Phase 6 is the website release validation; it has not been performed. This preparation verifies artifacts and source preservation. No graphical browser was available to test the offline explorer's controls, mobile layout or keyboard behavior; those checks must be completed when a browser is available. Daily NAV/return graphics remain omitted, not reconstructed.

Phase 7 publication requires an active release request and real remote/hosting details. This handoff does not publish, register hosting, or change sharing.

## Offline commands

Run in the handoff root, after extracting it to any directory:

```sh
python3 scripts/validate.py
python3 -m unittest discover -s tests -v
python3 -m methods.demo
```

See [reproducibility](REPRODUCIBILITY.md) for supported Python and optional pinned figure regeneration. The receiving agent does not need Ardor, the database, credentials, snapshots, protected holdouts or this conversation to explain featured conclusions, validate displayed numbers or run examples.
