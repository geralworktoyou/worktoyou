#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Instale o Node.js 22 ou superior, ou abra WorkToyou_Local.html diretamente."
  exit 1
fi
echo "Abra http://127.0.0.1:4173 no navegador."
node servidor-local.cjs
