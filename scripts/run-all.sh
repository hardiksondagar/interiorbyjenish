#!/usr/bin/env bash
# Full asset pipeline. Idempotent: re-running only processes new or changed
# input, and never touches curation.json or src/content.
#
#   bash scripts/run-all.sh            # normal, incremental
#   bash scripts/run-all.sh --force    # re-encode everything
#
# When a new Drive export arrives: unzip it into portfolio/ and run this again.
set -euo pipefail
cd "$(dirname "$0")/.."

# Pin Node 22 - Astro 7 and the sharp build both require >=22.12.
if [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; nvm use >/dev/null 2>&1 || true; fi

FORCE="${1:-}"
step () { printf '\n\033[1m== %s\033[0m\n' "$1"; }

step "01 ingest"     ; node scripts/01-ingest.mjs
step "02 probe"      ; node scripts/02-probe.mjs
step "03 raster PDFs"; node scripts/03-raster.mjs   $FORCE
step "04 previews"   ; node scripts/04-previews.mjs $FORCE
step "05 video"      ; node scripts/05-video.mjs    $FORCE
step "06 masters"    ; node scripts/06-masters.mjs  $FORCE
step "07 og images"  ; node scripts/07-og.mjs

printf '\n\033[1mDone.\033[0m Review CURATION.md, then put your picks in curation.json and re-run step 06:\n'
printf '  node scripts/06-masters.mjs --force\n\n'
