#!/usr/bin/env ruby
#/ Usage: ./stats.rb -d [KoboReader.sqlite path] [options]...
#/
#/   If no -d is provided, it will try:
#/     - /Volumes/KOBOeReader/.kobo/KoboReader.sqlite
#/     - ./KoboReader.sqlite
#/
#/   -d, --database:  path to your KoboReader.sqlite
#/   -o,   --output:  specify output file (default: data.json)
#/   -c,  --console:  outputs data to console instead of file
#/   --debug:         print Open Library ISBN query URLs
#/   -h,     --help:  show this message

$stderr.sync = true
require 'optparse'
require 'json'
require 'fileutils'
require_relative 'lib/library.rb'

options = {
  db_path: "",
  output_file: "data.json",
  console: false,
  debug: false
}

file = __FILE__

ARGV.options do |opts|
  opts.on("-c", "--console")              { options[:console] = true }
  opts.on("-o", "--output=val", String)   { |val| options[:output_file] = val }
  opts.on("-d", "--database=val", String)  { |val| options[:db_path] = val }
  opts.on("--debug")                      { options[:debug] = true }
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

def extract_kobo_covers(source_dir, output_dir)
  return unless Dir.exist?(source_dir)

  FileUtils.rm_rf(output_dir)
  FileUtils.mkdir_p(output_dir)

  Dir.glob(File.join(source_dir, '**', '*')).each do |path|
    next unless File.file?(path)

    basename = File.basename(path)
    basename = basename.sub(/\.parsed\z/i, '')
    basename = "#{basename}.jpg" unless basename.downcase.end_with?('.jpg')

    FileUtils.cp(path, File.join(output_dir, basename))
  end

  puts "Covers extracted to #{output_dir}"
end


if options[:db_path].strip == ""
  options[:db_path] = resolve_default_db_path.to_s
end

if options[:db_path].strip == ""
  exec "grep ^#/<'#{file}'|cut -c4-"
  exit
end

library = Library.new(options[:db_path], debug: options[:debug])

extract_kobo_covers("/Volumes/KOBOeReader/.kobo-images", File.expand_path("./frontend/covers"))

if options[:console]
  puts library.to_s
else
  library.save(options[:output_file])
  puts "Data exported to #{options[:output_file]}!"
end
