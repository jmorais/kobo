function normalizeLibrary(raw) {
  if (!raw) {
    return { books: [] };
  }

  if (Array.isArray(raw.books)) {
    return { books: raw.books };
  }

  if (Array.isArray(raw)) {
    return { books: raw };
  }

  var books = Object.keys(raw).map(function (id) {
    var book = raw[id] || {};
    book.id = id;
    return book;
  });

  return { books: books };
}

function safeSessions(book) {
  if (!book || !Array.isArray(book.reading_sessions)) {
    return [];
  }
  return book.reading_sessions.filter(function (session) {
    return Array.isArray(session) && session.length >= 2 && session[0] && session[1];
  });
}

function calculateReadingTime(book) {
  if (typeof book.reading_time === 'number' && !isNaN(book.reading_time)) {
    return book.reading_time;
  }

  var sessions = safeSessions(book);
  var seconds = sessions.reduce(function (total, session) {
    var start = Date.parse(session[0]);
    var end = Date.parse(session[1]);
    if (!isNaN(start) && !isNaN(end)) {
      total += Math.max(0, (end - start) / 1000);
    }
    return total;
  }, 0);

  return Math.round((seconds / 3600) * 10) / 10;
}

function countReadingSessions(book, minMinutes) {
  var sessions = safeSessions(book);
  var minSeconds = (minMinutes || 10) * 60;
  return sessions.reduce(function (total, session) {
    var start = Date.parse(session[0]);
    var end = Date.parse(session[1]);
    if (!isNaN(start) && !isNaN(end) && (end - start) / 1000 >= minSeconds) {
      total += 1;
    }
    return total;
  }, 0);
}

function formatHours(hours) {
  if (!hours || isNaN(hours)) {
    return '0.0';
  }
  return hours.toFixed(1);
}

function formatHoursAndMinutes(hours) {
  if (!hours || isNaN(hours)) {
    return '';
  }
  var totalMinutes = Math.round(hours * 60);
  var wholeHours = Math.floor(totalMinutes / 60);
  var minutes = totalMinutes % 60;
  if (wholeHours === 0 && minutes === 0) {
    return '';
  }
  if (wholeHours === 0) {
    return minutes + 'm';
  }
  if (minutes === 0) {
    return wholeHours + 'h';
  }
  return wholeHours + 'h ' + minutes + 'm';
}

function formatLocalDate(date) {
  var year = date.getFullYear();
  var month = (date.getMonth() + 1).toString().padStart(2, '0');
  var day = date.getDate().toString().padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function formatOrdinal(value) {
  var remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) {
    return value + 'th';
  }
  switch (value % 10) {
    case 1:
      return value + 'st';
    case 2:
      return value + 'nd';
    case 3:
      return value + 'rd';
    default:
      return value + 'th';
  }
}

function formatDuration(totalMinutes) {
  var hours = Math.floor(totalMinutes / 60);
  var minutes = Math.round(totalMinutes % 60);
  return {
    hours: hours,
    minutes: minutes,
    label: hours + 'h ' + minutes + 'm'
  };
}

function formatDurationLabel(totalMinutes) {
  var duration = formatDuration(totalMinutes);
  if (duration.hours === 0 && duration.minutes === 0) {
    return '0m';
  }
  if (duration.hours === 0) {
    return duration.minutes + 'm';
  }
  if (duration.minutes === 0) {
    return duration.hours + 'h';
  }
  return duration.hours + 'h ' + duration.minutes + 'm';
}

function getDayTooltip() {
  var tooltip = d3.select('body').select('.day-tooltip');
  if (!tooltip.empty()) {
    return tooltip;
  }
  return d3.select('body')
    .append('div')
    .attr('class', 'day-tooltip')
    .style('opacity', 0);
}

function collectSessions(books) {
  var sessions = [];
  books.forEach(function (book) {
    safeSessions(book).forEach(function (session) {
      var start = new Date(session[0]);
      var end = new Date(session[1]);
      if (isNaN(start) || isNaN(end)) {
        return;
      }
      sessions.push({
        start: start,
        end: end,
        bookId: book.id,
        bookTitle: book.title || 'Untitled'
      });
    });
  });
  return sessions;
}

function getAvailableYears(sessions) {
  var years = {};
  sessions.forEach(function (session) {
    years[session.start.getFullYear()] = true;
    years[session.end.getFullYear()] = true;
  });
  return Object.keys(years)
    .map(function (value) {
      return parseInt(value, 10);
    })
    .sort(function (a, b) {
      return a - b;
    });
}

