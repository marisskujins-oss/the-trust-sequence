#!/usr/bin/env bash
# Render every template to PNG:  design/templates/render.sh
# Custom copy for one template:  design/templates/render.sh quote "?quote=...&cite=Maris%20Skujins"
# Output goes to design/templates/out/. The OG image is also copied to the site root.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="$DIR/out"
mkdir -p "$OUT"

render() {
  local name=$1 w=$2 h=$3 query=${4:-}
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --virtual-time-budget=8000 --window-size="$w,$h" --screenshot="$OUT/$name.png" \
    "file://$DIR/$name.html$query" >/dev/null 2>&1
  echo "$OUT/$name.png"
}

size() { case $1 in carousel) echo "1080 1350";; quote) echo "1080 1080";; podcast) echo "1920 1080";; og) echo "1200 630";; esac; }

if [ $# -ge 1 ]; then
  render "$1" $(size "$1") "${2:-}"
else
  for t in carousel quote podcast og; do render "$t" $(size "$t"); done
  cp "$OUT/og.png" "$DIR/../../og-image.png"
  echo "copied og.png to og-image.png"
fi
