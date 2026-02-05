# Kobo Stats Reader

A self-hosted solution to visualize and track your Kobo e-reader statistics. Extract reading sessions, book progress, highlights, and more from your Kobo device and display them in a beautiful web dashboard.

![Dashboard Preview](frontend/covers/.gitkeep)

## Features

- 📚 **Book Library** — View all your books with cover images, reading progress, and metadata
- ⏱️ **Reading Time Tracking** — See total reading time per book and overall
- 📊 **Punchcard Visualizations** — Hourly/daily reading patterns displayed as GitHub-style punchcards
- 🔖 **Highlights & Annotations** — Browse all your highlights and vocabulary words
- 📈 **Statistics** — Total books, reading sessions, page turns, and more
- 🔄 **Auto-Sync** — Optionally sync directly from your Kobo device via WiFi

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Kobo Device   │ ───▶ │   Docker App    │ ───▶ │   Web Browser   │
│  (SQLite DB)    │      │  (Ruby + PHP)   │      │   (Dashboard)   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- A Kobo e-reader (tested with Kobo Clara, Libra, Sage)

### Deployment (Synology NAS / Server)

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/kobo-stats-reader.git
   cd kobo-stats-reader
   ```

2. **Create data directories on the server:**

   ```bash
   mkdir -p /volume3/docker/kobo/uploads /volume3/docker/kobo/covers
   touch /volume3/docker/kobo/data.json /volume3/docker/kobo/isbn_cache.json
   echo '{}' > /volume3/docker/kobo/data.json
   echo '{}' > /volume3/docker/kobo/isbn_cache.json
   sudo chown -R 1000:1000 /volume3/docker/kobo
   ```

3. **Update `docker-compose.yml` volumes** to point to your server paths:

   ```yaml
   volumes:
     - /volume3/docker/kobo/uploads:/var/www/html/frontend/uploads
     - /volume3/docker/kobo/covers:/var/www/html/frontend/covers
     - /volume3/docker/kobo/data.json:/var/www/html/frontend/data.json
     - /volume3/docker/kobo/isbn_cache.json:/var/www/html/isbn_cache.json
   ```

4. **Build and run:**

   ```bash
   docker-compose up -d --build
   ```

5. **Access the dashboard** at `http://your-server:49170`

### Local Development

1. **Install Ruby 3.2+ and dependencies:**

   ```bash
   bundle install
   ```

2. **Connect your Kobo** via USB and run:

   ```bash
   ruby stats.rb -o frontend/data.json
   ```

3. **Open `frontend/index.html`** in your browser.

## Usage

### Manual Import

Connect your Kobo via USB and run:

```bash
# Auto-detect Kobo mount point
ruby stats.rb -o frontend/data.json

# Or specify the database path
ruby stats.rb -d /path/to/KoboReader.sqlite -o frontend/data.json
```

### Automatic Sync (Kobo → Server)

Set up auto-sync to upload your reading data directly from your Kobo over WiFi. See [auto-sync/README.md](auto-sync/README.md) for instructions.

### Command Line Options

```
Usage: ./stats.rb -d [KoboReader.sqlite path] [options]...

  -d, --database:  path to your KoboReader.sqlite
  -o,   --output:  specify output file (default: data.json)
  -c,  --console:  outputs data to console instead of file
  --debug:         print Open Library ISBN query URLs
  -h,     --help:  show this message
```

## Project Structure

```
├── stats.rb              # Main entry point - extracts data from Kobo DB
├── lib/                  # Ruby library for parsing Kobo data
├── frontend/             # Web dashboard (HTML/JS/CSS)
├── auto-sync/            # Scripts to sync from Kobo device
├── docker/               # Docker configuration files
├── Dockerfile            # Container build instructions
└── docker-compose.yml    # Container orchestration
```

## Troubleshooting

### Permission Issues with Docker Volumes

If you get permission errors after binding volumes:

```bash
# Check container user ID
docker exec -it kobo-stats-reader id

# Fix ownership (usually UID 1000)
sudo chown -R 1000:1000 /volume3/docker/kobo
```

### Database Not Found

Make sure your Kobo is mounted and the database exists at:
- macOS: `/Volumes/KOBOeReader/.kobo/KoboReader.sqlite`
- Linux: `/media/$USER/KOBOeReader/.kobo/KoboReader.sqlite`

## Documentation

- [Frontend Documentation](frontend/README.md) — Dashboard features and customization
- [Library Documentation](lib/README.md) — Ruby library API reference
- [Auto-Sync Documentation](auto-sync/README.md) — WiFi sync setup for Kobo

## License

MIT
