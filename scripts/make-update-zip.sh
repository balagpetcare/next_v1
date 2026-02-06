#!/usr/bin/env bash
set -euo pipefail

# BPA update-only zip packager
# - Creates an update-only zip containing:
#   - only changed files you specify
#   - PATCH_NOTES.md (required)
#   - MIGRATION.md (optional)
#
# Usage:
#   ./scripts/make-update-zip.sh -o bpa-owner-v3.1.2-update-only.zip FILES...
#
# Or using a file list:
#   ./scripts/make-update-zip.sh -o out.zip -l PATCH_FILES.txt
#
# PATCH_FILES.txt should contain one relative path per line.

OUT=""
LIST=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--out) OUT="$2"; shift 2;;
    -l|--list) LIST="$2"; shift 2;;
    -h|--help)
      echo "Usage: $0 -o <out.zip> [FILES...]  |  $0 -o <out.zip> -l <list.txt>"
      exit 0
      ;;
    *) break;;
  esac
done

if [[ -z "$OUT" ]]; then
  echo "ERROR: output zip is required. Use -o <out.zip>"
  exit 1
fi

TMP_DIR=".tmp_update_only_zip"
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

copy_file () {
  local f="$1"
  if [[ ! -f "$f" ]]; then
    echo "ERROR: file not found: $f"
    exit 1
  fi
  mkdir -p "$TMP_DIR/$(dirname "$f")"
  cp "$f" "$TMP_DIR/$f"
}

# Always include PATCH_NOTES.md if present
if [[ -f "PATCH_NOTES.md" ]]; then
  copy_file "PATCH_NOTES.md"
else
  echo "WARN: PATCH_NOTES.md not found in repo root. Add it (template provided) before packaging."
fi

# Include MIGRATION.md only if present
if [[ -f "MIGRATION.md" ]]; then
  copy_file "MIGRATION.md"
fi

FILES=()

if [[ -n "$LIST" ]]; then
  if [[ ! -f "$LIST" ]]; then
    echo "ERROR: list file not found: $LIST"
    exit 1
  fi
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    FILES+=("$line")
  done < "$LIST"
else
  while [[ $# -gt 0 ]]; do
    FILES+=("$1")
    shift
  done
fi

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "ERROR: no files provided. Pass FILES... or -l <list.txt>"
  exit 1
fi

for f in "${FILES[@]}"; do
  copy_file "$f"
done

# Build zip (requires zip installed)
rm -f "$OUT"
( cd "$TMP_DIR" && zip -r "../$OUT" . >/dev/null )

rm -rf "$TMP_DIR"
echo "✅ Created update-only zip: $OUT"
