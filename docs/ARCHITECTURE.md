# Architecture and evidence boundary

Astro builds a static publication with trailing-slash routes. `src/pages/` defines reading, case, evidence, search and synthetic teaching routes; `src/components/`, `src/layouts/` and `src/styles/` provide shared presentation. Typed content and shared validation live under `src/content/` and `src/lib/`. The six case decisions retain their original gates and qualifications. The 114 catalog records overlap and must not be treated as independent trials.

`reviewed/2026-10-11/` is an immutable 135-file derivative snapshot. Its bundled validator and tests run before and after publication builds. `config/publication-assets.json` is the only export allowlist and preserves 110 guarded downloads. No figure generation, original-code execution, data collection or backtesting is needed for a normal build.

`src/content/public-provenance.json` records source identities without private original contents. `config/source-profile.json` binds the exact projection and the private-input omission list. Omission signatures check selected restricted content in generated output, serialized scripts, search and downloads. Private original captures, the local-only Trend supplement, private explanations and private test expectations remain outside this repository. Hashes prove identities; they do not establish permissions or attest to absent originals.

Browser scripts implement local interaction and Pagefind worker search. They expose no mutation service. The deployment artifact includes only audited static output, assets, selected downloads and notices; repository/operational metadata stays outside it. A genuine 404 is required for missing paths, with no SPA catch-all.

Scientific review, unfamiliar-reader sessions, human/device/accessibility/print checks and full performance acceptance remain pending or stale under the bounded initial-launch policy. Automated technical evidence is reported separately and supplies none of those approvals.

One maintained `scripts/build.py` serves clones, CI and Render. Build/technical status is separate from actual owner approval and retained private checks. `scripts/release_evidence.py` validates sanitized technical records and protected provider pins; local owner tooling verifies full retained authority and originals against the same public source digest. No fallback reads a parent directory. See [deployment](DEPLOYMENT.md) and [maintenance](MAINTENANCE.md).
