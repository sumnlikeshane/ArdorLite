# Independent public build

Use Node 24.21.0, pnpm 10.14.0 and nonoptimized Python 3.12 (the release uses 3.12.8). Set PYTHONDONTWRITEBYTECODE=1. Install the exact lockfile with `./scripts/run.sh install --frozen-lockfile`, then run `./scripts/run.sh build`. No sibling checkout or credential is needed. Output is `dist/` and local receipts are generated under `receipts/`.

The public pipeline checks metadata-only provenance, the complete frozen derivative snapshot, scoped material rights, structured content, read-only authored-entry validation, types, synthetic models, assets, dependency notices, metadata, Pagefind search and the output inventory. It reports original captures/supplement verification as absent-not-verified. It does not silently pass unavailable original inputs or reconstruct their contents.

Run `./scripts/run.sh exec playwright install chromium firefox webkit` if the browsers are not installed, then `./scripts/run.sh test:e2e` for all production journeys. `./scripts/run.sh exec node scripts/search_acceptance.mjs` evaluates judged local search. Preview with `./scripts/run.sh preview --port 4321 --ignore-lock`. Browser automation covers the engines; it does not certify actual Safari/Edge, assistive technology, physical devices, genuine zoom, complete print or reader comprehension.

The public profile produces the same intended public website as the separately verified private canonical build at the selected origin. Production is released from the private canonical repository: its additional original-input, policy, source/output/browser and exact authorization checks must pass before Render publishes `dist/`. This repository intentionally has no deployment entry point or provider credential. Changing a URL/profile does not authorize a deployment.

Pagefind's locked native emitters use an unchanged checksum-pinned upstream WASM pair and normalized metadata ordering for reproducible cross-platform bytes. Upstream MIT/OFL/dependency notices retain their own scope. Reserved project rights remain; no blanket licence is selected.
