# Kobo Auto-Sync

Copy both files to the root of your Kobo (onboard storage):

- `menu.conf` → `/mnt/onboard/.adds/nm/`
- `upload.sh` → `/mnt/onboard/auto-sync/`

Then make the script executable on the device:

```
chmod +x /mnt/onboard/auto-sync/upload.sh
```

`menu.conf` adds a **Tweak** menu with **Sync** (runs `upload.sh`) and **Reboot`.
