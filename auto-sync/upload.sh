#!/bin/sh
set -e

LOG_PATH="/mnt/onboard/.adds/scripts/auto-sync/out.log"
DB_PATH="/mnt/onboard/.kobo/KoboReader.sqlite"
IMG_PATH="/mnt/onboard/.kobo-images"
REMOTE_URL="https://kobo.anya.home/upload.php"
CURL_BIN="/mnt/onboard/.adds/scripts/auto-sync/curl"
SQLITE_BIN="/mnt/onboard/.adds/scripts/auto-sync/sqlite3"
TMP_DIR="/tmp/kobo_upload"
TMP_DB="${TMP_DIR}/KoboReader.sqlite"
TAR_PATH="/tmp/kobo_upload.tar"

LD_LIBRARY_PATH="/mnt/onboard/.adds/scripts/auto-sync/lib:${LD_LIBRARY_PATH}"
export LD_LIBRARY_PATH

cleanup() {
  rm -f "$TMP_DB" "$TAR_PATH"
  rm -rf "$TMP_DIR"
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

  echo "Snapshotting DB to $TMP_DB (sqlite3 .backup)"
  if [ ! -x "$SQLITE_BIN" ]; then
    echo "sqlite3 not found or not executable: $SQLITE_BIN"
    qndb -m mwcToast 2000 "sqlite3 not found!"
    exit 1
  fi
  rm -rf "$TMP_DIR"
  mkdir -p "$TMP_DIR"
  "$SQLITE_BIN" "$DB_PATH" ".backup '$TMP_DB'"
  ls -l "$TMP_DB"

  TAR_ITEMS="KoboReader.sqlite"
  if [ -d "$IMG_PATH" ]; then
    echo "Copying filtered images from $IMG_PATH to $TMP_DIR/.kobo-images"
    mkdir -p "$TMP_DIR/.kobo-images"
    find "$IMG_PATH" -type f -name '*N3_LIBRARY_GRID*' | while read -r img; do
      cp "$img" "$TMP_DIR/.kobo-images/$(basename "$img")"
    done
    TAR_ITEMS="$TAR_ITEMS .kobo-images"
  else
    echo "Images folder not found: $IMG_PATH (continuing without images)"
  fi

  echo "Creating tar archive at $TAR_PATH"
  if command -v tar >/dev/null 2>&1; then
    (cd "$TMP_DIR" && tar -cf "$TAR_PATH" $TAR_ITEMS)
  elif command -v busybox >/dev/null 2>&1; then
    (cd "$TMP_DIR" && busybox tar -cf "$TAR_PATH" $TAR_ITEMS)
  else
    echo "No tar available"
    qndb -m mwcToast 2000 "No tar available!"
    exit 1
  fi
  ls -l "$TAR_PATH"

  echo "Starting upload (curl)"
  CONTENT_LENGTH=$(wc -c < "$TAR_PATH" | tr -d ' ')
  if [ ! -x "$CURL_BIN" ]; then
    echo "curl not found or not executable: $CURL_BIN"
    qndb -m mwcToast 2000 "curl not found!"
    exit 1
  fi

  if ! "$CURL_BIN" -sS --fail --insecure \
    -H "Expect:" \
    -H "Content-Type: application/x-tar" \
    --data-binary "@$TAR_PATH" \
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
