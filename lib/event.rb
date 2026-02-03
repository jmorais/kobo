require_relative 'extra_data'

class Event
  attr_accessor :type, :data, :count, :timestamps

  def initialize(type, data, count)
    @type, @data, @count = type, data, count
    @timestamps = []

    if @type != 46
      ExtraData.read(data)[:timestamps].each do |timestamp|
        @timestamps << Time.at(timestamp[:timestamp])
      end
    end
  end

  def to_json
    {
      type: @type,
      count: @count,
      timestamps: @timestamps
    }
  end
end