function getDefaultYear(years) {
  var currentYear = new Date().getFullYear();
  if (years.indexOf(currentYear) !== -1) {
    return currentYear;
  }
  return years.length ? years[years.length - 1] : currentYear;
}

function buildDayTotalsForYear(sessions, year) {
  var totals = {};

  sessions.forEach(function (session) {
    var start = session.start;
    var end = session.end;
    if (end <= start) {
      return;
    }

    var current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    var last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    while (current <= last) {
      if (current.getFullYear() === year) {
        var dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
        var dayEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 23, 59, 59, 999);

        var segmentStart = start > dayStart ? start : dayStart;
        var segmentEnd = end < dayEnd ? end : dayEnd;

        if (segmentEnd > segmentStart) {
          var minutes = (segmentEnd - segmentStart) / 60000;
          var dateKey = formatLocalDate(current);
          if (!totals[dateKey]) {
            totals[dateKey] = {
              date: new Date(current.getFullYear(), current.getMonth(), current.getDate()),
              totalMinutes: 0
            };
          }
          totals[dateKey].totalMinutes += minutes;
        }
      }

      current.setDate(current.getDate() + 1);
    }
  });

  return Object.keys(totals).map(function (key) {
    var entry = totals[key];
    var date = entry.date;
    return {
      dateKey: key,
      date: date,
      totalMinutes: entry.totalMinutes,
      month: date.getMonth(),
      dayOfWeek: date.getDay(),
      weekIndex: Math.floor((date.getDate() - 1) / 7)
    };
  });
}

function buildSessionsByDate(sessions) {
  var byDate = {};

  sessions.forEach(function (session) {
    var start = session.start;
    var end = session.end;
    if (end <= start) {
      return;
    }

    var current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    var last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    while (current <= last) {
      var dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
      var dayEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 23, 59, 59, 999);

      var segmentStart = start > dayStart ? start : dayStart;
      var segmentEnd = end < dayEnd ? end : dayEnd;

      if (segmentEnd > segmentStart) {
        var dateKey = formatLocalDate(current);
        if (!byDate[dateKey]) {
          byDate[dateKey] = [];
        }
        byDate[dateKey].push({
          start: segmentStart,
          end: segmentEnd,
          bookTitle: session.bookTitle,
          bookId: session.bookId
        });
      }

      current.setDate(current.getDate() + 1);
    }
  });

  return byDate;
}

function renderYearNav(containerId, years, selectedYear, onSelect) {
  var container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (!years.length) {
    container.innerHTML = '<div class="empty">No years available.</div>';
    return;
  }

  years.forEach(function (year) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'year-button' + (year === selectedYear ? ' active' : '');
    button.textContent = year;
    button.addEventListener('click', function () {
      onSelect(year);
    });
    container.appendChild(button);
  });
}

