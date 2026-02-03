#!/usr/bin/env ruby
#/ Usage: ./stats.rb -d [KoboReader.sqlite path] [options]...
#/
#/   If no -d is provided, it will try:
#/     - /Volumes/KOBOeReader/.kobo/KoboReader.sqlite
#/     - ./KoboReader.sqlite
#/
#/   -d, --database:  path to your KoboReader.sqlite
#/   -o,   --output:  specify output file (default: data.js)
#/                   use .json extension for pure JSON output
#/   -c,  --console:  outputs data to console instead of file
#/   -h,     --help:  show this message

$stderr.sync = true
require 'optparse'
require 'json'
require_relative 'lib/library.rb'

options = {
  db_path: "",
  output_file: "data.js",
  console: false
}

file = __FILE__

ARGV.options do |opts|
  opts.on("-c", "--console")              { options[:console] = true }
  opts.on("-o", "--output=val", String)   { |val| options[:output_file] = val }
  opts.on("-d", "--database=val", String)  { |val| options[:db_path] = val }
  opts.on_tail("-h", "--help")         { exec "grep ^#/<'#{file}'|cut -c4-" }
  opts.parse!
end

def resolve_default_db_path
  candidates = [
    "/Volumes/KOBOeReader/.kobo/KoboReader.sqlite",
    File.expand_path("./KoboReader.sqlite")
  ]

  candidates.find { |path| File.exist?(path) }
end

if options[:db_path].strip == ""
  options[:db_path] = resolve_default_db_path.to_s
end

if options[:db_path].strip == ""
  exec "grep ^#/<'#{file}'|cut -c4-"
  exit
end

library = Library.new(options[:db_path])

if options[:console]
  puts library.to_s
else
  library.save(options[:output_file])
  puts "Data exported to #{options[:output_file]}!"
end
