#!/bin/sh
set -e

LOG_PATH="/mnt/onboard/.adds/scripts/auto-sync/out.log"
DB_PATH="/mnt/onboard/.kobo/KoboReader.sqlite"
REMOTE_URL="http://kobo.anya.home/upload.php"
CURL_BIN="/mnt/onboard/.adds/scripts/auto-sync/curl"
TMP_PATH="/tmp/KoboReader.sqlite"
GZ_PATH="/tmp/KoboReader.sqlite.gz"

cleanup() {
  rm -f "$TMP_PATH" "$GZ_PATH"
}

trap cleanup EXIT

{
  qndb -m mwcToast 2000 "Starting Kobo database upload..."

  echo "=== Kobo upload start ==="
  echo "Timestamp: $(date)"
  echo "DB_PATH: $DB_PATH"
  echo "REMOTE_URL: $REMOTE_URL"

  if [ ! -f "$DB_PATH" ]; then
    echo "Database not found: $DB_PATH"
    qndb -m mwcToast 2000 "Kobo database not found!"
    exit 1
  fi

  echo "Copying DB to $TMP_PATH"
  cp "$DB_PATH" "$TMP_PATH"
  ls -l "$TMP_PATH"

  echo "Compressing DB to $GZ_PATH"
  if command -v gzip >/dev/null 2>&1; then
    gzip -c "$TMP_PATH" > "$GZ_PATH"
  elif command -v busybox >/dev/null 2>&1; then
    busybox gzip -c "$TMP_PATH" > "$GZ_PATH"
  else
    echo "No gzip available"
    qndb -m mwcToast 2000 "No gzip available!"
    exit 1
  fi
  ls -l "$GZ_PATH"

  echo "Starting upload (curl)"
  CONTENT_LENGTH=$(wc -c < "$GZ_PATH" | tr -d ' ')
  if [ ! -x "$CURL_BIN" ]; then
    echo "curl not found or not executable: $CURL_BIN"
    qndb -m mwcToast 2000 "curl not found!"
    exit 1
  fi

  if ! "$CURL_BIN" -sS --fail \
    -H "Expect:" \
    -H "Content-Type: application/gzip" \
    -H "Content-Encoding: gzip" \
    --data-binary "@$GZ_PATH" \
    "$REMOTE_URL"; then
    echo "Upload failed (curl)."
    qndb -m mwcToast 3000 "Upload failed!"
    exit 1
  fi

  echo "Cleaning up temp files"
  cleanup

  echo "Upload complete"
  echo "=== Kobo upload end ==="

  qndb -m mwcToast 3000 "Successfully uploaded Kobo database!"

} >> "$LOG_PATH" 2>&1
