#!/bin/sh
# Read-only provider build. Saving a backing source is a separate manual deploy.
set -eu
export PYTHONDONTWRITEBYTECODE=1
test "$(node --version)" = 'v24.21.0'
python --version
python3.12 -B -c 'import sys; assert sys.version_info[:2] == (3,12) and not sys.flags.optimize'
if ! command -v pnpm >/dev/null 2>&1 || [ "$(pnpm --version)" != '10.14.0' ]; then
  render_tools="${TMPDIR:-/tmp}/ardor-render-pnpm"
  npm install --prefix "$render_tools" --no-audit --no-fund pnpm@10.14.0
  PATH="$render_tools/node_modules/.bin:$PATH"
  export PATH
fi
python3.12 -B - <<'PY'
import sys
sys.path.insert(0,'scripts')
from release_evidence import provider_errors
errors=provider_errors()
if errors:raise SystemExit('\n'.join(errors))
PY
pnpm install --frozen-lockfile
pnpm build
pnpm release:check
