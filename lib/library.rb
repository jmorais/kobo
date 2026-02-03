require 'sqlite3'
require 'json'
require 'net/http'
require 'uri'

require_relative 'book'
require_relative 'event'

class Library

  attr_accessor :books, :database

  def initialize(db_path, debug: false)
    @database = SQLite3::Database.open db_path
    @books = []
    @isbn_cache = {}
    @isbn_cache_dirty = false
    @debug = debug
    load_isbn_cache

    load_library
  end

  def load_library
    select_columns = [
      'ContentID',
      'Title',
      'Attribution',
      'COALESCE(___PercentRead, 0) AS PercentRead',
      'ReadStatus',
      'Series',
      'SeriesNumber',
      'ContentType'
    ]

    image_id_index = nil
    image_id_column = content_column_name('imageid')
    if image_id_column
      select_columns << image_id_column
      image_id_index = select_columns.length - 1
    end

    @database.execute "SELECT #{select_columns.join(', ')} FROM content WHERE ContentType IN (6, 10, 15, 16)" do |book|
      begin
        content_id = book[0].to_s
        content_type = book[7]
        if content_type.to_s == '6' && !content_id.start_with?('file://')
          next
        end
        percent_read = normalize_percent_read(book[3])
        entry = Book.new(book[0], book[1], book[2], percent_read, book[4], book[5], book[6])
        entry.image_id = image_id_index ? book[image_id_index] : nil
        @books << entry
      rescue IOError => e
        puts e.message
      end
    end


    @books.each do |book|
      @database.execute "SELECT EventType, ExtraData, EventCount FROM Event WHERE ContentID = ? AND EventType IN (46, 1020, 1021)", book.id do |event|
        begin
          book.events[event[0]] = Event.new(event[0], event[1], event[2])
        rescue IOError => e
          puts event.inspect
          puts e.message
        end
      end
    end

    total = @books.size
    if total > 0
      @books.each_with_index do |book, index|
        print "\rFetching ISBNs #{index + 1}/#{total}"
        book.isbn13 = fetch_isbn13(book)
      end
      puts "\rFetching ISBNs #{total}/#{total}"
    end

    save_isbn_cache if @isbn_cache_dirty

  end

  def to_json
    @books.map{ |x| [x.id, x.to_json] }.to_h.to_json
  end

  def to_s
    output = ''

    @books.each do |book|
      next if book.reading_time == 0

      output += "`#{book.title}` by `#{book.author}` \n"
      output += "+ Reading time: #{book.reading_time} hours \n"
      output += "+ Status: #{book.read_status} \n"
      output += "+ Page turns: #{book.page_turns} \n"
      output += "+ Percent read: #{book.percent_read}% \n\n"
    end

    puts output
  end

  def save(filepath)
    old_data = load_existing_data(filepath)
    new_data = @books.map{ |x| [x.id, x.to_json] }.to_h

    new_data.each do |k, v|
      new_data[k][:reading_sessions] = (new_data[k][:reading_sessions] + old_data[k]['reading_sessions']).uniq if old_data&.[](k)&.[]('reading_sessions')&.any?
    end

    File.write(filepath, format_output(filepath, new_data))
  end

  private

  def content_columns
    @content_columns ||= begin
      @database.table_info('content').map do |row|
        row.is_a?(Hash) ? row['name'] : row[1]
      end.compact
    rescue SQLite3::SQLException
      []
    end
  end

  def content_column_name(name)
    name_downcase = name.to_s.downcase
    content_columns.find { |column| column.to_s.downcase == name_downcase }
  end

  def normalize_percent_read(value)
    return 0 if value.nil?

    percent = value.to_f
    if percent > 0 && percent <= 1
      percent *= 100
    end
    percent.round(0).to_i
  end

  def fetch_isbn13(book)
    title = book.title.to_s.strip
    author = book.author.to_s.strip
    return nil if title.empty?

    cache_key = [title.downcase, author.downcase].join('|')
    if @isbn_cache.key?(cache_key)
      cached = normalize_isbn13(@isbn_cache[cache_key])
      return cached if cached || @isbn_cache[cache_key].nil?
      @isbn_cache.delete(cache_key)
    end

    query = { title: title, fields: 'isbn,edition_key' }
    query[:author] = author unless author.empty?
    query[:limit] = 5
    uri = URI('https://openlibrary.org/search.json')
    uri.query = URI.encode_www_form(query)
    puts "Open Library URL: #{uri}" if @debug

    response = Net::HTTP.get_response(uri)
    return cache_isbn(cache_key, nil) unless response.is_a?(Net::HTTPSuccess)

    payload = JSON.parse(response.body)
    isbn13 = nil

    Array(payload['docs']).each do |doc|
      Array(doc['isbn']).each do |isbn|
        next unless isbn.to_s.match?(/\A\d{13}\z/)

        isbn13 = isbn.to_s
        break
      end
      break if isbn13
    end

    if isbn13.nil?
      Array(payload['docs']).each do |doc|
        Array(doc['edition_key']).each do |edition_key|
          isbn13 = fetch_isbn13_from_edition(edition_key)
          break if isbn13
        end
        break if isbn13
      end
    end

    cache_isbn(cache_key, normalize_isbn13(isbn13))
  rescue JSON::ParserError, StandardError
    cache_isbn(cache_key, nil)
  end

  def fetch_isbn13_from_edition(edition_key)
    return nil if edition_key.to_s.strip.empty?

    uri = URI('https://openlibrary.org/api/books')
    uri.query = URI.encode_www_form(
      bibkeys: "OLID:#{edition_key}",
      format: 'json',
      jscmd: 'data'
    )
    puts "Open Library URL: #{uri}" if @debug

    response = Net::HTTP.get_response(uri)
    return nil unless response.is_a?(Net::HTTPSuccess)

    payload = JSON.parse(response.body)
    entry = payload["OLID:#{edition_key}"]
    return nil unless entry && entry['identifiers']

    Array(entry['identifiers']['isbn_13']).each do |isbn|
      return isbn.to_s if isbn.to_s.match?(/\A\d{13}\z/)
    end

    nil
  rescue JSON::ParserError, StandardError
    nil
  end

  def normalize_isbn13(value)
    return nil unless value

    isbn = value.to_s.strip
    return nil unless isbn.match?(/\A\d{13}\z/)

    isbn
  end

  def cache_isbn(cache_key, value)
    normalized = normalize_isbn13(value)
    @isbn_cache[cache_key] = normalized
    @isbn_cache_dirty = true
    normalized
  end

  def isbn_cache_path
    File.expand_path("../isbn_cache.json", __dir__)
  end

  def load_isbn_cache
    return unless File.exist?(isbn_cache_path)

    raw = File.read(isbn_cache_path).to_s.strip
    return if raw.empty?

    parsed = JSON.parse(raw)
    @isbn_cache = parsed.each_with_object({}) do |(key, value), acc|
      normalized = normalize_isbn13(value)
      acc[key] = normalized if normalized || value.nil?
    end
  rescue JSON::ParserError
    @isbn_cache = {}
  end

  def save_isbn_cache
    File.write(isbn_cache_path, JSON.pretty_generate(@isbn_cache))
    @isbn_cache_dirty = false
  end

  def load_existing_data(filepath)
    return {} unless File.exist?(filepath)

    raw = File.read(filepath).to_s.strip
    return {} if raw.empty?

    JSON.parse(normalize_existing_content(filepath, raw))
  rescue JSON::ParserError
    {}
  end

  def normalize_existing_content(filepath, raw)
    return raw if filepath.end_with?(".json")

    raw.sub(/\Alibrary\s*=\s*/, '')
  end

  def format_output(filepath, data)
    return data.to_json if filepath.end_with?(".json")

    "library=#{data.to_json}"
  end
end
