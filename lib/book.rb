class Book

  attr_accessor :title, :author, :id, :events, :reading_time, :page_turns, :percent_read, :read_status, :series, :series_number, :isbn13, :image_id, :chapters, :highlights

  READ_STATUS = %w[Unread Reading Finished]

  def initialize(id, title, author, percent_read, read_status, series, series_number)
    @id, @title, @author, @percent_read, @read_status, @series, @series_number = id, title, author, percent_read, read_status, series, series_number
    @events = {}
    @highlights = []
  end

  def read_status
    READ_STATUS[@read_status]
  end

  def reading_time(min_time = 0)
    @reading_time || calc_reading_time(min_time)
  end

  def page_turns
    @page_turns || calc_page_turns
  end

  def calc_reading_time(min_time)
    @reading_time = 0

    reading_sessions.each do |reading_session|
      next if reading_session[1] == nil
      if reading_session[1] - reading_session[0] > min_time
        @reading_time += reading_session[1] - reading_session[0]
      end
    end

    @reading_time = (@reading_time / 60.0 / 60.0).round(1)

    @reading_time
  end

  def reading_sessions
    if @events[1020] && @events[1021]
      @events[1020].timestamps.zip(@events[1021].timestamps)
    else
      []
    end
  end

  def calc_page_turns
    @page_turns = 0

    if @events[46]
      @page_turns = @events[46].count
    end

    @page_turns
  end

  def to_json
    {
      title: @title,
      author: @author,
      isbn13: @isbn13,
      image_id: @image_id,
      chapters: @chapters,
      highlights: @highlights,
      percent_read: @percent_read,
      read_status: read_status,
      page_turns: page_turns,
      reading_sessions: reading_sessions,
      reading_time: reading_time,
      series: @series,
      series_number: @series_number
    }
  end

end
