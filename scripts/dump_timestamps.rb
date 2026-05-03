#!/usr/bin/env ruby
require 'time'
require_relative '../lib/extra_data'

if ARGV.length != 1
  STDERR.puts "Usage: #{$0} path/to/blob_file"
  exit 1
end

path = ARGV[0]
begin
  data = File.binread(path)
rescue => e
  STDERR.puts "Failed to read file: #{e.message}"
  exit 2
end

ed = ExtraData.read(data)
timestamps = ed[:timestamps].map { |t| Time.at(t[:timestamp]) }

timestamps.each do |ts|
  puts ts.iso8601
end
