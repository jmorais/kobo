require 'sqlite3'

require_relative 'book'
require_relative 'event'

class Library

  attr_accessor :books, :database

  def initialize(db_path)
    @database = SQLite3::Database.open db_path
    @books = []

    load_library
  end

  def load_library

    @database.execute "SELECT ContentID, Title, Attribution, ___PercentRead, ReadStatus, Series, SeriesNumber FROM content WHERE ContentType = 6" do |book|
      begin
        @books << Book.new(book[0], book[1], book[2], book[3], book[4], book[5], book[6])
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
