#!/usr/bin/env bash
# Version the site's CSS, JS and images in every page:  design/stamp.sh
# Each URL gets ?v= and the first 8 characters of the file's SHA-1, so a deploy that changes a file changes its URL.
# Cloudflare tells browsers to keep CSS, JS and images for 4 hours but pages for 10 minutes; without this, a returning
# visitor gets the new page with the old stylesheet. Run it after editing any file below; render.sh runs it for the cover.
set -euo pipefail
cd "$(dirname "$0")/.."
PAGES=(index.html about/index.html book/index.html excerpt/index.html privacy/index.html)
ASSETS=(design/tokens.css site.css signup.css site.js signup.js og-image.png
  design/assets/the-trust-sequence-cover-600.png design/assets/the-trust-sequence-cover-1200.png
  design/assets/the-trust-sequence-cover-3d-700.png design/assets/the-trust-sequence-cover-3d-1400.png)
for asset in "${ASSETS[@]}"; do
  v=$(shasum "$asset" | cut -c1-8)
  ASSET="$asset" V="$v" perl -pi -e 's#/\Q$ENV{ASSET}\E(\?v=[0-9a-f]*)?(?=["\s,])#/$ENV{ASSET}?v=$ENV{V}#g' "${PAGES[@]}"
  echo "$asset?v=$v"
done
