# Frontend — Kobo Stats Dashboard

A responsive web dashboard for visualizing your Kobo reading statistics.

## Features

### Views

- **By Book** — Browse your library, select a book to see detailed stats and per-book punchcard
- **All** — Aggregated punchcard showing all reading activity across your entire library
- **Highlights** — Browse all your highlights and vocabulary words

### Book Details

Each book displays:
- Cover image (extracted from Kobo device)
- Title, author, and series information
- Reading progress (percentage)
- Total reading time
- Page turns
- Number of reading sessions
- Chapter count
- ISBN-13 (fetched from Open Library)

### Punchcard Visualization

GitHub-style punchcard showing reading patterns:
- X-axis: Day of week (Mon–Sun)
- Y-axis: Hour of day (0–23)
- Circle size: Reading intensity

### Search & Sort

- **Search** — Filter books by title or author
- **Sort options:**
  - Last read (most recent first)
  - Reading time (most read first)
  - Title (alphabetical)
  - Author (alphabetical)

## File Structure

```
frontend/
├── index.html          # Main dashboard page
├── upload.php          # Handles database uploads from Kobo
├── data.json           # Extracted reading data (generated)
├── covers/             # Book cover images (extracted from Kobo)
├── uploads/            # Uploaded database files
├── css/
│   ├── bootstrap.css   # Bootstrap 3 framework
│   └── style.css       # Custom styles (compiled from SCSS)
├── js/
│   ├── main.js         # Dashboard logic and rendering
│   ├── punchcard.js    # D3.js punchcard visualization
│   └── bootstrap.min.js
└── scss/               # SCSS source files
    ├── style.scss      # Main stylesheet
    ├── _variables.scss # Color and size variables
    ├── _layout.scss    # Page layout
    ├── _books.scss     # Book list and detail styles
    ├── _punchcard.scss # Punchcard chart styles
    ├── _highlights.scss # Highlights view
    └── ...
```

## Data Format

The dashboard reads from `data.json` with the following structure:

```json
{
  "last_updated_at": "2026-02-04T10:30:00Z",
  "books": {
    "book-content-id": {
      "title": "Book Title",
      "author": "Author Name",
      "isbn13": "9781234567890",
      "image_id": "cover-image-id",
      "percent_read": 75,
      "read_status": "Reading",
      "reading_time": 12.5,
      "page_turns": 450,
      "chapters": 24,
      "series": "Series Name",
      "series_number": "1",
      "reading_sessions": [
        ["2026-01-15T20:00:00Z", "2026-01-15T21:30:00Z"],
        ["2026-01-16T19:00:00Z", "2026-01-16T20:00:00Z"]
      ],
      "highlights": [
        {
          "type": "quote",
          "text": "Highlighted text passage...",
          "date": "2026-01-15T20:30:00Z"
        }
      ]
    }
  }
}
```

## Upload API

The `upload.php` endpoint accepts:

- **POST** with `application/x-tar` — Tar archive containing `KoboReader.sqlite` and optionally `.kobo-images/`
- **POST** with `multipart/form-data` — SQLite database file upload

After receiving the database, it automatically:
1. Extracts the archive
2. Runs `stats.rb` to parse the database
3. Moves cover images to `covers/`
4. Updates `data.json`

## Dependencies

- [Bootstrap 3](https://getbootstrap.com/docs/3.4/) — CSS framework
- [D3.js 4](https://d3js.org/) — Data visualization (punchcard)
- [Moment.js](https://momentjs.com/) — Date/time formatting
- [jQuery 1.12](https://jquery.com/) — DOM manipulation

## Development

### Compiling SCSS

If you modify the SCSS files, compile them to CSS:

```bash
# Using sass (Dart Sass)
sass scss/style.scss css/style.css

# Or watch for changes
sass --watch scss/style.scss:css/style.css
```

### Local Testing

1. Generate test data:
   ```bash
   ruby stats.rb -d /path/to/KoboReader.sqlite -o frontend/data.json
   ```

2. Serve the frontend:
   ```bash
   cd frontend
   python3 -m http.server 8080
   ```

3. Open `http://localhost:8080` in your browser.

## Customization

### Colors

Edit `scss/_variables.scss` to change the color scheme:

```scss
$primary-color: #2c3e50;
$accent-color: #3498db;
$background-color: #ecf0f1;
```

### Layout

The dashboard uses a responsive 12-column grid (Bootstrap). Modify `scss/_layout.scss` and `scss/_responsive.scss` for layout changes.
