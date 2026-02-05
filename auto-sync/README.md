# Kobo Auto-Sync

Automatically sync your Kobo reading data to your server over WiFi, without connecting via USB.

## Overview

This adds a **Sync** button to your Kobo's NickelMenu that:
1. Creates a safe snapshot of your Kobo database
2. Packages it with cover images into a tar archive
3. Uploads it to your server via HTTPS
4. Shows toast notifications for progress/status

## Requirements

- Kobo e-reader with [NickelMenu](https://pgaskin.net/NickelMenu/) installed
- WiFi connection to your server
- Server running the Kobo Stats Reader container

## Installation

### 1. Copy Files to Kobo

Connect your Kobo via USB and copy these files:

| Source | Destination on Kobo |
|--------|---------------------|
| `menu.conf` | `/mnt/onboard/.adds/nm/` |
| `upload.sh` | `/mnt/onboard/.adds/scripts/auto-sync/` |
| `curl` | `/mnt/onboard/.adds/scripts/auto-sync/` |
| `sqlite3` | `/mnt/onboard/.adds/scripts/auto-sync/` |
| `lib/` | `/mnt/onboard/.adds/scripts/auto-sync/lib/` |

### 2. Configure the Upload URL

Edit `upload.sh` and set your server URL:

```bash
REMOTE_URL="https://your-server.local/upload.php"
```

### 3. Make Scripts Executable

On Linux/macOS, or via SSH to the Kobo:

```bash
chmod +x /mnt/onboard/.adds/scripts/auto-sync/upload.sh
chmod +x /mnt/onboard/.adds/scripts/auto-sync/curl
chmod +x /mnt/onboard/.adds/scripts/auto-sync/sqlite3
```

### 4. Eject and Reboot

Safely eject your Kobo and reboot it. You should now see a **Tweak** menu with **Sync** and **Reboot** options.

## Usage

1. Connect your Kobo to WiFi
2. Go to **Menu** → **Tweak** → **Sync**
3. Wait for the "Successfully uploaded" toast notification
4. Check your dashboard for updated stats

## File Structure

```
auto-sync/
├── menu.conf       # NickelMenu configuration
├── upload.sh       # Main upload script
├── curl            # ARM-compiled curl binary
├── sqlite3         # ARM-compiled sqlite3 binary
└── lib/
    └── libsqlite3.so.0  # SQLite shared library
```

## How It Works

1. **Database Snapshot** — Uses `sqlite3 .backup` to create a consistent copy of the database while Kobo might be writing to it

2. **Cover Images** — Copies `*N3_LIBRARY_GRID*` images from `.kobo-images/` (these are the optimized cover thumbnails)

3. **Tar Archive** — Packages everything into a tar file for efficient upload

4. **HTTPS Upload** — Sends the archive to your server's `upload.php` endpoint

5. **Server Processing** — The server extracts the archive, runs `stats.rb`, and updates the dashboard

## Configuration

### menu.conf

```ini
menu_item :main :Tweak
  menu_item :Tweak :Sync
    chain_success : skip 2
      cmd_output : 500 : /mnt/onboard/.adds/scripts/auto-sync/upload.sh
      cmd_spawn : qndb -m mwcToast 3000 "Sync failed..."
  menu_item :Tweak :Reboot
    power : reboot
```

### upload.sh Variables

| Variable | Description |
|----------|-------------|
| `LOG_PATH` | Where to write logs on the Kobo |
| `DB_PATH` | Path to Kobo database (don't change) |
| `IMG_PATH` | Path to cover images (don't change) |
| `REMOTE_URL` | Your server's upload endpoint |
| `CURL_BIN` | Path to curl binary |
| `SQLITE_BIN` | Path to sqlite3 binary |

## Troubleshooting

### Check Logs

Logs are written to:
```
/mnt/onboard/.adds/scripts/auto-sync/out.log
```

### "Upload failed" Toast

1. Check WiFi connection
2. Verify `REMOTE_URL` is correct
3. Check server is running and accessible
4. Review logs for detailed error

### "curl not found" / "sqlite3 not found"

Make sure the binaries are:
1. Copied to the correct location
2. Marked as executable (`chmod +x`)

### SSL Certificate Errors

The script uses `--insecure` flag for self-signed certificates. For proper SSL:
1. Use a valid certificate on your server
2. Remove `--insecure` from the curl command

## Building the Binaries

The included `curl` and `sqlite3` binaries are compiled for ARM (Kobo's processor). If you need to rebuild them:

```bash
# Cross-compile for ARM
# Requires arm-linux-gnueabihf toolchain
./configure --host=arm-linux-gnueabihf
make
```

Or extract them from a Debian ARM package.
