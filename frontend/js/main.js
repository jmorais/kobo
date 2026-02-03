Date.prototype.withoutTime = function () {
  var d = new Date(this);
  d.setHours(0, 0, 0, 0);
  return d;
}

Array.prototype.sum = function (prop) {
  var total = 0
  for ( var i = 0, _len = this.length; i < _len; i++ ) {
    total += this[i][prop]
  }
  return total
}

function minutes_per_hour_in_timespan(start, end) {
  // start and end should be in decimal HOURS

  if (end < start)
    end += 24

  starting_hour = Math.trunc(start);
  ending_hour = Math.trunc(end);
  current_hour = starting_hour;
  hours = {};

  if (starting_hour == ending_hour) {
    hours[starting_hour] = 1*((end - start)*60).toFixed(0);
    return hours;
  }

  hours[starting_hour] = 1*((starting_hour + 1 - start)*60).toFixed(0)

  for(i = starting_hour+1; i < ending_hour; i++) {
    current_hour = i;

    hours[current_hour] |= 0;
    hours[current_hour] += 60;
  }

  current_hour += 1;

  hours[current_hour] |= 0;
  hours[current_hour] += 1*((end - ending_hour)*60).toFixed(0);

  for(var hour in hours) {
    if (hours[hour] == 0)
      delete hours[hour];
  }

  return hours;
}

function reading_sessions_punchcard() {
  var chart_data = [];

  $.each(library.books, function(i, book) {
    $.each(book.reading_sessions, function(j, reading_session) {

      duration = (Date.parse(reading_session[1]) - Date.parse(reading_session[0]));
      start = new Date(reading_session[0]);
      start_decimal = start.getHours() + start.getMinutes()/60;
      end = new Date(reading_session[1]);
      end_decimal = end.getHours() + end.getMinutes()/60;

      raw_punchdata = minutes_per_hour_in_timespan(start_decimal, end_decimal);

      // console.log(book.title);
      // console.log(start_decimal);
      // console.log(end_decimal);

      for(var hour in raw_punchdata) {
        if (hour < 24) {
          chart_data.push([start.getDay(), hour, raw_punchdata[hour]]);
        } else {
          chart_data.push([end.getDay(), hour-24, raw_punchdata[hour]]);
        }
      }

    });
  });

  punchcard(data);
}

function reading_sessions_heatmap() {
  var date_count = {};
  var dates = {};
  var chart_data = [];

  $.each(library, function(i, book) {
    $.each(book.reading_sessions, function(j, reading_session) {

      key = (new Date(reading_session[0])).withoutTime().toISOString();
      dates[key] = dates[key] || [];
      duration = (Date.parse(reading_session[1]) - Date.parse(reading_session[0])) / 1000;

      if (duration > 120) {
        dates[key].push({
          name: book.title,
          date: reading_session[0],
          value: duration
        });
      }

    });
  });

  $.each(dates, function(date, details){
    data = {

      date: new Date(date),
      total: details.sum('value'),
      details: details

    };


    chart_data.push(data);
  });

  var color = '#cd2327';
  var overview = 'year';
  var print = function (val) {
    console.log(val);
  };

  calendarHeatmap.init(chart_data, color, overview, 'chart-one', print);

}


$(function(){
  reading_sessions_heatmap();
  reading_sessions_punchcard();
});