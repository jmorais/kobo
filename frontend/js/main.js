function normalizeLibrary(raw) {
  if (!raw) {
    return { books: [], last_updated_at: null };
  }

  if (Array.isArray(raw.books)) {
    return { books: raw.books, last_updated_at: raw.last_updated_at || null };
  }

  if (raw.books && typeof raw.books === 'object') {
    var mapped = Object.keys(raw.books).map(function (id) {
      var book = raw.books[id] || {};
      book.id = book.id || id;
      return book;
    });
    return { books: mapped, last_updated_at: raw.last_updated_at || null };
  }

  if (Array.isArray(raw)) {
    return { books: raw, last_updated_at: null };
  }

  var books = Object.keys(raw).map(function (id) {
    var book = raw[id] || {};
    book.id = id;
    return book;
  });

  return { books: books, last_updated_at: null };
}

// Application settings (persisted in localStorage)
var appSettings = (function () {
  var defaults = { minSessionMinutes: 5, hideEmptyBooks: false, newWordsPerPage: 15, maxSessionMinutes: 300 };
  try {
    var raw = localStorage.getItem('kobo_settings');
    if (raw) {
      var parsed = JSON.parse(raw);
      return Object.assign({}, defaults, parsed);
    }
  } catch (e) {
    // ignore
  }
  return defaults;
})();

function saveAppSettings() {
  try {
    localStorage.setItem('kobo_settings', JSON.stringify(appSettings));
  } catch (e) {
    // ignore
  }
}

function renderLastUpdated(containerId, timestamp) {
  var container = document.getElementById(containerId);
  if (!container) {
    return;
  }
  if (!timestamp) {
    container.textContent = '';
    return;
  }
  var updatedAt = new Date(timestamp);
  if (isNaN(updatedAt)) {
    container.textContent = '';
    return;
  }
  var now = new Date();
  var diffDays = Math.max(0, Math.floor((now - updatedAt) / 86400000));

  if (diffDays === 0) {
    var diffMinutes = Math.max(0, Math.floor((now - updatedAt) / 60000));
    var hours = Math.floor(diffMinutes / 60);
    var minutes = diffMinutes % 60;
    var hourLabel = hours === 1 ? '1 hour' : hours + ' hours';
    var minuteLabel = minutes === 1 ? '1 minute' : minutes + ' minutes';
    var parts = [];
    if (hours > 0) {
      parts.push(hourLabel);
    }
    parts.push(minuteLabel);
    container.textContent = 'last updated ' + parts.join(' ') + ' ago';
  } else if (diffDays === 1) {
    container.textContent = 'last updated 1 day ago';
  } else {
    container.textContent = 'last updated ' + diffDays + ' days ago';
  }
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
  var min = (appSettings && typeof appSettings.minSessionMinutes !== 'undefined') ? appSettings.minSessionMinutes : 5;
  var max = (appSettings && typeof appSettings.maxSessionMinutes !== 'undefined') ? appSettings.maxSessionMinutes : 300;
  var minSeconds = (min) * 60;
  var maxSeconds = (max && max > 0) ? (max * 60) : Infinity;

  var seconds = sessions.reduce(function (total, session) {
    var start = Date.parse(session[0]);
    var end = Date.parse(session[1]);
    if (!isNaN(start) && !isNaN(end)) {
      var duration = Math.max(0, (end - start) / 1000);
      if (duration >= minSeconds && duration <= maxSeconds) {
        total += duration;
      }
    }
    return total;
  }, 0);

  return Math.round((seconds / 3600) * 10) / 10;
}

function getLastReadTimestamp(book) {
  var sessions = safeSessions(book);
  var latest = null;
  sessions.forEach(function (session) {
    var end = Date.parse(session[1]);
    if (!isNaN(end)) {
      if (latest === null || end > latest) {
        latest = end;
      }
    }
  });
  return latest;
}

