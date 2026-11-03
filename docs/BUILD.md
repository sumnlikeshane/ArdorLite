# One public build

Use Node **24.21.0**, pnpm **10.14.0**, ordinary nonoptimized Python **3.12** (provider patch 3.12.8), and `PYTHONDONTWRITEBYTECODE=1`.

```sh
export PYTHONDONTWRITEBYTECODE=1
./scripts/run.sh install --frozen-lockfile
./scripts/run.sh build
./scripts/run.sh exec playwright install chromium firefox webkit
./scripts/run.sh test:e2e
./scripts/run.sh exec node scripts/search_acceptance.mjs
python3.12 -B scripts/technical_check.py
./scripts/run.sh preview --port 4321 --ignore-lock
```

`pnpm build` runs only `scripts/build.py`. The same source and build serve reviewer clones, CI and the read-only Render entry point. No sibling directory, original Ardor checkout, environment file, credentials or private input is needed. The retired engineering builder/exporter is not part of maintenance.

The required version-2 `config/source-profile.json` checks the committed provenance projection, omission signatures and exact omitted-input list. Missing or invalid contracts fail before rendering. Private originals remain **absent-not-verified** in public build receipts. The separate explicit local audit verifies retained captures, the supplement and actual approval, and compares the public projection and signatures. It never regenerates research.

The ordered build retains immutable snapshot validation and 29 archived tests before/after, material/content/entry/publication checks, public Python/Node regressions, guarded exports, dependency notices, Astro types/rendering, canonical metadata, normalized Pagefind and exhaustive output/adverse-output checks. Counts in the actual build receipt are authoritative. `receipts/clean-build.json` binds the production-input digest and output inventory. Generated receipts/output are excluded from source identity to avoid cycles; scripts, tests, configuration, CI, pins and search judgments are included.

All **42 journeys per engine**, **126 total**, must pass once in Chromium, Firefox and WebKit with zero skips. The browser reporter records each title, engine, source and output. The search check requires **28 judged queries and 536 exact destinations**. `technical_check.py` independently checks the complete records and current output. A representative run cannot fill a gap. Real Safari/Edge, independent scientific/readership, assistive technology, physical devices, genuine zoom, complete paper output and full performance remain pending/stale at their actual scope.

Receipts are generated outside `dist/`. To retain an additional judged-search run, use `ARDOR_SEARCH_RECEIPT=receipts/my-review/search/acceptance.json`; nested parents are created. The optional search lab supports `ARDOR_SEARCH_PERFORMANCE_RECEIPT`; it is scoped lab evidence. Preserve historical observations separately before replacing current receipts.

Pagefind 1.5.2 uses normalized tables and a checksum-pinned unchanged upstream WASM pair across supported Mac/Linux emitters. Portability requires actual complete byte comparisons. No dependency, font or upstream notice grants a blanket Ardor licence.

`pnpm release:check` reports exact readiness and may correctly fail despite a successful build. `pnpm release:package` retains audited static bytes locally; `pnpm rollback:exercise` detects corruption and restores/audits temporary copies without changing active output. Neither command deploys. See [deployment](DEPLOYMENT.md) and [maintenance](MAINTENANCE.md).
