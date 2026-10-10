#!/usr/bin/env bash
# Render every template to PNG:            design/templates/render.sh
# The cover and everything made from it:   design/templates/render.sh cover
# Custom copy for one template:            design/templates/render.sh quote "?quote=...&cite=Maris%20Skujins"
# Output goes to design/templates/out/. The OG image is also copied to the site root,
# and the site's cover images to design/assets/.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="$DIR/out"
ASSETS="$DIR/../assets"
mkdir -p "$OUT"

size() { case $1 in carousel) echo "1080,1350";; quote) echo "1080,1080";; podcast) echo "1920,1080";; og) echo "1200,630";; cover) echo "600,900";; cover-3d) echo "700,1000";; cover-linkedin) echo "1080,1350";; esac; }

# render <template> [query] [output name] [scale] [transparent]. Scale 3 turns the 600 by 900 cover into 1800 by 2700.
render() {
  local name=$1 query=${2:-} file=${3:-$1} scale=${4:-1} background=""
  [ "${5:-}" = transparent ] && background="--default-background-color=00000000"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files $background \
    --virtual-time-budget=8000 --force-device-scale-factor="$scale" --window-size="$(size "$name")" \
    --screenshot="$OUT/$file.png" "file://$DIR/$name.html$query" >/dev/null 2>&1
  echo "$OUT/$file.png"
}

# The cover, then everything made from it. cover.html decides which variant the site shows.
cover() {
  render cover "" cover 3
  render cover "?ground=ink" cover-ink 3
  for v in a b; do
    render cover "?variant=$v" "cover-$v" 3
    render cover "?variant=$v&ground=ink" "cover-$v-ink" 3
  done
  render cover "" cover-600 1
  render cover "" cover-1200 2
  cp "$OUT/cover-600.png" "$ASSETS/the-trust-sequence-cover-600.png"
  cp "$OUT/cover-1200.png" "$ASSETS/the-trust-sequence-cover-1200.png"
  # The 3D cover the site shows: the turn and the shadow rendered into the image, on a transparent canvas.
  render cover-3d "" cover-3d-700 1 transparent
  render cover-3d "" cover-3d-1400 2 transparent
  cp "$OUT/cover-3d-700.png" "$ASSETS/the-trust-sequence-cover-3d-700.png"
  cp "$OUT/cover-3d-1400.png" "$ASSETS/the-trust-sequence-cover-3d-1400.png"
  echo "copied the site's cover to design/assets/"
  render og
  render cover-linkedin
  cp "$OUT/og.png" "$DIR/../../og-image.png"
  echo "copied og.png to og-image.png"
  "$DIR/../stamp.sh" >/dev/null
  echo "versioned the new files in the pages (design/stamp.sh)"
}

case ${1:-all} in
  all) cover; for t in carousel quote podcast; do render "$t"; done ;;
  cover|og|cover-linkedin) cover ;;
  *) render "$1" "${2:-}" ;;
esac
