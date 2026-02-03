require 'bindata'

class ExtraData < BinData::Record
  endian :big

  uint32 :records
  uint32 :len_name
  string :name, read_length: lambda { len_name + 1 }
  uint32 :data_type # ignore
  uint32 :timestamps_length

  array :timestamps, initial_length: :timestamps_length do
    uint32 :data_type
    bit1 :pad
    uint32 :timestamp
  end
end