function renderYearPunchcard(targetId, sessions, year, color, selectedDateKey, sessionsByDate, onDayClick) {
  var container = document.getElementById(targetId);
  if (!container) {
    return;
  }

  container.innerHTML = '';
  var tooltip = getDayTooltip();

  var dayTotals = buildDayTotalsForYear(sessions, year);
  if (!dayTotals.length) {
    container.innerHTML = '<div class="empty">No reading sessions in this year.</div>';
    return;
  }

  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var weekSlots = 6;
  var margin = { top: 20, right: 0, bottom: 40, left: 40 };
  var width = container.clientWidth || 720;
  var height = 320;
  var innerWidth = width - margin.left - margin.right;
  var innerHeight = height - margin.top - margin.bottom;

  var totalsByDate = dayTotals.reduce(function (map, entry) {
    map[entry.dateKey] = entry;
    return map;
  }, {});

  var svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  var chart = svg.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var xScale = d3.scaleBand()
    .domain(months)
    .range([0, innerWidth])
    .padding(0.1);

  var yScale = d3.scaleBand()
    .domain(days)
    .range([0, innerHeight])
    .padding(0.15);

  var maxMinutes = d3.max(dayTotals, function (d) { return d.totalMinutes; }) || 1;
  var rScale = d3.scaleSqrt()
    .domain([0, maxMinutes])
    .range([2, Math.min(xScale.bandwidth() / weekSlots, yScale.bandwidth()) * 0.45]);

  var xAxis = d3.axisBottom(xScale);
  var yAxis = d3.axisLeft(yScale).tickFormat(function (value) {
    var index = days.indexOf(value);
    return dayLabels[index] || value;
  });

  chart.append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', 'translate(0,' + innerHeight + ')')
    .call(xAxis);

  chart.append('g')
    .attr('class', 'axis axis-y')
    .call(yAxis);

  var slotWidth = xScale.bandwidth() / weekSlots;

  chart.selectAll('circle.day-dot')
    .data(dayTotals)
    .enter()
    .append('circle')
    .attr('class', function (d) {
      return 'day-dot' + (d.dateKey === selectedDateKey ? ' active' : '');
    })
    .attr('cx', function (d) {
      return xScale(months[d.month]) + slotWidth * (d.weekIndex + 0.5);
    })
    .attr('cy', function (d) {
      return yScale(days[d.dayOfWeek]) + yScale.bandwidth() / 2;
    })
    .attr('r', function (d) {
      return rScale(d.totalMinutes);
    })
    .attr('fill', color || '#2563eb')
    .attr('data-date', function (d) { return d.dateKey; })
    .on('mouseover', function (d) {
      var entry = totalsByDate[d.dateKey];
      if (!entry) {
        return;
      }

      var durationLabel = formatDurationLabel(entry.totalMinutes);
      var date = entry.date;
      var dateLabel = days[date.getDay()] + ', ' + formatOrdinal(date.getDate()) + ' of ' + monthNames[date.getMonth()];
      var headline = durationLabel + ' of reading on ' + dateLabel;
      var sessionsForDay = (sessionsByDate && sessionsByDate[d.dateKey]) || [];
      var bookTitles = Array.from(new Set(sessionsForDay.map(function (session) {
        return session.bookTitle;
      }))).sort();
      var sessionCount = sessionsForDay.length;

      tooltip.html(
        '<div class="tooltip-title">' + headline + '</div>' +
        '<div class="tooltip-meta">' + sessionCount + ' session' + (sessionCount === 1 ? '' : 's') + '</div>' +
        (bookTitles.length ? '<div class="tooltip-subtitle">Books read</div>' : '') +
        (bookTitles.length ? '<ul>' + bookTitles.map(function (title) {
          return '<li>' + title + '</li>';
        }).join('') + '</ul>' : '<div class="tooltip-empty">No books recorded.</div>')
      );

      tooltip
        .style('opacity', 1)
        .style('left', (d3.event.pageX + 12) + 'px')
        .style('top', (d3.event.pageY - 18) + 'px');
    })
    .on('mousemove', function () {
      tooltip
        .style('left', (d3.event.pageX + 12) + 'px')
        .style('top', (d3.event.pageY - 18) + 'px');
    })
    .on('mouseout', function () {
      tooltip.style('opacity', 0);
    })
    .on('click', function (d) {
      if (onDayClick) {
        onDayClick(d.dateKey);
      }
    });
}

function renderTimeline(targetId, labelId, dateKey, sessionsByDate, options) {
  var container = document.getElementById(targetId);
  var label = document.getElementById(labelId);
  var modal = document.getElementById('timeline-modal');
  var title = document.getElementById('timeline-title');
  if (!container || !label) {
    return;
  }

  var config = options || {};
  if (title) {
    title.textContent = config.title || 'Reading timeline';
  }

  container.innerHTML = '';
  label.textContent = dateKey ? dateKey : 'Select a day to see sessions.';
  if (modal) {
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
  }

  if (!dateKey || !sessionsByDate[dateKey] || !sessionsByDate[dateKey].length) {
    container.innerHTML = '<div class="empty">No reading sessions for this day.</div>';
    return;
  }

  var sessions = sessionsByDate[dateKey];
  var books = Array.from(new Set(sessions.map(function (session) { return session.bookTitle; })));
  books.sort();

  var margin = { top: 10, right: 20, bottom: 40, left: config.hideYAxis ? 30 : 160 };
  var width = Math.max(container.clientWidth, 720);
  var rowHeight = 28;
  var height = Math.max(220, margin.top + margin.bottom + books.length * rowHeight);
  var innerWidth = width - margin.left - margin.right;
  var innerHeight = height - margin.top - margin.bottom;

  var svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  var chart = svg.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var xScale = d3.scaleLinear()
    .domain([0, 24])
    .range([0, innerWidth]);

  var yScale = d3.scaleBand()
    .domain(books)
    .range([0, innerHeight])
    .padding(0.2);

  var xAxis = d3.axisBottom(xScale)
    .ticks(8)
    .tickFormat(function (d) { return (d < 10 ? '0' + d : d) + ':00'; });

  var yAxis = d3.axisLeft(yScale);

  chart.append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', 'translate(0,' + innerHeight + ')')
    .call(xAxis);

  if (!config.hideYAxis) {
    chart.append('g')
      .attr('class', 'axis axis-y')
      .call(yAxis);
  }

  var colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(books);

  chart.selectAll('rect.session')
    .data(sessions)
    .enter()
    .append('rect')
    .attr('class', 'session')
    .attr('x', function (d) {
      return xScale(d.start.getHours() + d.start.getMinutes() / 60);
    })
    .attr('y', function (d) {
      return yScale(d.bookTitle) + yScale.bandwidth() * 0.2;
    })
    .attr('width', function (d) {
      var start = d.start.getHours() + d.start.getMinutes() / 60;
      var end = d.end.getHours() + d.end.getMinutes() / 60;
      return Math.max(2, xScale(end) - xScale(start));
    })
    .attr('height', yScale.bandwidth() * 0.6)
    .attr('rx', 4)
    .attr('fill', function (d) { return colorScale(d.bookTitle); })
    .attr('opacity', 0.8);
}

