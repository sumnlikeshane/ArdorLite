# Ardor Lite

A static research publication explaining six bounded research decisions, their
controlling gates, aggregate evidence and independent synthetic teaching models.
The 114 catalog records overlap; they are not independent strategy trials.
No certified strategy, independent alpha or completed scientific/reader acceptance
is claimed. Publication target: https://ardorlite.onrender.com (release status is recorded in the release evidence; a target URL alone does not establish deployment).

Use Node **24.21.0**, pnpm **10.14.0** and ordinary Python **3.12** with bytecode
disabled. No private sibling checkout, source captures, credentials or financial
service is needed. From the repository root:

```sh
export PYTHONDONTWRITEBYTECODE=1
./scripts/run.sh install --frozen-lockfile
./scripts/run.sh build
./scripts/run.sh test:e2e --output receipts/playwright-public-source
./scripts/run.sh preview --port 4321 --ignore-lock
```

The Astro site renders six case routes, evidence registries, synthetic instruments
and local Pagefind search. `src/` contains the complete website presentation and shared content validation;
`reviewed/2026-10-11/` is the exact 135-file frozen derivative snapshot;
`config/publication-assets.json` alone selects 110 byte-preserved downloads.
The static app has no editing API, server adapter, database or CMS. Owner-only authoring and deployment commands are kept in the private operational repository. You may edit/build your own clone or fork; this grants no upstream or live-site access. Keep research outcomes, nulls, units, source dates and notices.

This is an explicit **public-source engineering profile**, not the private archive
or a deployment-authorized release. It includes metadata-only source provenance;
28 original captures and the local-only Trend supplement and approval are absent. Local-only explanatory prose and private assertion expectations are omitted too.
It never reconstructs the omitted rates, dates or condition outcomes. The build
checks the entire frozen snapshot, public provenance, material assignments,
content joins, synthetic models, types, search, links, numeric values and complete
output inventory. Private original-content checks remain in the private pipeline
and are reported as excluded, not passed. Scientific, reader, manual/device and
full performance acceptance remain incomplete.

The public metadata selects the actual Render service origin. A configured origin
is not evidence of a successful deployment; consult the owner release receipt.
The private Render entry point and release authorization refuse this engineering profile.
The canonical private pipeline must bind a real origin, provider build, browser
evidence and exact release instruction before deployment. Merely changing a
profile or URL never provides that authority.

Material retains its existing reserved rights. See `NOTICE.md`, the frozen notice,
material dispositions and shipped dependency/font licences. No blanket open-source
licence or redistribution permission for excluded originals is granted.

CI uses pinned actions, read-only tokens and separate build/secrets/dependency
checks. No deployment workflow, mutation CLI, release command or credential is supplied. Upstream writes and merges remain owner-only. See CONTRIBUTING.md and SECURITY.md.

Search uses Pagefind 1.5.2 with canonically ordered metadata/filter tables and one checksum-pinned, unmodified upstream WASM pair on supported Darwin/Linux toolchains. The upstream MIT notices are retained under `vendor/pagefind-1.5.2/`; that licence does not apply to Ardor research. Unknown emitted WASM bytes fail closed. Actual browser judgments still verify search behavior.

Build details: [BUILD.md](docs/BUILD.md). Source and evidence boundary: [ARCHITECTURE.md](docs/ARCHITECTURE.md). [Contribution rules](CONTRIBUTING.md), [security](SECURITY.md), [notices](NOTICE.md).
