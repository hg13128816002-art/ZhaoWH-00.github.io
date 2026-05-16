#!/usr/bin/env bash
set -euo pipefail

FONT_DIR="public/fonts"
mkdir -p "$FONT_DIR"

CSS_URL="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&display=swap"

# fetch CSS and extract font URLs
css=$(curl -s -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36" "$CSS_URL")

urls=$(printf "%s\n" "$css" | grep -oE 'https://[^\)" ]+\.(woff2|ttf)' | awk '!seen[$0]++')

if [ -z "$urls" ]; then
  echo "No font URLs found in CSS."
  exit 1
fi

# Download each font and save with friendly names by weight order
count=0
for url in $urls; do
  count=$((count+1))
  if [ $count -eq 1 ]; then
    out="$FONT_DIR/NotoSansSC-Regular.woff2"
  elif [ $count -eq 2 ]; then
    out="$FONT_DIR/NotoSansSC-Bold.woff2"
  elif [ $count -eq 3 ]; then
    out="$FONT_DIR/NotoSansSC-Black.woff2"
  else
    break
  fi
  echo "Downloading $url -> $out"
  curl -s -L "$url" -o "$out"
done

echo "Fonts downloaded to $FONT_DIR"

echo "Creating license note at $FONT_DIR/FONT_LICENSE.txt"
cat > "$FONT_DIR/FONT_LICENSE.txt" <<EOF
Noto Sans SC (subset) downloaded via Google Fonts CSS: $CSS_URL
Source files are from fonts.gstatic.com per Google Fonts service.
License: Noto fonts are released under the SIL Open Font License, or their specific license as indicated by Google Fonts.
Please review: https://fonts.google.com/specimen/Noto+Sans+SC and https://scripts.sil.org/
EOF

echo "Done."