function countReadingSessions(book, minMinutes) {
  var sessions = safeSessions(book);
  var min = (typeof minMinutes !== 'undefined') ? minMinutes : (appSettings && typeof appSettings.minSessionMinutes !== 'undefined' ? appSettings.minSessionMinutes : 5);
  var max = (appSettings && typeof appSettings.maxSessionMinutes !== 'undefined') ? appSettings.maxSessionMinutes : 300;
  var minSeconds = (min) * 60;
  var maxSeconds = (max && max > 0) ? (max * 60) : Infinity;
  return sessions.reduce(function (total, session) {
    var start = Date.parse(session[0]);
    var end = Date.parse(session[1]);
    if (!isNaN(start) && !isNaN(end)) {
      var duration = (end - start) / 1000;
      if (duration >= minSeconds && duration <= maxSeconds) {
        total += 1;
      }
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

function formatDateKey(value) {
  if (!value) {
    return '';
  }
  var parts = value.split('-');
  if (parts.length !== 3) {
    return value;
  }
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function formatHighlightDate(value) {
  if (!value) {
    return 'Unknown date';
  }
  var normalizedValue = value;
  if (typeof value === 'string' && !/(Z|[+-]\d{2}:?\d{2}|GMT|UTC)/i.test(value)) {
    normalizedValue = value + 'Z';
  }
  if (typeof moment === 'function') {
    var formatted = moment.utc(normalizedValue).local().format('DD/MM/YYYY [às] HH:mm');
    return formatted === 'Invalid date' ? 'Unknown date' : formatted;
  }
  var date = new Date(normalizedValue);
  if (isNaN(date)) {
    return 'Unknown date';
  }
  var day = date.getDate().toString().padStart(2, '0');
  var month = (date.getMonth() + 1).toString().padStart(2, '0');
  var year = date.getFullYear();
  var hours = date.getHours().toString().padStart(2, '0');
  var minutes = date.getMinutes().toString().padStart(2, '0');
  return day + '/' + month + '/' + year + ' às ' + hours + ':' + minutes;
}

function parseHighlightDate(value) {
  if (!value) {
    return null;
  }
  var normalizedValue = value;
  if (typeof value === 'string' && !/(Z|[+-]\d{2}:?\d{2}|GMT|UTC)/i.test(value)) {
    normalizedValue = value + 'Z';
  }
  var date = new Date(normalizedValue);
  return isNaN(date) ? null : date;
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

function wrapSvgText(selection, width) {
  selection.each(function () {
    var text = d3.select(this);
    var words = text.text().split(/\s+/).filter(Boolean).reverse();
    var line = [];
    var lineNumber = 0;
    var lineHeight = 1.1;
    var x = text.attr('x');
    var y = text.attr('y');
    var dy = parseFloat(text.attr('dy')) || 0;

    text.text(null);
    var tspan = text.append('tspan')
      .attr('x', x)
      .attr('y', y)
      .attr('dy', dy + 'em');

    var word;
    while (words.length) {
      word = words.pop();
      line.push(word);
      tspan.text(line.join(' '));
      if (tspan.node().getComputedTextLength() > width && line.length > 1) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text.append('tspan')
          .attr('x', x)
          .attr('y', y)
          .attr('dy', (++lineNumber * lineHeight + dy) + 'em')
          .text(word);
      }
    }
  });
}

function periodForHour(hour) {
  if (hour >= 5 && hour < 12) {
    return 'Morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Afternoon';
  }
  if (hour >= 17 && hour < 21) {
    return 'Evening';
  }
  return 'Night';
}

function collectReadingDays(sessions) {
  var days = {};
  sessions.forEach(function (session) {
    var start = new Date(session.start.getFullYear(), session.start.getMonth(), session.start.getDate());
    var end = new Date(session.end.getFullYear(), session.end.getMonth(), session.end.getDate());
    if (end < start) {
      return;
    }
    var current = new Date(start);
    while (current <= end) {
      days[formatLocalDate(current)] = true;
      current.setDate(current.getDate() + 1);
    }
  });
  return Object.keys(days).sort();
}

function formatDayCount(value) {
  if (value === null || value === undefined) {
    return 'n/a';
  }
  var rounded = Math.round(value * 10) / 10;
  var label = (rounded % 1 === 0) ? rounded.toFixed(0) : rounded.toFixed(1);
  return label + ' days';
}

function computeGeneralStats(books, sessions, minMinutes) {
  var threshold = (minMinutes || 10) * 60;
  var totalMinutes = 0;
  var sessionCount = 0;
  var longestMinutes = 0;
  var longestBookTitle = null;
  var periodTotals = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };

  sessions.forEach(function (session) {
    var durationSeconds = (session.end - session.start) / 1000;
    if (durationSeconds < threshold) {
      return;
    }
    var minutes = durationSeconds / 60;
    totalMinutes += minutes;
    sessionCount += 1;
    if (minutes > longestMinutes) {
      longestMinutes = minutes;
      longestBookTitle = session.bookTitle || 'Untitled';
    }

    var period = periodForHour(session.start.getHours());
    periodTotals[period] += minutes;
  });

  var averageMinutes = sessionCount > 0 ? (totalMinutes / sessionCount) : 0;
  var preferredPeriod = Object.keys(periodTotals).reduce(function (best, period) {
    if (!best || periodTotals[period] > periodTotals[best]) {
      return period;
    }
    return best;
  }, null) || 'n/a';

  var totalPageTurns = books.reduce(function (sum, book) {
    return sum + (book.page_turns || 0);
  }, 0);

  var totalBooks = books.length;
  var finishedBooks = books.filter(function (book) {
    return book.read_status === 'Finished';
  }).length;
  var libraryCompletion = totalBooks > 0 ? Math.round((finishedBooks / totalBooks) * 100) : 0;
  var libraryCompletionText = finishedBooks + ' books of ' + totalBooks + ' in the library';

  var readingDays = collectReadingDays(sessions);
  var longestStreak = 0;
  var currentStreak = 0;
  var totalGapDays = 0;
  var gapCount = 0;
  if (readingDays.length > 0) {
    var streak = 1;
    for (var i = 1; i < readingDays.length; i += 1) {
      var prev = new Date(readingDays[i - 1]);
      var curr = new Date(readingDays[i]);
      var diff = Math.round((curr - prev) / 86400000);
      if (diff === 1) {
        streak += 1;
      } else {
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
      }
      totalGapDays += Math.max(0, diff - 1);
      gapCount += 1;
    }
    longestStreak = Math.max(longestStreak, streak);

    var today = new Date();
    var todayKey = formatLocalDate(today);
    if (readingDays.indexOf(todayKey) !== -1) {
      var streakDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      while (true) {
        var key = formatLocalDate(streakDate);
        if (readingDays.indexOf(key) === -1) {
          break;
        }
        currentStreak += 1;
        streakDate.setDate(streakDate.getDate() - 1);
      }
    }
  }

  var averageGapDays = gapCount > 0 ? (totalGapDays / gapCount) : null;
  var averageMinutesPerDay = readingDays.length > 0 ? (totalMinutes / readingDays.length) : 0;
  var averageSessionsPerDay = readingDays.length > 0 ? (sessionCount / readingDays.length) : 0;

  return {
    totalMinutes: totalMinutes,
    sessionCount: sessionCount,
    averageMinutes: averageMinutes,
    longestMinutes: longestMinutes,
    longestBookTitle: longestBookTitle || 'n/a',
    totalPageTurns: totalPageTurns,
    preferredPeriod: preferredPeriod,
    libraryCompletion: libraryCompletion,
    libraryCompletionText: libraryCompletionText,
    longestStreak: longestStreak,
    currentStreak: currentStreak,
    averageGapDays: averageGapDays,
    averageMinutesPerDay: averageMinutesPerDay,
    averageSessionsPerDay: averageSessionsPerDay
  };
}

function renderGeneralStats(containerId, stats) {
  var container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  container.innerHTML =
    '<div class="general-stat"><span>Total reading time</span><strong>' + formatDurationLabel(stats.totalMinutes) + '</strong></div>' +
    '<div class="general-stat"><span>Total sessions</span><strong>' + stats.sessionCount + '</strong></div>' +
    '<div class="general-stat"><span>Average session time</span><strong>' + formatDurationLabel(stats.averageMinutes) + '</strong></div>' +
    '<div class="general-stat"><span>Longest session</span><strong>' + formatDurationLabel(stats.longestMinutes) + '</strong><em class="general-stat-sub">' + stats.longestBookTitle + '</em></div>' +
    '<div class="general-stat"><span>Library completed</span><strong>' + stats.libraryCompletion + '%</strong><em class="general-stat-sub">' + stats.libraryCompletionText + '</em></div>' +
    '<div class="general-stat"><span>Total page turns</span><strong>' + stats.totalPageTurns + '</strong></div>' +
    '<div class="general-stat"><span>Longest streak</span><strong>' + stats.longestStreak + ' days</strong></div>' +
    '<div class="general-stat"><span>Current streak</span><strong>' + stats.currentStreak + ' days</strong></div>' +
    '<div class="general-stat"><span>Average gap</span><strong>' + formatDayCount(stats.averageGapDays) + '</strong></div>' +
    '<div class="general-stat"><span>Average time per day</span><strong>' + formatDurationLabel(stats.averageMinutesPerDay) + '</strong></div>' +
    '<div class="general-stat"><span>Average sessions per day</span><strong>' + (Math.round(stats.averageSessionsPerDay * 10) / 10) + '</strong></div>' +
    '<div class="general-stat"><span>Preferred period</span><strong>' + stats.preferredPeriod + '</strong></div>';
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

function renderHighlights(wordsId, quotesId, books, wordQuery, quoteQuery, wordSort, quoteSort) {
  var wordsContainer = document.getElementById(wordsId);
  var quotesContainer = document.getElementById(quotesId);
  if (!wordsContainer || !quotesContainer) {
    return;
  }

  var allHighlights = [];
  books.forEach(function (book) {
    (book.highlights || []).forEach(function (highlight) {
      allHighlights.push({
        text: highlight.text,
        date: highlight.date_created,
        type: highlight.type,
        bookTitle: book.title || 'Untitled'
      });
    });
  });

  var normalizeQuery = function (value) {
    return (value || '').toLowerCase().trim();
  };
  var wordTerm = normalizeQuery(wordQuery);
  var quoteTerm = normalizeQuery(quoteQuery);

  var matchesTerm = function (item, term) {
    if (!term) {
      return true;
    }
    var haystack = (item.text || '').toLowerCase() + ' ' + (item.bookTitle || '').toLowerCase();
    return haystack.indexOf(term) !== -1;
  };

  var words = allHighlights.filter(function (item) {
    return item.type === 'word' && matchesTerm(item, wordTerm);
  });
  var quotes = allHighlights.filter(function (item) {
    return item.type === 'quote' && matchesTerm(item, quoteTerm);
  });

  var toTimestamp = function (value) {
    var date = parseHighlightDate(value);
    return date ? date.getTime() : 0;
  };

  var sortBy = function (items, mode) {
    var sorted = items.slice();
    if (mode === 'alpha') {
      sorted.sort(function (a, b) {
        return (a.text || '').localeCompare(b.text || '');
      });
      return sorted;
    }
    if (mode === 'book') {
      sorted.sort(function (a, b) {
        return (a.bookTitle || '').localeCompare(b.bookTitle || '');
      });
      return sorted;
    }
    if (mode === 'date') {
      sorted.sort(function (a, b) {
        return toTimestamp(b.date) - toTimestamp(a.date);
      });
      return sorted;
    }
    return sorted;
  };

  words = sortBy(words, wordSort || 'date');
  quotes = sortBy(quotes, quoteSort || 'date');

  // Pagination for words list
  var perPage = (appSettings && typeof appSettings.newWordsPerPage !== 'undefined') ? parseInt(appSettings.newWordsPerPage, 10) : 15;
  if (!perPage || perPage < 1) perPage = 15;
  var totalWordPages = Math.max(1, Math.ceil(words.length / perPage));
  var currentWordPage = (typeof window.highlightWordsPage !== 'undefined') ? window.highlightWordsPage : 1;
  if (currentWordPage < 1) currentWordPage = 1;
  if (currentWordPage > totalWordPages) currentWordPage = totalWordPages;
  var pagedWords = words.slice((currentWordPage - 1) * perPage, currentWordPage * perPage);

  // Pagination for quotes list (same per-page setting)
  var totalQuotePages = Math.max(1, Math.ceil(quotes.length / perPage));
  var currentQuotePage = (typeof window.highlightQuotesPage !== 'undefined') ? window.highlightQuotesPage : 1;
  if (currentQuotePage < 1) currentQuotePage = 1;
  if (currentQuotePage > totalQuotePages) currentQuotePage = totalQuotePages;
  var pagedQuotes = quotes.slice((currentQuotePage - 1) * perPage, currentQuotePage * perPage);

  var renderList = function (container, items, isWord) {
    if (!items.length) {
      container.innerHTML = '<div class="highlight-empty">No highlights yet.</div>';
      return;
    }
    container.innerHTML = items.map(function (item) {
      var textClass = isWord ? 'highlight-word' : 'highlight-text';
      var dateLabel = formatHighlightDate(item.date);
      var wordLink = item.text;
      if (isWord) {
        var lookup = encodeURIComponent(item.text.toLowerCase());
        wordLink = '<a class="highlight-link" href="https://dictionary.cambridge.org/dictionary/english/' + lookup + '" target="_blank" rel="noopener">' + item.text + '</a>';
      }
        if (isWord) {
          var lookup = encodeURIComponent(item.text.toLowerCase());
          return (
            '<a class="highlight-item" href="https://dictionary.cambridge.org/dictionary/english/' + lookup + '" target="_blank" rel="noopener">' +
              '<div class="' + textClass + '">' + item.text + '</div>' +
              '<div class="highlight-meta">' + item.bookTitle + ' • ' + dateLabel + '</div>' +
            '</a>'
          );
        }

        return (
          '<div class="highlight-item">' +
            '<div class="' + textClass + '">' + wordLink + '</div>' +
            '<div class="highlight-meta">' + item.bookTitle + ' • ' + dateLabel + '</div>' +
          '</div>'
        );
    }).join('');
  };
  renderList(wordsContainer, pagedWords, true);
  renderList(quotesContainer, pagedQuotes, false);

  // render pager for words
  try {
    var pager = document.getElementById(wordsId + '-pager');
    if (pager) {
      if (totalWordPages <= 1) {
        pager.innerHTML = '';
      } else {
        var prevDisabled = currentWordPage <= 1 ? ' disabled' : '';
        var nextDisabled = currentWordPage >= totalWordPages ? ' disabled' : '';
        pager.innerHTML = '<div class="pager-controls">' +
          '<button class="btn btn-default btn-sm pager-prev' + prevDisabled + '" data-page="' + (currentWordPage - 1) + '">Prev</button>' +
          '<span class="pager-info"> Page ' + currentWordPage + ' of ' + totalWordPages + ' </span>' +
          '<button class="btn btn-default btn-sm pager-next' + nextDisabled + '" data-page="' + (currentWordPage + 1) + '">Next</button>' +
          '</div>';

        var prevBtn = pager.querySelector('.pager-prev');
        var nextBtn = pager.querySelector('.pager-next');
        if (prevBtn) {
          prevBtn.addEventListener('click', function (ev) {
            var page = parseInt(ev.currentTarget.getAttribute('data-page'), 10) || 1;
            if (typeof window.setHighlightWordsPage === 'function') window.setHighlightWordsPage(page);
          });
        }
        if (nextBtn) {
          nextBtn.addEventListener('click', function (ev) {
            var page = parseInt(ev.currentTarget.getAttribute('data-page'), 10) || 1;
            if (typeof window.setHighlightWordsPage === 'function') window.setHighlightWordsPage(page);
          });
        }
      }
    }
  } catch (e) {
    // ignore pager errors
  }

  // render pager for quotes
  try {
    var qpager = document.getElementById(quotesId + '-pager');
    if (qpager) {
      if (totalQuotePages <= 1) {
        qpager.innerHTML = '';
      } else {
        var qprevDisabled = currentQuotePage <= 1 ? ' disabled' : '';
        var qnextDisabled = currentQuotePage >= totalQuotePages ? ' disabled' : '';
        qpager.innerHTML = '<div class="pager-controls">' +
          '<button class="btn btn-default btn-sm pager-prev' + qprevDisabled + '" data-page="' + (currentQuotePage - 1) + '">Prev</button>' +
          '<span class="pager-info"> Page ' + currentQuotePage + ' of ' + totalQuotePages + ' </span>' +
          '<button class="btn btn-default btn-sm pager-next' + qnextDisabled + '" data-page="' + (currentQuotePage + 1) + '">Next</button>' +
          '</div>';

        var qprevBtn = qpager.querySelector('.pager-prev');
        var qnextBtn = qpager.querySelector('.pager-next');
        if (qprevBtn) {
          qprevBtn.addEventListener('click', function (ev) {
            var page = parseInt(ev.currentTarget.getAttribute('data-page'), 10) || 1;
            if (typeof window.setHighlightQuotesPage === 'function') window.setHighlightQuotesPage(page);
          });
        }
        if (qnextBtn) {
          qnextBtn.addEventListener('click', function (ev) {
            var page = parseInt(ev.currentTarget.getAttribute('data-page'), 10) || 1;
            if (typeof window.setHighlightQuotesPage === 'function') window.setHighlightQuotesPage(page);
          });
        }
      }
    }
  } catch (e) {
    // ignore pager errors
  }
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
      var min = (appSettings && typeof appSettings.minSessionMinutes !== 'undefined') ? appSettings.minSessionMinutes : 5;
      var max = (appSettings && typeof appSettings.maxSessionMinutes !== 'undefined') ? appSettings.maxSessionMinutes : 300;
      var durationMinutes = (end - start) / 60000;
      if (durationMinutes < min) {
        return;
      }
      if (max && max > 0 && durationMinutes > max) {
        return;
      }
      sessions.push({
        start: start,
        end: end,
        bookId: book.id,
        bookTitle: book.title || 'Untitled',
        bookImageId: book.image_id || null
      });
    });
  });
  return sessions;
}

function computeBookMinutesByYear(sessions, year) {
  var yearStart = new Date(year, 0, 1);
  var yearEnd = new Date(year + 1, 0, 1);
  var totals = {};

  sessions.forEach(function (session) {
    var segmentStart = session.start > yearStart ? session.start : yearStart;
    var segmentEnd = session.end < yearEnd ? session.end : yearEnd;
    if (segmentEnd <= segmentStart) {
      return;
    }
    var minutes = (segmentEnd - segmentStart) / 60000;
    if (!totals[session.bookId]) {
      totals[session.bookId] = {
        bookId: session.bookId,
        title: session.bookTitle,
        imageId: session.bookImageId,
        minutes: 0
      };
    }
    totals[session.bookId].minutes += minutes;
  });

  return Object.keys(totals).map(function (key) {
    return totals[key];
  });
}

function renderYearBookList(containerId, sessions, year) {
  var container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  var totals = computeBookMinutesByYear(sessions, year)
    .filter(function (entry) {
      return entry.minutes > 0;
    })
    .sort(function (a, b) {
      return b.minutes - a.minutes;
    });

  if (!totals.length) {
    container.innerHTML = '<div class="empty">No reading sessions for this year.</div>';
    return;
  }

  container.innerHTML = totals.map(function (entry) {
    var titleText = entry.title || 'Untitled';
    var timeLabel = formatDurationLabel(entry.minutes || 0);
    var coverHtml = entry.imageId
      ? '<img src="./covers/' + entry.imageId + ' - N3_LIBRARY_GRID.jpg" alt="' + titleText + '">' 
      : '<div class="cover-fallback small">No cover</div>';
    var infoHtml =
      '<div class="year-book-cover">' + coverHtml + '</div>' +
      '<div class="year-book-info">' +
        '<div class="year-book-title">' + titleText + '</div>' +
        '<div class="year-book-meta">' + timeLabel + '</div>' +
      '</div>';
    if (entry.bookId) {
      return '<a class="year-book-item" href="#book=' + encodeURIComponent(entry.bookId) + '">' + infoHtml + '</a>';
    }
    return '<div class="year-book-item">' + infoHtml + '</div>';
  }).join('');
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
  var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  var isBookView = targetId === 'book-punchcard';
  var resolveBookRow = function (date) {
    if (!isBookView) {
      return 0;
    }
    var dateYear = date.getFullYear();
    if (dateYear < year) {
      return 0;
    }
    if (dateYear > year) {
      return 1;
    }
    return date.getMonth() < 6 ? 0 : 1;
  };
  var margin = isBookView
    ? { top: 28, right: 6, bottom: 16, left: 6 }
    : { top: 30, right: 8, bottom: 20, left: 6 };
    var containerWidth = Math.max(1, Math.floor(container.getBoundingClientRect().width || container.clientWidth || 720));
    var innerWidth = containerWidth - margin.left - margin.right;

  var totalsByDate = dayTotals.reduce(function (map, entry) {
    map[entry.dateKey] = entry;
    return map;
  }, {});

  var yearStart = new Date(year, 0, 1);
  var yearEnd = new Date(year, 11, 31);
  var calendarStart = new Date(yearStart);
  var calendarEnd = new Date(yearEnd);
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
  calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));

  var allDays = [];
  var current = new Date(calendarStart);
  while (current <= calendarEnd) {
    allDays.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  var weeksCount = Math.ceil(allDays.length / 7);
  var cellGap = 2;
  var monthGapMultiplier = 1;
  var rowCount = isBookView ? 2 : 1;
  var rowStartMonths = isBookView ? [0, 6] : [0];
  var rowGap = 28;

  var rowBaseWeek = new Array(rowCount).fill(null);
  var rowMonthGapCount = new Array(rowCount).fill(0);
  var rowMaxWeek = new Array(rowCount).fill(0);

  allDays.forEach(function (date, index) {
    if (date.getFullYear() !== year) {
      return;
    }
    var weekIndex = Math.floor(index / 7);
    var row = resolveBookRow(date);
    if (rowBaseWeek[row] === null || weekIndex < rowBaseWeek[row]) {
      rowBaseWeek[row] = weekIndex;
    }
  });

  allDays.forEach(function (date, index) {
    if (date.getFullYear() !== year) {
      return;
    }
    var weekIndex = Math.floor(index / 7);
    var row = resolveBookRow(date);
    var baseWeek = rowBaseWeek[row] || 0;
    var weekIndexRow = weekIndex - baseWeek;
    rowMaxWeek[row] = Math.max(rowMaxWeek[row], weekIndexRow);

    if (date.getDate() === 1 && date.getMonth() > rowStartMonths[row]) {
      rowMonthGapCount[row] += 1;
    }
  });

  var maxWeeks = Math.max.apply(null, rowMaxWeek) + 1;
  var maxMonthGaps = Math.max.apply(null, rowMonthGapCount);
  var denominator = maxWeeks + (maxMonthGaps * monthGapMultiplier);
  var cellSize = Math.max(12, Math.floor((innerWidth - (maxWeeks - 1) * cellGap) / denominator));
  var monthGap = (cellSize + cellGap) * monthGapMultiplier;
  var unit = cellSize + cellGap;
  var height = margin.top + margin.bottom + (unit * 7 - cellGap) * rowCount + (rowCount > 1 ? rowGap : 0);

  var maxMinutes = d3.max(dayTotals, function (d) { return d.totalMinutes; }) || 1;
  var score = function (minutes) {
    return Math.log1p(minutes);
  };
  var maxScore = score(maxMinutes);
  var baseColor = color || '#2563eb';
  var colorScale = d3.scaleQuantize()
    .domain([0, maxScore])
    .range([
      '#ebedf0',
      d3.interpolateRgb('#ebedf0', baseColor)(0.35),
      d3.interpolateRgb('#ebedf0', baseColor)(0.55),
      d3.interpolateRgb('#ebedf0', baseColor)(0.75),
      baseColor
    ]);

  var gapOffsets = new Array(allDays.length).fill(0);
  var accumulatedGap = new Array(rowCount).fill(0);
  allDays.forEach(function (date, index) {
    var row = resolveBookRow(date);
    if (date.getFullYear() === year && date.getDate() === 1 && date.getMonth() > rowStartMonths[row]) {
      accumulatedGap[row] += monthGap;
    }
    gapOffsets[index] = accumulatedGap[row];
  });

  var cellX = function (index) {
    var weekIndex = Math.floor(index / 7);
    var date = allDays[index];
    var row = resolveBookRow(date);
    var baseWeek = rowBaseWeek[row] || 0;
    var weekIndexRow = weekIndex - baseWeek;
    return weekIndexRow * unit + gapOffsets[index];
  };

  var cellY = function (index) {
    if (!isBookView) {
      return allDays[index].getDay() * unit;
    }
    var date = allDays[index];
    var row = resolveBookRow(date);
    var rowOffset = row * ((unit * 7 - cellGap) + rowGap);
    return date.getDay() * unit + rowOffset;
  };

  var gridWidth = 0;
  for (var i = 0; i < allDays.length; i += 1) {
    gridWidth = Math.max(gridWidth, cellX(i) + cellSize);
  }
  var viewWidth = Math.max(1, gridWidth + margin.left + margin.right);

  var svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', '0 0 ' + viewWidth + ' ' + height)
    .attr('preserveAspectRatio', 'xMinYMin meet');

  var chart = svg.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var monthRanges = {};
  allDays.forEach(function (date, index) {
    if (date.getFullYear() !== year) {
      return;
    }
    var month = date.getMonth();
    if (!monthRanges[month]) {
      monthRanges[month] = { startIndex: index, endIndex: index };
    } else {
      monthRanges[month].endIndex = index;
    }
  });

  var centeredMonthLabels = [];
  var lastLabelX = new Array(rowCount).fill(-Infinity);
  var minLabelGap = 24;
  for (var monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    var range = monthRanges[monthIndex];
    if (!range) {
      continue;
    }
    var startX = cellX(range.startIndex);
    var endX = cellX(range.endIndex) + cellSize;
    var labelX = (startX + endX) / 2;
    var labelRow = isBookView && monthIndex >= 6 ? 1 : 0;
    if (monthIndex === 0 || labelX - lastLabelX[labelRow] >= minLabelGap) {
      var rowOffset = labelRow * ((unit * 7 - cellGap) + rowGap);
      centeredMonthLabels.push({ month: monthIndex, x: labelX, y: rowOffset - 6 });
      lastLabelX[labelRow] = labelX;
    }
  }

  chart.selectAll('text.month-label')
    .data(centeredMonthLabels)
    .enter()
    .append('text')
    .attr('class', 'month-label')
    .attr('x', function (d) { return d.x; })
    .attr('y', function (d) { return d.y; })
    .attr('text-anchor', 'middle')
    .text(function (d) { return months[d.month]; });



  chart.selectAll('rect.day-cell')
    .data(allDays)
    .enter()
    .append('rect')
    .attr('class', function (d) {
      var dateKey = formatLocalDate(d);
      var inYear = d.getFullYear() === year;
      var classes = 'day-cell' + (dateKey === selectedDateKey ? ' active' : '');
      if (!inYear) {
        classes += ' outside-year';
      }
      return classes;
    })
    .attr('width', cellSize)
    .attr('height', cellSize)
    .attr('x', function (d, i) {
      return cellX(i);
    })
    .attr('y', function (d, i) {
      return cellY(i);
    })
    .attr('rx', 2)
    .attr('fill', function (d) {
      if (d.getFullYear() !== year) {
        return 'transparent';
      }
      var dateKey = formatLocalDate(d);
      var entry = totalsByDate[dateKey];
      return entry ? colorScale(score(entry.totalMinutes)) : '#ebedf0';
    })
    .on('mouseover', function (d) {
      var dateKey = formatLocalDate(d);
      var entry = totalsByDate[dateKey];
      var durationLabel = formatDurationLabel(entry ? entry.totalMinutes : 0);
      var dateLabel = days[d.getDay()] + ', ' + formatOrdinal(d.getDate()) + ' of ' + monthNames[d.getMonth()];
      var headline = durationLabel + ' of reading on ' + dateLabel;
      var sessionsForDay = (sessionsByDate && sessionsByDate[dateKey]) || [];
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
      tooltip.style('opacity', 0);
      var dateKey = formatLocalDate(d);
      if (onDayClick) {
        onDayClick(dateKey);
      }
    });

}

