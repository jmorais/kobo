# Library — Kobo Database Parser

Ruby library for extracting and parsing reading statistics from Kobo's SQLite database.

## Overview

The library reads `KoboReader.sqlite` from your Kobo e-reader and extracts:

- Book metadata (title, author, series, progress)
- Reading sessions (start/end timestamps)
- Page turn events
- Highlights and vocabulary words
- ISBN-13 (via Open Library API lookup)

## Classes

### Library

Main entry point for parsing the Kobo database.

```ruby
require_relative 'lib/library'

# Initialize with database path
library = Library.new('/path/to/KoboReader.sqlite', debug: false)

# Access parsed books
library.books.each do |book|
  puts "#{book.title} by #{book.author} - #{book.reading_time}h"
end

# Export to JSON file
library.save('data.json')

# Or get JSON string
json_data = library.to_json
```

#### Methods

| Method | Description |
|--------|-------------|
| `initialize(db_path, debug: false)` | Open database and parse all data |
| `books` | Array of `Book` objects |
| `to_json` | Export library as JSON string |
| `to_s` | Human-readable summary |
| `save(filepath)` | Save JSON to file (merges with existing data) |

### Book

Represents a single book with its metadata and reading statistics.

```ruby
book = library.books.first

book.title          # "The Great Gatsby"
book.author         # "F. Scott Fitzgerald"
book.isbn13         # "9780743273565"
book.percent_read   # 100
book.read_status    # "Finished" | "Reading" | "Unread"
book.reading_time   # 8.5 (hours)
book.page_turns     # 342
book.chapters       # 9
book.series         # "Series Name" or nil
book.series_number  # "1" or nil
book.highlights     # Array of highlight hashes
book.reading_sessions # Array of [start, end] timestamp pairs
book.image_id       # Cover image identifier
```

#### Read Status

| Value | Meaning |
|-------|---------|
| `"Unread"` | Book not started |
| `"Reading"` | Currently reading |
| `"Finished"` | Completed |

### Event

Represents a reading event from the Kobo Event table.

```ruby
event = book.events[1020]  # Reading session start events

event.type        # 1020
event.count       # Number of events
event.timestamps  # Array of Time objects
```

#### Event Types

| Type | Description |
|------|-------------|
| `46` | Page turn |
| `1020` | Reading session start |
| `1021` | Reading session end |

### ExtraData

Binary parser for Kobo's ExtraData blob format (used in Event records).

```ruby
# Internal use - parses binary timestamp data
data = ExtraData.read(binary_blob)
data[:timestamps].each do |ts|
  puts Time.at(ts[:timestamp])
end
```

## Database Schema

The library reads from these Kobo SQLite tables:

### `content` Table

| Column | Usage |
|--------|-------|
| `ContentID` | Unique book identifier |
| `Title` | Book title |
| `Attribution` | Author name |
| `___PercentRead` | Reading progress (0-100) |
| `ReadStatus` | 0=Unread, 1=Reading, 2=Finished |
| `Series` | Series name |
| `SeriesNumber` | Position in series |
| `ContentType` | 6=sideloaded, 10/15/16=purchased |
| `ImageId` | Cover image reference |

### `Event` Table

| Column | Usage |
|--------|-------|
| `ContentID` | Book reference |
| `EventType` | Type of event (46, 1020, 1021) |
| `ExtraData` | Binary blob with timestamps |
| `EventCount` | Number of events |

### `Bookmark` Table (Highlights)

| Column | Usage |
|--------|-------|
| `VolumeID` | Book reference |
| `Text` | Highlighted text |
| `DateCreated` | Timestamp |
| `Hidden` | Visibility flag |

## ISBN Lookup

The library fetches ISBN-13 from the [Open Library API](https://openlibrary.org/dev/docs/api/search) using title and author:

```
https://openlibrary.org/search.json?title=Book+Title&author=Author+Name&fields=isbn&limit=1
```

Results are cached in `isbn_cache.json` to avoid repeated API calls.

## File Structure

```
lib/
├── library.rb     # Main Library class - database parsing and export
├── book.rb        # Book class - individual book data model
├── event.rb       # Event class - reading event data
└── extra_data.rb  # ExtraData class - binary blob parser
```

## Dependencies

- `sqlite3` — SQLite database access
- `bindata` — Binary data parsing (for ExtraData)
- `net/http` — Open Library API requests

## Example Output

```json
{
  "last_updated_at": "2026-02-04T10:30:00Z",
  "books": {
    "file:///mnt/onboard/Book.epub": {
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "isbn13": "9780743273565",
      "image_id": "12345-N3_LIBRARY_GRID",
      "chapters": 9,
      "highlights": [],
      "percent_read": 100,
      "read_status": "Finished",
      "page_turns": 342,
      "reading_sessions": [
        ["2026-01-10T20:00:00+00:00", "2026-01-10T22:30:00+00:00"],
        ["2026-01-11T19:00:00+00:00", "2026-01-11T21:00:00+00:00"]
      ],
      "reading_time": 8.5,
      "series": null,
      "series_number": null
    }
  }
}
```
