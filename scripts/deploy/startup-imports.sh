#!/bin/sh
# Bring the production catalog up to date with the committed data files, on every
# container start (Dockerfile CMD runs this in the background after migrate + seed).
#
# Every step is idempotent: re-running confirms values already there, a null in a
# batch never erases data, and hand-curated admissions fields are only filled when
# empty. Each step is fail-soft, so a problem here never stops the server.
#
# When you add a new college batch (data/colleges/<batch>.json), add it below.

run() {
  echo "uniseek: import $*"
  node "$@" || echo "uniseek: import step failed (continuing): $*"
}

# 1. Colleges, oldest batches first. Partial colleges in usnews-2027-next stay out.
run scripts-dist/colleges-import.cjs georgia-large-publics ma-selective-privates tulane-rice-wake-forest vanderbilt
run scripts-dist/colleges-import.cjs usnews-2027-next --only-done
run scripts-dist/colleges-import.cjs strong-cs-2026
run scripts-dist/colleges-import.cjs residency-publics
run scripts-dist/colleges-import.cjs tuition-backfill

# 2. Program ranks (every file in data/rankings), then CS admit rates. Both need the
#    colleges above to exist.
run scripts-dist/rankings-import.cjs
run scripts-dist/major-rates-import.cjs data/major-rates/cs-2026-27.json

echo "uniseek: startup imports done"