function closeTimelineModal() {
  var modal = document.getElementById('timeline-modal');
  if (!modal) {
    return;
  }
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('is-open');
}

function renderBookList(books, selectedId) {
  var list = document.getElementById('book-list');
  if (!list) {
    return;
  }

  list.innerHTML = '';

  if (!books.length) {
    list.innerHTML = '<div class="empty">No books found.</div>';
    return;
  }

  books.forEach(function (book) {
    var link = document.createElement('a');
    link.className = 'book-item' + (book.id === selectedId ? ' active' : '');
    link.href = '#book=' + encodeURIComponent(book.id);

    var cover = document.createElement('div');
    cover.className = 'book-item-cover';

    if (book.image_id) {
      var img = document.createElement('img');
      img.alt = (book.title || 'Book cover');
      img.src = './covers/' + book.image_id + ' - N3_FULL.jpg';
      img.onerror = function () {
        cover.innerHTML = '<div class="cover-fallback small">No cover</div>';
      };
      cover.appendChild(img);
    } else {
      cover.innerHTML = '<div class="cover-fallback small">No cover</div>';
    }

    var title = document.createElement('div');
    title.className = 'book-title';
    title.textContent = book.title || 'Untitled';

    var meta = document.createElement('div');
    meta.className = 'book-meta';
    var timeLabel = formatHoursAndMinutes(book._reading_time);
    var sessionCount = book._session_count || 0;
    var sessionLabel = sessionCount > 0 ? sessionCount + ' sessions' : '';
    var metaBits = [timeLabel, sessionLabel].filter(Boolean).join(' • ');
    meta.textContent = metaBits
      ? (book.author || 'Unknown author') + ' • ' + metaBits
      : (book.author || 'Unknown author');

    var textBlock = document.createElement('div');
    textBlock.className = 'book-item-text';
    textBlock.appendChild(title);
    textBlock.appendChild(meta);

    link.appendChild(cover);
    link.appendChild(textBlock);
    list.appendChild(link);
  });
}

function filterBooks(books, query) {
  var term = query.toLowerCase().trim();
  if (!term) {
    return books;
  }
  return books.filter(function (book) {
    var title = (book.title || '').toLowerCase();
    var author = (book.author || '').toLowerCase();
    var series = (book.series || '').toLowerCase();
    return title.includes(term) || author.includes(term) || series.includes(term);
  });
}

function sortBooks(books, mode) {
  var sorted = books.slice();
  if (mode === 'title') {
    sorted.sort(function (a, b) {
      return (a.title || '').localeCompare(b.title || '');
    });
    return sorted;
  }
  if (mode === 'author') {
    sorted.sort(function (a, b) {
      return (a.author || '').localeCompare(b.author || '');
    });
    return sorted;
  }
  sorted.sort(function (a, b) {
    return (b._reading_time || 0) - (a._reading_time || 0);
  });
  return sorted;
}

