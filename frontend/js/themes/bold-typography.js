/* Bold Typography — full slide overrides.

   Aesthetic: typography IS the design. Near-white near-black background,
   massive serif type (Playfair Display), thin red accent rule, no cards
   anywhere. Numbers dominate. Editorial purity. */

(function () {
  'use strict';
  window.WrappedThemes = window.WrappedThemes || {};

  var BG       = '#fafaf9';
  var INK      = '#0a0a0a';
  var ACCENT   = '#dc2626';
  var INK_DIM  = '#525252';
  var INK_FAINT = '#a3a3a3';

  function fmtMins(m) {
    if (typeof formatDurationLabel === 'function') { return formatDurationLabel(m); }
    var h = Math.floor(m / 60), mm = Math.round(m % 60);
    return h ? (h + 'h ' + mm + 'm') : (mm + 'm');
  }

  function fitTextSize(ctx, text, maxW, startSize, fontFn) {
    var size = startSize;
    while (size > 12) {
      ctx.font = fontFn(size);
      if (ctx.measureText(text).width <= maxW) { return size; }
      size -= 6;
    }
    return size;
  }

  function clearBg(ctx, W, H) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
  }

  function thinRule(ctx, x, y, w, color) {
    ctx.fillStyle = color || ACCENT;
    ctx.fillRect(x, y, w, 4);
  }

  function smallCaps(ctx, label, x, y, FONT, color, align) {
    ctx.save();
    ctx.font      = '24px ' + FONT.body;
    ctx.fillStyle = color || INK_DIM;
    ctx.textAlign = align || 'left';
    var spaced = label.toUpperCase().split('').join(' ');
    ctx.fillText(spaced, x, y);
    ctx.restore();
  }

  // ── Slides ─────────────────────────────────────────────────────────────

  function slideIntro(year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    var W = h.W, H = h.H, FONT = h.FONT;
    clearBg(ctx, W, H);

    smallCaps(ctx, 'YOUR READING WRAPPED', W / 2, 480, FONT, INK_DIM, 'center');
    thinRule(ctx, W / 2 - 80, 510, 160);

    ctx.save();
    ctx.font      = 'bold 480px ' + FONT.display;
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.fillText(String(year), W / 2, 1100);
    ctx.restore();

    thinRule(ctx, W / 2 - 80, 1170, 160);
    smallCaps(ctx, 'A YEAR IN BOOKS', W / 2, 1240, FONT, INK_DIM, 'center');

    return c;
  }

  function slideOverview(stats, year, booksFinished, hlStats, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    var W = h.W, H = h.H, FONT = h.FONT;
    clearBg(ctx, W, H);

    smallCaps(ctx, year + ' AT A GLANCE', 80, 155, FONT);
    thinRule(ctx, 80, 175, 180);

    ctx.save();
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth   = 3;
    ctx.strokeRect(80, 196, W - 160, 262);
    ctx.restore();

    // Hero — total time
    var hero = fmtMins(stats.totalMinutes);
    var fzHero = fitTextSize(ctx, hero, W - 160, 150, function (s) {
      return 'bold ' + s + 'px ' + FONT.display;
    });
    ctx.save();
    ctx.font      = 'bold ' + fzHero + 'px ' + FONT.display;
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(hero, 80, 345);
    ctx.restore();
    smallCaps(ctx, 'READ THIS YEAR', 80, 406, FONT);

    // Stat rows
    var rows = [
      { val: String(stats.sessionCount),                        label: 'SESSIONS' },
      { val: String(booksFinished || 0),                        label: 'BOOKS FINISHED' },
      { val: String(stats.longestStreak || 0) + ' DAYS',        label: 'BEST STREAK' },
      { val: String(hlStats && hlStats.wordCount  != null ? hlStats.wordCount  : 0), label: 'WORDS SAVED' },
      { val: String(hlStats && hlStats.quoteCount != null ? hlStats.quoteCount : 0), label: 'QUOTES SAVED' }
    ];

    var startY = 466;
    var rowH   = 270;

    rows.forEach(function (row, i) {
      var y = startY + i * rowH;
      ctx.fillStyle = '#e5e5e5';
      ctx.fillRect(80, y, W - 160, 1);
      smallCaps(ctx, row.label, 80, y + 46, FONT);
      var fz = fitTextSize(ctx, row.val, W - 160, 160, function (s) {
        return 'bold ' + s + 'px ' + FONT.display;
      });
      ctx.save();
      ctx.font      = 'bold ' + fz + 'px ' + FONT.display;
      ctx.fillStyle = ACCENT;
      ctx.textAlign = 'left';
      ctx.fillText(row.val, 80, y + 232);
      ctx.restore();
    });

    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(80, startY + rows.length * rowH, W - 160, 1);

    return c;
  }

  function slideTopBooks(topBooks, allBooks, coverMap, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    var W = h.W, H = h.H, FONT = h.FONT;
    clearBg(ctx, W, H);

    smallCaps(ctx, year + ' TOP BOOKS', 80, 200, FONT);
    thinRule(ctx, 80, 220, 180);

    if (!topBooks.length) { return c; }

    var startY = 320;
    var rowH = 280;
    for (var i = 0; i < Math.min(5, topBooks.length); i++) {
      var book = topBooks[i];
      var y = startY + i * rowH;

      ctx.save();
      ctx.font      = 'bold 180px ' + FONT.display;
      ctx.fillStyle = i === 0 ? ACCENT : INK;
      ctx.textAlign = 'left';
      ctx.fillText(String(i + 1), 80, y + 150);
      ctx.restore();

      ctx.save();
      ctx.font      = 'bold 56px ' + FONT.display;
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      var titleW = W - 360;
      ctx.fillText(h.fitText(ctx, book.title || 'Unknown', titleW), 320, y + 80);
      ctx.font      = '32px ' + FONT.body;
      ctx.fillStyle = INK_DIM;
      if (book.author) {
        ctx.fillText(h.fitText(ctx, book.author, titleW), 320, y + 130);
      }
      ctx.font      = 'italic 28px ' + FONT.body;
      ctx.fillStyle = ACCENT;
      ctx.fillText(fmtMins(book.minutes), 320, y + 190);
      ctx.restore();

      // Hairline divider
      ctx.fillStyle = '#e5e5e5';
      ctx.fillRect(80, y + rowH - 10, W - 160, 1);
    }

    return c;
  }

  function slideTopAuthors(topAuthors, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    var W = h.W, H = h.H, FONT = h.FONT;
    clearBg(ctx, W, H);

    smallCaps(ctx, year + ' TOP AUTHORS', 80, 200, FONT);
    thinRule(ctx, 80, 220, 180);

    var startY = 360;
    var rowH = 170;
    for (var i = 0; i < Math.min(8, topAuthors.length); i++) {
      var a = topAuthors[i];
      var y = startY + i * rowH;
      ctx.save();
      ctx.font      = 'italic 32px ' + FONT.body;
      ctx.fillStyle = ACCENT;
      ctx.textAlign = 'left';
      ctx.fillText(String(i + 1).padStart(2, '0'), 80, y + 64);
      ctx.font      = 'bold 60px ' + FONT.display;
      ctx.fillStyle = INK;
      ctx.fillText(h.fitText(ctx, a.author || 'Unknown', W - 600), 180, y + 64);
      ctx.font      = '26px ' + FONT.body;
      ctx.fillStyle = INK_DIM;
      ctx.fillText(a.bookCount + (a.bookCount === 1 ? ' book' : ' books'), 180, y + 110);
      ctx.font      = 'italic 32px ' + FONT.body;
      ctx.fillStyle = ACCENT;
      ctx.textAlign = 'right';
      ctx.fillText(fmtMins(a.minutes), W - 80, y + 64);
      ctx.restore();
      ctx.fillStyle = '#e5e5e5';
      ctx.fillRect(80, y + rowH - 12, W - 160, 1);
    }

    return c;
  }

  function slideHabits(stats, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    var W = h.W, H = h.H, FONT = h.FONT;
    clearBg(ctx, W, H);

    smallCaps(ctx, year + ' HABITS', 80, 200, FONT);
    thinRule(ctx, 80, 220, 180);

    var habits = [
      { val: (stats.preferredPeriod || '—').toUpperCase(),          label: 'FAV PERIOD' },
      { val: fmtMins(Math.round(stats.averageMinutes || 0)),         label: 'AVG SESSION' },
      { val: fmtMins(Math.round(stats.longestMinutes || 0)),         label: 'LONGEST' },
      { val: fmtMins(Math.round(stats.averageMinutesPerDay || 0)),   label: 'PER DAY' }
    ];

    var colW = (W - 160) / 2;
    var rowH = 700;
    habits.forEach(function (hab, i) {
      var x = 80 + (i % 2) * colW;
      var y = 360 + Math.floor(i / 2) * rowH;
      ctx.save();
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      var fz = fitTextSize(ctx, hab.val, colW - 80, 180, function (sz) {
        return 'bold ' + sz + 'px ' + FONT.display;
      });
      ctx.font = 'bold ' + fz + 'px ' + FONT.display;
      ctx.fillText(hab.val, x, y + 100);
      ctx.restore();
      thinRule(ctx, x, y + 150, 80, INK);
      smallCaps(ctx, hab.label, x, y + 210, FONT);
    });

    return c;
  }

  function slideStreaks(stats, topStreaks, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    var W = h.W, H = h.H, FONT = h.FONT;
    clearBg(ctx, W, H);

    smallCaps(ctx, year + ' READING STREAKS', W / 2, 200, FONT, INK_DIM, 'center');
    thinRule(ctx, W / 2 - 80, 220, 160);

    // Hero number
    ctx.save();
    ctx.font      = 'bold 560px ' + FONT.display;
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.fillText(String(stats.longestStreak || 0), W / 2, 800);
    ctx.restore();
    smallCaps(ctx, 'CONSECUTIVE DAYS', W / 2, 870, FONT, ACCENT, 'center');
    thinRule(ctx, W / 2 - 100, 900, 200);

    // Supporting list
    var startY = 1050;
    function fmt(d) { try { return d.toLocaleDateString(); } catch (e) { return ''; } }
    for (var i = 0; i < Math.min(4, (topStreaks || []).length); i++) {
      var st = topStreaks[i];
      var y = startY + i * 140;
      ctx.save();
      ctx.font      = 'italic 28px ' + FONT.body;
      ctx.fillStyle = ACCENT;
      ctx.textAlign = 'left';
      ctx.fillText(String(i + 1).padStart(2, '0'), 200, y + 50);
      ctx.font      = 'bold 56px ' + FONT.display;
      ctx.fillStyle = INK;
      ctx.fillText(String(st.days) + ' days', 290, y + 60);
      ctx.font      = '24px ' + FONT.body;
      ctx.fillStyle = INK_DIM;
      ctx.fillText(fmt(st.start) + ' – ' + fmt(st.end), 290, y + 100);
      ctx.restore();
      ctx.fillStyle = '#e5e5e5';
      ctx.fillRect(200, y + 130, W - 400, 1);
    }

    return c;
  }

  function slideVocabulary(hlStats, year, h) {
    // Plan's slideHighlights: typographic hierarchy biggest at top scaling down
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    var W = h.W, H = h.H, FONT = h.FONT;
    clearBg(ctx, W, H);

    smallCaps(ctx, year + ' HIGHLIGHTS', 80, 200, FONT);
    thinRule(ctx, 80, 220, 180);

    var items = [
      { val: String(hlStats.wordCount || 0),                              label: 'NEW WORDS',     size: 280 },
      { val: hlStats.longestWord || '—',                                   label: 'LONGEST WORD',  size: 140 },
      { val: String(hlStats.quoteCount || 0),                              label: 'QUOTES SAVED',  size: 100 },
      { val: hlStats.shortestWord || '—',                                  label: 'SHORTEST WORD', size: 80 }
    ];

    var y = 380;
    items.forEach(function (it) {
      ctx.save();
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      var fz = fitTextSize(ctx, String(it.val), W - 160, it.size, function (sz) {
        return 'bold ' + sz + 'px ' + FONT.display;
      });
      ctx.font = 'bold ' + fz + 'px ' + FONT.display;
      ctx.fillText(String(it.val), 80, y + fz * 0.85);
      ctx.restore();
      smallCaps(ctx, it.label, 80, y + fz * 0.95 + 36, FONT, INK_DIM);
      y += fz * 1.1 + 80;
    });

    return c;
  }

  function slideQuotes(hlStats, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    var W = h.W, H = h.H, FONT = h.FONT;
    clearBg(ctx, W, H);

    var quotes = (hlStats.quotes || []);
    if (!quotes.length) {
      smallCaps(ctx, year + ' QUOTES', W / 2, H / 2 - 30, FONT, INK_DIM, 'center');
      ctx.save();
      ctx.font      = 'italic 36px ' + FONT.body;
      ctx.fillStyle = INK_FAINT;
      ctx.textAlign = 'center';
      ctx.fillText('No quotes saved this year.', W / 2, H / 2 + 60);
      ctx.restore();
      return c;
    }

    // Single most-prominent quote, centered, italic serif
    var pick = (typeof quotes[0] === 'string' ? quotes[0] : (quotes[0] && quotes[0].text) || '').trim();

    smallCaps(ctx, year + ' · QUOTE OF THE YEAR', W / 2, 200, FONT, INK_DIM, 'center');
    thinRule(ctx, W / 2 - 100, 220, 200);

    // Word wrap
    ctx.save();
    ctx.font      = 'italic 56px ' + FONT.display;
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    var maxW = W - 240;
    var words = pick.split(' ');
    var lines = [];
    var cur = '';
    for (var i = 0; i < words.length; i++) {
      var tryLine = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(tryLine).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else { cur = tryLine; }
    }
    if (cur) { lines.push(cur); }
    var lineH = 80;
    var totalH = lines.length * lineH;
    var startY = H / 2 - totalH / 2;
    // Big opening quote mark
    ctx.font = 'bold 240px ' + FONT.display;
    ctx.fillStyle = ACCENT;
    ctx.fillText('“', W / 2, startY - 30);

    ctx.font = 'italic 56px ' + FONT.display;
    ctx.fillStyle = INK;
    lines.forEach(function (line, li) {
      ctx.fillText(line, W / 2, startY + li * lineH);
    });
    ctx.restore();

    thinRule(ctx, W / 2 - 100, H - 240, 200);
    smallCaps(ctx, 'FROM ' + (quotes[0] && quotes[0].book ? String(quotes[0].book).toUpperCase() : 'YOUR LIBRARY'), W / 2, H - 180, FONT, INK_DIM, 'center');

    return c;
  }

  function slideWordsCloud(hlStats, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    var W = h.W, H = h.H, FONT = h.FONT;
    clearBg(ctx, W, H);

    smallCaps(ctx, year + ' NEW WORDS', 80, 200, FONT);
    thinRule(ctx, 80, 220, 180);

    if (hlStats.wordCount != null) {
      ctx.save();
      ctx.font      = '40px ' + FONT.body;
      ctx.fillStyle = INK_DIM;
      ctx.textAlign = 'left';
      ctx.fillText(hlStats.wordCount + ' words saved', 80, 340);
      ctx.restore();
    }

    var allWords = hlStats.words || [];
    if (!allWords.length) {
      ctx.save();
      ctx.font      = 'italic 36px ' + FONT.body;
      ctx.fillStyle = INK_FAINT;
      ctx.textAlign = 'center';
      ctx.fillText('No new words saved.', W / 2, H / 2);
      ctx.restore();
      return c;
    }

    // Frequency
    var freq = {};
    allWords.forEach(function (w) {
      var k = w.toLowerCase();
      freq[k] = { word: w, count: (freq[k] ? freq[k].count : 0) + 1 };
    });
    var words = Object.keys(freq).map(function (k) { return freq[k]; })
      .sort(function (a, b) { return b.count - a.count || a.word.localeCompare(b.word); })
      .slice(0, 60);

    var maxCnt = words[0].count;
    var minCnt = words[words.length - 1].count;
    function sizeOf(c) {
      if (maxCnt === minCnt) { return 60; }
      var t = (c - minCnt) / (maxCnt - minCnt);
      return Math.round(28 + t * 96);
    }

    // Use spiral packing similar to default but no decoration; pure type
    var placed = [];
    function overlaps(x, y, w, ht) {
      for (var k = 0; k < placed.length; k++) {
        var p = placed[k];
        var pad = 12;
        if (x < p.x + p.w + pad && x + w > p.x - pad && y < p.y + p.h + pad && y + ht > p.y - pad) { return true; }
      }
      return false;
    }
    var CX = W / 2, CY = H / 2 + 80;

    words.forEach(function (w, i) {
      var size = sizeOf(w.count);
      ctx.save();
      ctx.font = (i === 0 ? 'bold ' : '') + size + 'px ' + FONT.display;
      var tw = ctx.measureText(w.word).width;
      var th = size * 1.1;
      var col = (i === 0) ? ACCENT : (i < 5 ? INK : INK_DIM);
      var found = null;
      for (var ang = 0; ang < 1200; ang++) {
        var r = 1.5 * ang;
        var theta = ang * 0.35;
        var x = CX + r * Math.cos(theta) - tw / 2;
        var y = CY + r * Math.sin(theta) - th / 2;
        if (x < 80 || x + tw > W - 80 || y < 430 || y + th > H - 80) { continue; }
        if (!overlaps(x, y, tw, th)) { found = { x: x, y: y, w: tw, h: th }; break; }
      }
      if (found) {
        placed.push(found);
        ctx.fillStyle = col;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(w.word, found.x, found.y);
      }
      ctx.restore();
    });

    return c;
  }

  function slideGenres(genreStats, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    var W = h.W, H = h.H, FONT = h.FONT;
    clearBg(ctx, W, H);

    smallCaps(ctx, year + ' GENRES', 80, 200, FONT);
    thinRule(ctx, 80, 220, 180);

    if (!genreStats.length) { return c; }

    var top = genreStats.slice(0, 7);
    var startY = 320;
    var rowH = 220;
    top.forEach(function (g, i) {
      var y = startY + i * rowH;
      ctx.save();
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.font = 'italic 28px ' + FONT.body;
      ctx.fillStyle = ACCENT;
      ctx.fillText(String(i + 1).padStart(2, '0'), 80, y + 56);
      ctx.font      = 'bold 64px ' + FONT.display;
      ctx.fillStyle = INK;
      ctx.fillText(h.fitText(ctx, g.subject || 'Unknown', W - 480), 180, y + 60);
      ctx.font      = '26px ' + FONT.body;
      ctx.fillStyle = INK_DIM;
      ctx.fillText(g.count + (g.count === 1 ? ' book' : ' books'), 180, y + 110);
      ctx.font      = 'bold 80px ' + FONT.display;
      ctx.fillStyle = INK;
      ctx.textAlign = 'right';
      var t = fmtMins(g.minutes || 0);
      ctx.fillText(t, W - 80, y + 80);
      ctx.restore();
      ctx.fillStyle = '#e5e5e5';
      ctx.fillRect(80, y + rowH - 12, W - 160, 1);
    });

    return c;
  }

  // ── Theme registration ─────────────────────────────────────────────────

  window.WrappedThemes['bold-typography'] = {
    id: 'bold-typography',
    name: 'Bold Typography',
    colors: {
      bg1:     BG,
      bg2:     '#f5f5f4',
      accent1: ACCENT,
      accent2: INK,
      white:   INK,
      muted:   INK_DIM,
      dim:     INK_FAINT,
      surface: '#ffffff',
      divider: '#e5e5e5',
      gold:    ACCENT,
      silver:  '#737373',
      bronze:  '#1f2937'
    },
    rankColors: [ACCENT, INK, INK_DIM, INK_FAINT, ACCENT],
    fonts: {
      heading: '"Playfair Display", "Georgia", serif',
      body:    '"Inter", -apple-system, Arial, sans-serif',
      display: '"Playfair Display", "Georgia", serif'
    },

    drawBackground: function (ctx, W, H, _seed) {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);
    },

    // No drawCard override — bold-typography uses no cards at all.

    slides: {
      slideIntro:       slideIntro,
      slideOverview:    slideOverview,
      slideTopBooks:    slideTopBooks,
      slideTopAuthors:  slideTopAuthors,
      slideHabits:      slideHabits,
      slideStreaks:     slideStreaks,
      slideQuotes:      slideQuotes,
      slideWordsCloud:  slideWordsCloud,
      slideGenres:      slideGenres
    }
  };
}());