function renderTimeline(targetId, labelId, dateKey, sessionsByDate, options) {
  var container = document.getElementById(targetId);
  var label = document.getElementById(labelId);
  var modal = document.getElementById('timeline-modal');
  if (modal) {
    // Set max height and make scrollable
    modal.style.maxHeight = '90vh';
    modal.style.overflowY = 'auto';
  }
  var title = document.getElementById('timeline-title');
  var booksList = document.getElementById('timeline-books');
  var booksSection = document.getElementById('timeline-books-section');
  if (!container || !label) {
    return;
  }

  var config = options || {};
  if (title) {
    var baseTitle = config.title || 'Reading timeline';
    var dateLabel = formatDateKey(dateKey);
    title.textContent = dateLabel ? (baseTitle + ' on ' + dateLabel) : baseTitle;
  }

  container.innerHTML = '';
  if (!dateKey) {
    label.textContent = 'Select a day to see sessions.';
  } else {
    label.textContent = '';
  }
  if (booksList) {
    booksList.innerHTML = '';
  }
  if (booksSection) {
    booksSection.style.display = (options && options.hideYAxis) ? 'none' : '';
  }
  if (modal) {
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
  }

  if (!dateKey || !sessionsByDate[dateKey] || !sessionsByDate[dateKey].length) {
    container.innerHTML = '<div class="empty">No reading sessions for this day.</div>';
    return;
  }

  var sessions = sessionsByDate[dateKey];
  if (booksList && !(options && options.hideYAxis)) {
    var booksById = {};
    sessions.forEach(function (session) {
      var bookId = session.bookId || '';
      var bookTitle = session.bookTitle || 'Untitled';
      var key = bookId || bookTitle;
      if (!booksById[key]) {
        var imageId = null;
        if (bookId && config.bookLookup && config.bookLookup[bookId]) {
          imageId = config.bookLookup[bookId].image_id || null;
        } else if (session.bookImageId) {
          imageId = session.bookImageId;
        }
        booksById[key] = {
          bookId: bookId,
          title: bookTitle,
          imageId: imageId,
          minutes: 0
        };
      }
      booksById[key].minutes += Math.max(0, (session.end - session.start) / 60000);
    });
    var dayBooks = Object.keys(booksById)
      .map(function (key) { return booksById[key]; })
      .filter(function (entry) { return entry.minutes > 0; })
      .sort(function (a, b) { return b.minutes - a.minutes; });
    booksList.innerHTML = dayBooks.map(function (entry) {
      var titleText = entry.title || 'Untitled';
      var timeLabel = formatDurationLabel(entry.minutes || 0);
      var coverHtml = entry.imageId
        ? '<img src="./covers/' + entry.imageId + ' - N3_LIBRARY_GRID.jpg" alt="' + titleText + '">' 
        : '<div class="cover-fallback small">No cover</div>';
      var infoHtml =
        '<div class="year-book-cover">' + coverHtml + '</div>' +
        '<div class="year-book-info">' +
          '<div class="year-book-title">' + titleText + '</div>' +
          '<div class="year-book-meta">' + timeLabel + '</div>' +
        '</div>';
      if (entry.bookId) {
        return '<a class="year-book-item timeline-book-link" href="#book=' + encodeURIComponent(entry.bookId) + '">' + infoHtml + '</a>';
      }
      return '<div class="year-book-item">' + infoHtml + '</div>';
    }).join('');
    // Add click handler to dismiss modal
    var links = booksList.querySelectorAll('.timeline-book-link');
    links.forEach(function (link) {
      link.addEventListener('click', function () {
        var modal = document.getElementById('timeline-modal');
        if (modal) {
          modal.setAttribute('aria-hidden', 'true');
          modal.classList.remove('is-open');
        }
      });
    });
  }
  // Build books array with cover info
  var books = [];
  var bookMeta = {};
  sessions.forEach(function (session) {
    var key = session.bookTitle;
    if (!bookMeta[key]) {
      var imageId = null;
      if (session.bookId && config.bookLookup && config.bookLookup[session.bookId]) {
        imageId = config.bookLookup[session.bookId].image_id || null;
      } else if (session.bookImageId) {
        imageId = session.bookImageId;
      }
      bookMeta[key] = { title: key, imageId: imageId };
      books.push(key);
    }
  });
  books.sort();
  if (label) {
    var totalMinutes = sessions.reduce(function (sum, session) {
      return sum + Math.max(0, (session.end - session.start) / 60000);
    }, 0);
    var sessionCount = sessions.length;
    var sessionLabel = sessionCount === 1 ? 'session' : 'sessions';
    var totalTimeLabel = formatDurationLabel(totalMinutes);
    label.innerHTML =
      '<div class="timeline-stats">' +
        '<div class="timeline-stat"><span>Total sessions</span><strong>' + sessionCount + '</strong></div>' +
        '<div class="timeline-stat"><span>Total time read</span><strong>' + totalTimeLabel + '</strong></div>' +
      '</div>';
  }

  // Increase cover size by 25%
  var coverSize = 70;
  var margin = { top: 10, right: 20, bottom: 40, left: config.hideYAxis ? 30 : coverSize + 8 };
  var width = Math.max(container.clientWidth, 720);
  var rowHeight = 90; // Increased to add more vertical spacing between covers
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
    .padding(0.35); // Increase padding for more space between covers

  var xAxis = d3.axisBottom(xScale)
    .ticks(8)
    .tickFormat(function (d) { return (d < 10 ? '0' + d : d) + ':00'; });

  // Custom yAxis with covers
  var yAxis = d3.axisLeft(yScale)
    .tickFormat(function (d) {
      var meta = bookMeta[d];
      if (meta && meta.imageId) {
        return '';
      }
      return '';
    });

  chart.append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', 'translate(0,' + innerHeight + ')')
    .call(xAxis);

  if (!config.hideYAxis) {
    var yAxisGroup = chart.append('g')
      .attr('class', 'axis axis-y')
      .call(yAxis);

    // Remove default text labels
    yAxisGroup.selectAll('text').remove();

    // Add cover images as Y axis labels (40px)
    // Custom tooltip for book covers
    var coverTooltip = d3.select('body').append('div')
      .attr('class', 'cover-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', '#222')
      .style('color', '#fff')
      .style('padding', '6px 12px')
      .style('border-radius', '6px')
      .style('font-size', '14px')
      .style('opacity', 0)
      .style('z-index', 2000);

    yAxisGroup.selectAll('image')
      .data(books)
      .enter()
      .append('image')
      .attr('x', -coverSize)
      .attr('y', function (d) { return yScale(d) + (yScale.bandwidth() - coverSize) / 2; })
      .attr('width', coverSize)
      .attr('height', coverSize)
      .attr('href', function (d) {
        var meta = bookMeta[d];
        return meta && meta.imageId ? './covers/' + meta.imageId + ' - N3_LIBRARY_GRID.jpg' : null;
      })
      .attr('class', 'yaxis-book-cover')
      .on('mouseover', function (d) {
        var meta = bookMeta[d];
        coverTooltip.text(meta && meta.title ? meta.title : d)
          .style('opacity', 1)
          .style('left', (d3.event.pageX + 12) + 'px')
          .style('top', (d3.event.pageY - 18) + 'px');
      })
      .on('mousemove', function () {
        coverTooltip.style('left', (d3.event.pageX + 12) + 'px')
          .style('top', (d3.event.pageY - 18) + 'px');
      })
      .on('mouseout', function () {
        coverTooltip.style('opacity', 0);
      });

    // Add fallback for missing covers (70px)
    yAxisGroup.selectAll('rect.yaxis-cover-fallback')
      .data(books.filter(function (d) { return !(bookMeta[d] && bookMeta[d].imageId); }))
      .enter()
      .append('rect')
      .attr('x', -coverSize)
      .attr('y', function (d) { return yScale(d) + (yScale.bandwidth() - coverSize) / 2; })
      .attr('width', coverSize)
      .attr('height', coverSize)
      .attr('class', 'yaxis-cover-fallback')
      .attr('fill', '#eee');
  }

  var colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(books);
  var tooltip = getDayTooltip();

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
    .attr('opacity', 0.8)
    .on('mouseover', function (d) {
      var minutes = Math.max(0, (d.end - d.start) / 60000);
      var durationLabel = formatDurationLabel(minutes);
      tooltip.html(
        '<div class="tooltip-title">' + d.bookTitle + '</div>' +
        '<div class="tooltip-meta">' + durationLabel + ' session</div>'
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
    });
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
      img.src = './covers/' + book.image_id + ' - N3_LIBRARY_GRID.jpg';
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
  if (mode === 'last') {
    sorted.sort(function (a, b) {
      return (b._last_read || 0) - (a._last_read || 0);
    });
    return sorted;
  }
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
  var statusHeader = document.getElementById('book-status-header');
  if (!detail) {
    return;
  }

  if (!book) {
    detail.innerHTML = '<div class="empty">Select a book to see its stats.</div>';
    if (statusHeader) {
      statusHeader.innerHTML = '';
    }
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
    img.src = './covers/' + book.image_id + ' - N3_LIBRARY_GRID.jpg';
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
  var sessionCount = book._session_count || 0;
  var sessionLabel = sessionCount === 1 ? '1 session' : sessionCount + ' sessions';
  var chaptersCount = book.chapters != null ? book.chapters : null;
  var chaptersLabel = chaptersCount != null
    ? (chaptersCount + ' ' + (chaptersCount === 1 ? 'chapter' : 'chapters'))
    : '';
  var totalTimeLine = totalTimeLabel
    ? '<div class="book-time">' + totalTimeLabel + ' in ' + sessionLabel + '</div>'
    : '';
  var chaptersLine = chaptersLabel
    ? '<div class="book-chapters">' + chaptersLabel + '</div>'
    : '';
  var pageTurnsLabel = (book.page_turns != null)
    ? (book.page_turns + ' page turns')
    : '';
  var pageTurnsLine = pageTurnsLabel
    ? '<div class="book-turns">' + pageTurnsLabel + '</div>'
    : '';
  var highlights = Array.isArray(book.highlights) ? book.highlights : [];
  var newWordsCount = highlights.filter(function (highlight) { return highlight.type === 'word'; }).length;
  var quotesCount = highlights.filter(function (highlight) { return highlight.type === 'quote'; }).length;
  var highlightsLine = '<div class="book-highlights">' + newWordsCount + ' new words • ' + quotesCount + ' quotes</div>';
  var statusBadge = '<span class="status-badge ' + statusClass + '">' + statusText + '</span>';
  var headerMeta = '<div class="book-header-meta">' + chaptersLine + totalTimeLine + highlightsLine + pageTurnsLine + '</div>';
  headerText.innerHTML = '<h2>' + (book.title || 'Untitled') + '</h2>' +
    '<div class="book-subtitle">' + (book.author || 'Unknown author') + '</div>' +
    seriesLine +
    headerMeta;

  if (statusHeader) {
    statusHeader.innerHTML = statusBadge;
  }

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
  metrics.innerHTML = '';

  stats.appendChild(metrics);

  detail.appendChild(header);
  detail.appendChild(stats);

  // punchcard is rendered by year selection
}

function getSelectedId() {
  var match = window.location.hash.match(/book=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isAllHash() {
  return window.location.hash === '#all';
}

function isHighlightsHash() {
  return window.location.hash === '#highlights';
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
      book._session_count = countReadingSessions(book); // uses appSettings.minSessionMinutes by default
      book._last_read = getLastReadTimestamp(book);
      return book;
    });

    library.books.sort(function (a, b) {
      return (b._reading_time || 0) - (a._reading_time || 0);
    });

    var selectedId = getSelectedId();
    var hasExplicitSelection = !!selectedId;
    var selectedBook = selectedId
      ? library.books.find(function (book) { return book.id === selectedId; })
      : (library.books[0] && library.books[0].id ? library.books[0] : null);

    var bookSearchInput = document.getElementById('book-search');
    var bookSortSelect = document.getElementById('book-sort');
    var currentQuery = '';
    var currentSort = 'last';
    var filteredBooks = library.books.slice();

    var updateBookList = function () {
      filteredBooks = filterBooks(library.books, currentQuery);
      filteredBooks = sortBooks(filteredBooks, currentSort);
      if (appSettings && appSettings.hideEmptyBooks) {
        filteredBooks = filteredBooks.filter(function (book) {
          var sessions = book._session_count || 0;
          var time = book._reading_time || 0;
          var unread = (book.read_status === 'Unread' || !book.read_status);
          return !(sessions === 0 && time === 0 && unread);
        });
      }
      var activeId = (!hasExplicitSelection && filteredBooks[0] && filteredBooks[0].id)
        ? filteredBooks[0].id
        : (selectedBook && filteredBooks.some(function (book) { return book.id === selectedBook.id; })
          ? selectedBook.id
          : (filteredBooks[0] && filteredBooks[0].id));

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
        currentSort = event.target.value || 'last';
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

    var bookLookup = library.books.reduce(function (map, book) {
      if (book.id) {
        map[book.id] = book;
      }
      return map;
    }, {});

    var handleDayClickAll = function (dateKey) {
      selectedDateKey = dateKey;
      renderTimeline('timeline-chart', 'timeline-date', dateKey, sessionsByDate, {
        title: 'Reading timeline',
        hideYAxis: false,
        bookLookup: bookLookup
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
          hideYAxis: true,
          bookLookup: bookLookup
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
      renderYearBookList('year-books', allSessions, selectedAllYear);
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
    renderGeneralStats('general-stats', computeGeneralStats(library.books, allSessions, appSettings.minSessionMinutes));
    renderBookSection();
    var highlightWordsSearch = document.getElementById('highlight-words-search');
    var highlightQuotesSearch = document.getElementById('highlight-quotes-search');
    var highlightWordsSort = document.getElementById('highlight-words-sort');
    var highlightQuotesSort = document.getElementById('highlight-quotes-sort');
    var highlightWordQuery = '';
    var highlightQuoteQuery = '';
    var highlightWordSort = (highlightWordsSort && highlightWordsSort.value) || 'alpha';
    var highlightQuoteSort = (highlightQuotesSort && highlightQuotesSort.value) || 'date';
    // pagination state for new words and quotes
    window.highlightWordsPage = 1;
    window.setHighlightWordsPage = function (page) {
      var p = parseInt(page, 10) || 1;
      window.highlightWordsPage = p;
      updateHighlights();
    };
    window.highlightQuotesPage = 1;
    window.setHighlightQuotesPage = function (page) {
      var p = parseInt(page, 10) || 1;
      window.highlightQuotesPage = p;
      updateHighlights();
    };

    var updateHighlights = function () {
      renderHighlights(
        'highlight-words',
        'highlight-quotes',
        library.books,
        highlightWordQuery,
        highlightQuoteQuery,
        highlightWordSort,
        highlightQuoteSort
      );
    };

    if (highlightWordsSearch) {
      highlightWordsSearch.addEventListener('input', function (event) {
        highlightWordQuery = event.target.value || '';
        window.highlightWordsPage = 1;
        updateHighlights();
      });
    }

    if (highlightQuotesSearch) {
      highlightQuotesSearch.addEventListener('input', function (event) {
        highlightQuoteQuery = event.target.value || '';
        window.highlightQuotesPage = 1;
        updateHighlights();
      });
    }

    if (highlightWordsSort) {
      highlightWordsSort.addEventListener('change', function (event) {
        highlightWordSort = event.target.value || 'alpha';
        window.highlightWordsPage = 1;
        updateHighlights();
      });
    }

    if (highlightQuotesSort) {
      highlightQuotesSort.addEventListener('change', function (event) {
        highlightQuoteSort = event.target.value || 'date';
        window.highlightQuotesPage = 1;
        updateHighlights();
      });
    }

    updateHighlights();
    closeTimelineModal();
    renderLastUpdated('last-updated', library.last_updated_at);

    var byBookButton = document.getElementById('view-by-book');
    var allButton = document.getElementById('view-all');
    var highlightsButton = document.getElementById('view-highlights');
    var byBookSection = document.getElementById('by-book-section');
    var allSection = document.getElementById('all-section');
    var highlightsSection = document.getElementById('highlights-section');

    var setView = function (view) {
      var isByBook = view === 'book';
      var isAll = view === 'all';
      var isHighlights = view === 'highlights';
      if (isAll) {
        selectedBook = null;
        updateBookList();
        if (!isAllHash()) {
          window.location.hash = 'all';
        }
      } else if (isHighlights) {
        if (!isHighlightsHash()) {
          window.location.hash = 'highlights';
        }
      } else if (isAllHash() || isHighlightsHash()) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      if (byBookSection) {
        byBookSection.hidden = !isByBook;
      }
      if (allSection) {
        allSection.hidden = !isAll;
      }
      if (highlightsSection) {
        highlightsSection.hidden = !isHighlights;
      }
      if (byBookButton) {
        byBookButton.classList.toggle('active', isByBook);
      }
      if (allButton) {
        allButton.classList.toggle('active', isAll);
      }
      if (highlightsButton) {
        highlightsButton.classList.toggle('active', isHighlights);
      }
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(function () {
          if (isByBook) {
            renderBookSection();
          } else if (isAll) {
            renderAllSection();
          } else if (isHighlights) {
            updateHighlights();
          }
        });
      } else if (isByBook) {
        renderBookSection();
      } else if (isAll) {
        renderAllSection();
      } else if (isHighlights) {
        updateHighlights();
      }
    };

    var handleHashChange = function () {
      if (!window.location.hash) {
        hasExplicitSelection = false;
        setView('book');
        return;
      }
      if (isAllHash()) {
        setView('all');
        return;
      }
      if (isHighlightsHash()) {
        setView('highlights');
        return;
      }
      var hashId = getSelectedId();
      if (hashId) {
        var found = library.books.find(function (book) { return book.id === hashId; });
        if (found) {
          hasExplicitSelection = true;
          selectedBook = found;
          updateBookList();
          setView('book');
        }
      }
    };

    if (byBookButton) {
      byBookButton.addEventListener('click', function () {
        setView('book');
      });
    }

    if (allButton) {
      allButton.addEventListener('click', function () {
        setView('all');
      });
    }

    if (highlightsButton) {
      highlightsButton.addEventListener('click', function () {
        setView('highlights');
      });
    }

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

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

    // Settings UI wiring
    var settingsButton = document.getElementById('settings-link');
    var settingsModal = document.getElementById('settings-modal');
    var settingsSave = document.getElementById('settings-save');
    var settingsCancel = document.getElementById('settings-cancel');
    var settingsCloseButtons = document.querySelectorAll('.settings-close');
    var settingMinInput = document.getElementById('setting-min-session');
    var settingMaxInput = document.getElementById('setting-max-session');
    var settingHideEmpty = document.getElementById('setting-hide-empty');
    var settingNewWordsPerPage = document.getElementById('setting-new-words-per-page');

    function openSettings() {
      if (!settingsModal) return;
      // populate
      if (settingMinInput) settingMinInput.value = (appSettings && typeof appSettings.minSessionMinutes !== 'undefined') ? appSettings.minSessionMinutes : 5;
      if (settingMaxInput) settingMaxInput.value = (appSettings && typeof appSettings.maxSessionMinutes !== 'undefined') ? appSettings.maxSessionMinutes : 300;
      if (settingHideEmpty) settingHideEmpty.checked = !!(appSettings && appSettings.hideEmptyBooks);
      if (settingNewWordsPerPage) settingNewWordsPerPage.value = (appSettings && typeof appSettings.newWordsPerPage !== 'undefined') ? appSettings.newWordsPerPage : 15;
      settingsModal.setAttribute('aria-hidden', 'false');
      settingsModal.classList.add('is-open');
    }

    function closeSettings() {
      if (!settingsModal) return;
      settingsModal.setAttribute('aria-hidden', 'true');
      settingsModal.classList.remove('is-open');
    }

    if (settingsButton) {
      settingsButton.addEventListener('click', function () { openSettings(); });
    }
    if (settingsSave) {
      settingsSave.addEventListener('click', function () {
        var minVal = parseInt(settingMinInput && settingMinInput.value, 10);
        if (isNaN(minVal) || minVal < 0) minVal = 0;
        appSettings.minSessionMinutes = minVal;
        var maxVal = parseInt(settingMaxInput && settingMaxInput.value, 10);
        if (isNaN(maxVal) || maxVal < 0) maxVal = 300;
        appSettings.maxSessionMinutes = maxVal;
        appSettings.hideEmptyBooks = !!(settingHideEmpty && settingHideEmpty.checked);
        var perPageVal = parseInt(settingNewWordsPerPage && settingNewWordsPerPage.value, 10);
        if (isNaN(perPageVal) || perPageVal < 1) perPageVal = 15;
        appSettings.newWordsPerPage = perPageVal;
        saveAppSettings();
        // reload to apply settings across all derived data simply
        window.location.reload();
      });
    }
    if (settingsCancel && settingsCloseButtons) {
      settingsCloseButtons.forEach(function (el) { el.addEventListener('click', closeSettings); });
    }
  });
});