function renderBookDetail(book) {
  var detail = document.getElementById('book-detail');
  if (!detail) {
    return;
  }

  if (!book) {
    detail.innerHTML = '<div class="empty">Select a book to see its stats.</div>';
    renderPunchcard('book-punchcard', []);
    return;
  }

  detail.innerHTML = '';

    var header = document.createElement('div');
    header.className = 'book-header';

  var cover = document.createElement('div');
  cover.className = 'book-cover';

  if (book.image_id) {
    var img = document.createElement('img');
    img.alt = (book.title || 'Book cover');
    img.src = './covers/' + book.image_id + ' - N3_FULL.jpg';
    img.onerror = function () {
      cover.innerHTML = '<div class="cover-fallback">No cover</div>';
    };
    cover.appendChild(img);
  } else {
    cover.innerHTML = '<div class="cover-fallback">No cover</div>';
  }

  var headerText = document.createElement('div');
  headerText.className = 'book-header-text';
  var seriesLine = '';
  if (book.series) {
    var seriesNumber = book.series_number ? (' #' + book.series_number) : '';
    seriesLine = '<div class="book-series">' + book.series + seriesNumber + '</div>';
  }
  headerText.innerHTML = '<h2>' + (book.title || 'Untitled') + '</h2>' +
    '<div class="book-subtitle">' + (book.author || 'Unknown author') + '</div>' +
    seriesLine;

  header.appendChild(cover);
  header.appendChild(headerText);

  var percentValue = book.percent_read != null ? Math.max(0, Math.min(100, Number(book.percent_read))) : null;
  var donut = document.createElement('div');
  donut.className = 'percent-donut';
  donut.innerHTML =
    '<div class="donut" style="--p:' + (percentValue != null ? percentValue : 0) + ';">' +
    '<span>' + (percentValue != null ? percentValue + '%' : 'n/a') + '</span>' +
    '</div>' +
    '<div class="donut-label">Percent read</div>';

  header.appendChild(donut);

  var stats = document.createElement('div');
  stats.className = 'book-stats';

  var metrics = document.createElement('div');
  metrics.className = 'book-metrics';
  var statusText = (book.read_status || 'Unknown');
  var statusClass = 'status-unknown';
  if (statusText === 'Unread') {
    statusClass = 'status-unread';
  } else if (statusText === 'Reading') {
    statusClass = 'status-reading';
  } else if (statusText === 'Finished') {
    statusClass = 'status-finished';
  }
  var totalTimeLabel = formatHoursAndMinutes(book._reading_time);
  var totalTimeRow = totalTimeLabel
    ? '<div><strong>Total read time:</strong> ' + totalTimeLabel + '</div>'
    : '';
  metrics.innerHTML =
    totalTimeRow +
    '<div><strong>Read status:</strong> <span class="status-badge ' + statusClass + '">' + statusText + '</span></div>' +
    '<div><strong>Page turns:</strong> ' + (book.page_turns != null ? book.page_turns : 'n/a') + '</div>';

  stats.appendChild(metrics);

  detail.appendChild(header);
  detail.appendChild(stats);

  // punchcard is rendered by year selection
}

