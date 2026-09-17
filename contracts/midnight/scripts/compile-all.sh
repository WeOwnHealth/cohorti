#!/bin/bash
# Compiles every circuit under circuits/ into managed/<name>/ (proving keys
# included — this is the real compile, not --skip-zk; expect it to take a
# while the first time). Requires the Compact CLI; see ../README.md.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

for f in circuits/*.compact; do
  name="$(basename "$f" .compact)"
  echo "==> compiling $name"
  compact compile "$f" "managed/$name"
done

echo "done — output under managed/"
