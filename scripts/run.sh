#!/bin/sh
# Use the pinned Node major without changing the user's global runtime.
set -eu
node_candidate=''
for candidate in /opt/homebrew/opt/node@24/bin/node "$(command -v node 2>/dev/null || true)"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ] && "$candidate" -e 'process.exit(/^24\./.test(process.versions.node) && Number(process.versions.node.split(".")[1]) >= 21 ? 0 : 1)' 2>/dev/null; then
    node_candidate="$candidate"
    break
  fi
done
if [ -z "$node_candidate" ]; then
  echo 'Install Node 24.21.0 (see .node-version) and pnpm 10.14.0, then retry.' >&2
  exit 1
fi
PATH="$(dirname "$node_candidate"):$PATH"
export PATH
cd "$(dirname "$0")/.."
exec pnpm "$@"