function getSelectedId() {
  var match = window.location.hash.match(/book=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function loadData() {
  return fetch('data.json')
    .then(function (response) {
      if (!response.ok) {
        throw new Error('No JSON file');
      }
      return response.json();
    })
    .catch(function () {
      if (typeof window.library !== 'undefined') {
        return window.library;
      }
      return {};
    });
}

$(function () {
  loadData().then(function (raw) {
    var library = normalizeLibrary(raw);

    library.books = library.books.map(function (book) {
      book._reading_time = calculateReadingTime(book);
      book._session_count = countReadingSessions(book, 10);
      return book;
    });

    library.books.sort(function (a, b) {
      return (b._reading_time || 0) - (a._reading_time || 0);
    });

    var selectedId = getSelectedId() || (library.books[0] && library.books[0].id);
    var selectedBook = library.books.find(function (book) {
      return book.id === selectedId;
    });

    var bookSearchInput = document.getElementById('book-search');
    var bookSortSelect = document.getElementById('book-sort');
    var currentQuery = '';
    var currentSort = 'time';
    var filteredBooks = library.books.slice();

    var updateBookList = function () {
      filteredBooks = filterBooks(library.books, currentQuery);
      filteredBooks = sortBooks(filteredBooks, currentSort);
      var activeId = selectedBook && filteredBooks.some(function (book) { return book.id === selectedBook.id; })
        ? selectedBook.id
        : (filteredBooks[0] && filteredBooks[0].id);

      if (activeId) {
        selectedBook = filteredBooks.find(function (book) { return book.id === activeId; }) || selectedBook;
      }

      renderBookList(filteredBooks, activeId);
      renderBookDetail(selectedBook);
      if (typeof renderBookSection === 'function') {
        renderBookSection();
      }
    };

    if (bookSearchInput) {
      bookSearchInput.addEventListener('input', function (event) {
        currentQuery = event.target.value || '';
        updateBookList();
      });
    }

    if (bookSortSelect) {
      bookSortSelect.addEventListener('change', function (event) {
        currentSort = event.target.value || 'time';
        updateBookList();
      });
    }

    document.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        if (bookSearchInput) {
          bookSearchInput.focus();
          bookSearchInput.select();
        }
      }
      if (event.key === 'Escape') {
        closeTimelineModal();
      }
    });

    updateBookList();

    var allSessions = collectSessions(library.books);
    var sessionsByDate = buildSessionsByDate(allSessions);
    var allYears = getAvailableYears(allSessions);
    var selectedAllYear = getDefaultYear(allYears);
    var selectedBookYear = null;
    var selectedDateKey = null;

    var handleDayClickAll = function (dateKey) {
      selectedDateKey = dateKey;
      renderTimeline('timeline-chart', 'timeline-date', dateKey, sessionsByDate, {
        title: 'Reading timeline',
        hideYAxis: false
      });
      renderYearPunchcard('all-punchcard', allSessions, selectedAllYear, '#cd2327', selectedDateKey, sessionsByDate, handleDayClickAll);
      if (selectedBook) {
        var bookSessions = collectSessions([selectedBook]);
        var bookSessionsByDate = buildSessionsByDate(bookSessions);
        renderYearPunchcard('book-punchcard', bookSessions, selectedBookYear, '#4c7ef3', selectedDateKey, bookSessionsByDate, handleDayClickBook);
      }
    };

    var handleDayClickBook = function (dateKey) {
      selectedDateKey = dateKey;
      if (selectedBook) {
        var bookSessions = collectSessions([selectedBook]);
        var bookSessionsByDate = buildSessionsByDate(bookSessions);
        renderTimeline('timeline-chart', 'timeline-date', dateKey, bookSessionsByDate, {
          title: 'Reading timeline for ' + (selectedBook.title || 'Untitled'),
          hideYAxis: true
        });
        renderYearPunchcard('book-punchcard', bookSessions, selectedBookYear, '#4c7ef3', selectedDateKey, bookSessionsByDate, handleDayClickBook);
      }
      renderYearPunchcard('all-punchcard', allSessions, selectedAllYear, '#cd2327', selectedDateKey, sessionsByDate, handleDayClickAll);
    };

    var renderAllSection = function () {
      renderYearNav('all-year-nav', allYears, selectedAllYear, function (year) {
        selectedAllYear = year;
        renderAllSection();
      });
      renderYearPunchcard('all-punchcard', allSessions, selectedAllYear, '#cd2327', selectedDateKey, sessionsByDate, handleDayClickAll);
    };

    var renderBookSection = function () {
      if (!selectedBook) {
        document.getElementById('book-year-nav').innerHTML = '<div class="empty">No book selected.</div>';
        document.getElementById('book-punchcard').innerHTML = '<div class="empty">No book selected.</div>';
        return;
      }

      var bookSessions = collectSessions([selectedBook]);
      var bookYears = getAvailableYears(bookSessions);
      selectedBookYear = selectedBookYear && bookYears.indexOf(selectedBookYear) !== -1
        ? selectedBookYear
        : getDefaultYear(bookYears);

      renderYearNav('book-year-nav', bookYears, selectedBookYear, function (year) {
        selectedBookYear = year;
        renderBookSection();
      });

      var bookSessionsByDate = buildSessionsByDate(bookSessions);
      renderYearPunchcard('book-punchcard', bookSessions, selectedBookYear, '#4c7ef3', selectedDateKey, bookSessionsByDate, handleDayClickBook);
    };

    renderAllSection();
    renderBookSection();
    closeTimelineModal();

    $(window).on('hashchange', function () {
      var newSelectedId = getSelectedId();
      var newSelectedBook = library.books.find(function (book) {
        return book.id === newSelectedId;
      });

      selectedBook = newSelectedBook;
      selectedBookYear = null;
      updateBookList();
    });

    var timelineModal = document.getElementById('timeline-modal');
    if (timelineModal) {
      var closeButton = timelineModal.querySelector('.timeline-close');
      var backdrop = timelineModal.querySelector('.timeline-backdrop');
      if (closeButton) {
        closeButton.addEventListener('click', closeTimelineModal);
      }
      if (backdrop) {
        backdrop.addEventListener('click', closeTimelineModal);
      }
    }
  });
});