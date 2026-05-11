/* Neobrutalism — full slide layout overrides.

   Aesthetic: zine / protest poster. Solid bright fills, thick black borders,
   hard offset shadows, no gradients, no rounded corners. Uppercase chunky
   type. Looks cut out and pasted. */

(function () {
  'use strict';
  window.WrappedThemes = window.WrappedThemes || {};

  // ── Shared utilities ───────────────────────────────────────────────────

  function makeRng(seed) {
    var s = ((seed | 0) + 1) * 1664525 + 1013904223;
    return function () {
      s = Math.imul(s ^ (s >>> 15), s | 1) >>> 0;
      s = (s ^ (s + Math.imul(s ^ (s >>> 7), s | 61) >>> 0)) >>> 0;
      return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
    };
  }

  var BG_PALETTE     = ['#fef08a', '#fbcfe8', '#a7f3d0', '#bfdbfe', '#fed7aa', '#ddd6fe'];
  var ACCENT_PALETTE = ['#dc2626', '#2563eb', '#16a34a', '#facc15', '#ec4899', '#000000'];

  function hardCard(ctx, x, y, w, h, fill) {
    // Offset black shadow first
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(x + 14, y + 14, w, h);
    // Solid fill
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    // Thick black border
    ctx.lineWidth   = 6;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(x, y, w, h);
  }

  function fitTextSize(ctx, text, maxW, startSize, fontFn) {
    var size = startSize;
    while (size > 12) {
      ctx.font = fontFn(size);
      if (ctx.measureText(text).width <= maxW) { return size; }
      size -= 4;
    }
    return size;
  }

  function fmtMins(m) {
    if (typeof formatDurationLabel === 'function') { return formatDurationLabel(m); }
    var h = Math.floor(m / 60), mm = Math.round(m % 60);
    return h ? (h + 'h ' + mm + 'm') : (mm + 'm');
  }

  // ── Slide implementations ──────────────────────────────────────────────

  function slideIntro(year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 0);
    var W = h.W, H = h.H, FONT = h.FONT;

    // ── Year — huge bold text with hard drop shadow ──
    var yearStr = String(year);
    var YEAR_Y  = 580;
    ctx.save();
    ctx.font         = 'bold 380px ' + FONT.heading;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    // Hard shadow
    ctx.fillStyle = '#000000';
    ctx.fillText(yearStr, W / 2 + 16, YEAR_Y + 16);
    // White fill
    ctx.fillStyle = '#ffffff';
    ctx.fillText(yearStr, W / 2, YEAR_Y);
    ctx.restore();

    // Thick black outline pass
    ctx.save();
    ctx.font        = 'bold 380px ' + FONT.heading;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth   = 10;
    ctx.strokeStyle = '#000000';
    ctx.lineJoin    = 'round';
    ctx.strokeText(yearStr, W / 2, YEAR_Y);
    ctx.restore();

    // YOUR / READING / WRAPPED stacked in bordered boxes
    var labels = ['YOUR', 'READING', 'WRAPPED'];
    var fills  = ['#dc2626', '#000000', '#2563eb'];
    var textCol = ['#ffffff', '#facc15', '#ffffff'];
    var startY = 950;
    var rowH   = 220;
    labels.forEach(function (lbl, i) {
      var y = startY + i * rowH;
      hardCard(ctx, 80, y, W - 160, 180, fills[i]);
      ctx.save();
      ctx.font      = 'bold 140px ' + FONT.heading;
      ctx.fillStyle = textCol[i];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl, W / 2, y + 90);
      ctx.restore();
    });

    return c;
  }

  function slideOverview(stats, year, booksFinished, hlStats, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 1);
    var W = h.W, H = h.H, FONT = h.FONT;
    var M = 80;

    // Header strip
    hardCard(ctx, M, 60, W - M * 2, 140, '#000000');
    ctx.save();
    ctx.font             = 'bold 72px ' + FONT.heading;
    ctx.fillStyle        = '#facc15';
    ctx.textAlign        = 'center';
    ctx.textBaseline     = 'middle';
    ctx.fillText(year + ' IN NUMBERS', W / 2, 130);
    ctx.restore();

    hardCard(ctx, M, 254, W - M * 2, 240, '#ddd6fe');

    // Hero
    var hero = fmtMins(stats.totalMinutes);
    ctx.save();
    ctx.font             = 'bold 28px ' + FONT.heading;
    ctx.fillStyle        = '#000000';
    ctx.textAlign        = 'left';
    ctx.textBaseline     = 'alphabetic';
    ctx.fillText('READ THIS YEAR', M + 24, 254 + 42);
    ctx.restore();
    var fzHero = fitTextSize(ctx, hero, W - M * 2 - 48, 155, function (s) {
      return 'bold ' + s + 'px ' + FONT.display;
    });
    ctx.save();
    ctx.font             = 'bold ' + fzHero + 'px ' + FONT.display;
    ctx.fillStyle        = '#000000';
    ctx.textAlign        = 'left';
    ctx.textBaseline     = 'alphabetic';
    ctx.fillText(hero, M + 24, 254 + 204);
    ctx.restore();

    // Stat rows
    var fills = ['#fef08a', '#a7f3d0', '#fbcfe8', '#bfdbfe', '#fed7aa'];
    var rows = [
      { label: 'SESSIONS',       val: String(stats.sessionCount) },
      { label: 'BOOKS FINISHED', val: String(booksFinished || 0) },
      { label: 'BEST STREAK',    val: String(stats.longestStreak || 0) + ' Days' },
      { label: 'WORDS SAVED',    val: String(hlStats && hlStats.wordCount  != null ? hlStats.wordCount  : 0) },
      { label: 'QUOTES SAVED',   val: String(hlStats && hlStats.quoteCount != null ? hlStats.quoteCount : 0) }
    ];

    var startY = 514;
    var rowH   = 260;

    rows.forEach(function (row, i) {
      var y = startY + i * rowH;
      hardCard(ctx, M, y, W - M * 2, rowH - 20, fills[i]);
      ctx.save();
      ctx.font             = 'bold 28px ' + FONT.heading;
      ctx.fillStyle        = '#000000';
      ctx.textAlign        = 'left';
      ctx.textBaseline     = 'alphabetic';
      ctx.fillText(row.label, M + 24, y + 42);
      ctx.restore();
      var fz = fitTextSize(ctx, row.val, W - M * 2 - 48, 155, function (s) {
        return 'bold ' + s + 'px ' + FONT.display;
      });
      ctx.save();
      ctx.font             = 'bold ' + fz + 'px ' + FONT.display;
      ctx.fillStyle        = '#000000';
      ctx.textAlign        = 'left';
      ctx.textBaseline     = 'alphabetic';
      ctx.fillText(row.val, M + 24, y + 204);
      ctx.restore();
    });

    return c;
  }

  function drawCoverNeo(ctx, img, x, y, w, h) {
    // Offset shadow + border neobrutalism style
    ctx.fillStyle = 'rgba(0,0,0,0.95)';
    ctx.fillRect(x + 8, y + 8, w, h);
    if (img) {
      ctx.drawImage(img, x, y, w, h);
    } else {
      ctx.fillStyle = '#374151';
      ctx.fillRect(x, y, w, h);
      ctx.save();
      ctx.font = Math.floor(Math.min(w, h) * 0.5) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\uD83D\uDCDA', x + w / 2, y + h / 2);
      ctx.restore();
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(x, y, w, h);
  }

  function wrapTextNeo(ctx, text, x, y, maxW, lineH) {
    var words = text.split(' ');
    var lines = [];
    var cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else { cur = test; }
    }
    if (cur) { lines.push(cur); }
    lines.forEach(function (l, li) { ctx.fillText(l, x, y + li * lineH); });
    return lines.length;
  }

  function slideTopBooks(topBooks, allBooks, coverMap, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 2);
    var W = h.W, H = h.H, FONT = h.FONT;

    // Title strip
    hardCard(ctx, 80, 60, W - 160, 140, '#000000');
    ctx.save();
    ctx.font      = 'bold 72px ' + FONT.heading;
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TOP BOOKS ' + year, W / 2, 130);
    ctx.restore();

    if (!topBooks.length) { return c; }

    // All 5 books — uniform cards
    var allFills = ['#fef08a', '#fbcfe8', '#a7f3d0', '#bfdbfe', '#fed7aa'];
    var startY = 260;
    var rowH   = 220;
    var rowGap = 28;
    var tCW = 115, tCH = 165;

    for (var i = 0; i < Math.min(5, topBooks.length); i++) {
      var book = topBooks[i];
      var ry   = startY + i * (rowH + rowGap);
      hardCard(ctx, 80, ry, W - 160, rowH, allFills[i]);

      // Cover
      drawCoverNeo(ctx, book.imageId ? coverMap[book.imageId] : null,
        108, ry + Math.floor((rowH - tCH) / 2), tCW, tCH);

      // Rank — measure width so title never overlaps
      var rankStr = '#' + (i + 1);
      ctx.save();
      ctx.font = 'bold 72px ' + FONT.display;
      var rankW = ctx.measureText(rankStr).width;
      var bRankX = 108 + tCW + 20;
      var btx    = bRankX + rankW + 28;
      var btw    = W - 80 - btx - 20;
      ctx.fillStyle    = '#000000';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(rankStr, bRankX, ry + rowH / 2);
      ctx.font = 'bold 44px ' + FONT.heading;
      ctx.fillText(h.fitText(ctx, book.title || 'Unknown', btw), btx, ry + rowH / 2 - 28);
      if (book.author) {
        ctx.font = '30px ' + FONT.body;
        ctx.fillText(h.fitText(ctx, book.author, btw), btx, ry + rowH / 2 + 22);
      }
      ctx.restore();

      // Time box — red badge, bottom-right, no drop shadow
      var _tbW = 180, _tbH = 46;
      var _tbX = W - 80 - _tbW - 18, _tbY = ry + rowH - _tbH - 16;
      ctx.save();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(_tbX, _tbY, _tbW, _tbH);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(_tbX, _tbY, _tbW, _tbH);
      ctx.font = 'bold 28px ' + FONT.display;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fmtMins(book.minutes), _tbX + _tbW / 2, _tbY + _tbH / 2);
      ctx.restore();
    }

    // Cover cloud — remaining books
    var cloudY    = startY + Math.min(5, topBooks.length) * (rowH + rowGap) - rowGap + 24;
    var remaining = H - cloudY - 60;
    if (remaining > 120 && allBooks && allBooks.length > 5) {
      var COLS = 8, GUTTER = 10;
      var ccw = Math.floor((W - 160 - GUTTER * (COLS - 1)) / COLS);
      var cch = Math.floor(ccw * 1.5);
      var rowsAvail = Math.max(1, Math.floor((remaining - 40) / (cch + GUTTER)));
      var extras = allBooks.slice(5, 5 + COLS * rowsAvail);
      ctx.save();
      ctx.font = 'bold 26px ' + FONT.body;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.fillText('ALSO READ', 80, cloudY + 28);
      ctx.restore();
      var gridTop = cloudY + 40;
      extras.forEach(function (entry, idx) {
        var col = idx % COLS;
        var row = Math.floor(idx / COLS);
        var ex  = 80 + col * (ccw + GUTTER);
        var ey  = gridTop + row * (cch + GUTTER);
        drawCoverNeo(ctx, entry.imageId ? coverMap[entry.imageId] : null, ex, ey, ccw, cch);
      });
    }

    return c;
  }

  function slideTopAuthors(topAuthors, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 3);
    var W = h.W, H = h.H, FONT = h.FONT;

    hardCard(ctx, 80, 60, W - 160, 140, '#000000');
    ctx.save();
    ctx.font      = 'bold 72px ' + FONT.heading;
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TOP AUTHORS ' + year, W / 2, 130);
    ctx.restore();

    var startY = 260;
    var rowH = 180;
    var fills = ['#fef08a', '#fbcfe8', '#a7f3d0', '#bfdbfe', '#fed7aa', '#ddd6fe'];
    for (var i = 0; i < Math.min(8, topAuthors.length); i++) {
      var a = topAuthors[i];
      var y = startY + i * (rowH + 20);
      hardCard(ctx, 80, y, W - 160, rowH, fills[i % fills.length]);
      ctx.save();
      ctx.font      = 'bold 80px ' + FONT.display;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.fillText('#' + (i + 1), 110, y + 124);
      ctx.font      = 'bold 44px ' + FONT.heading;
      ctx.fillText(h.fitText(ctx, a.author || 'Unknown', W - 600), 290, y + 88);
      ctx.font      = '32px ' + FONT.body;
      ctx.fillText(a.bookCount + (a.bookCount === 1 ? ' book' : ' books'), 290, y + 136);
      ctx.restore();
      // Time box — same style as top books, blue badge, bottom-right
      var _tbW = 180, _tbH = 46;
      var _tbX = W - 80 - _tbW - 18, _tbY = y + rowH - _tbH - 16;
      ctx.save();
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(_tbX, _tbY, _tbW, _tbH);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(_tbX, _tbY, _tbW, _tbH);
      ctx.font = 'bold 28px ' + FONT.display;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fmtMins(a.minutes), _tbX + _tbW / 2, _tbY + _tbH / 2);
      ctx.restore();
    }

    return c;
  }

  function slideHabits(stats, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 4);
    var W = h.W, H = h.H, FONT = h.FONT;

    hardCard(ctx, 80, 60, W - 160, 140, '#000000');
    ctx.save();
    ctx.font      = 'bold 72px ' + FONT.heading;
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HABITS', W / 2, 130);
    ctx.restore();

    var habits = [
      { glyph: '\uD83C\uDF19', val: (stats.preferredPeriod || '\u2014').toUpperCase(), label: 'FAV PERIOD',      fill: '#fef08a', sub: null },
      { glyph: '\u23F1\uFE0F', val: fmtMins(Math.round(stats.averageMinutes || 0)),    label: 'AVG SESSION',     fill: '#fbcfe8', sub: null },
      { glyph: '\uD83C\uDFC6', val: fmtMins(Math.round(stats.longestMinutes || 0)),    label: 'LONGEST SESSION', fill: '#a7f3d0', sub: stats.longestBookTitle || null },
      { glyph: '\uD83D\uDCC5', val: fmtMins(Math.round(stats.averageMinutesPerDay || 0)), label: 'PER DAY',      fill: '#bfdbfe', sub: null }
    ];

    var colW = (W - 80 - 80 - 60) / 2;
    var rowH = 680;
    habits.forEach(function (hab, i) {
      var x = 80 + (i % 2) * (colW + 60);
      var y = 280 + Math.floor(i / 2) * (rowH + 40);
      hardCard(ctx, x, y, colW, rowH, hab.fill);

      ctx.save();
      ctx.font      = '180px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(hab.glyph, x + colW / 2, y + 220);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      var fitSize = fitTextSize(ctx, hab.val, colW - 60, 100, function (s) {
        return 'bold ' + s + 'px ' + FONT.display;
      });
      ctx.font = 'bold ' + fitSize + 'px ' + FONT.display;
      ctx.fillText(hab.val, x + colW / 2, y + 400);
      if (hab.sub) {
        ctx.font      = 'italic 28px ' + FONT.body;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(h.fitText(ctx, hab.sub, colW - 60), x + colW / 2, y + 456);
      }
      ctx.font      = 'bold 32px ' + FONT.heading;
      ctx.fillStyle = '#000000';
      ctx.fillText(hab.label, x + colW / 2, y + rowH - 56);
      ctx.restore();
    });

    return c;
  }

  function slideStreaks(stats, topStreaks, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 5);
    var W = h.W, H = h.H, FONT = h.FONT;

    hardCard(ctx, 80, 60, W - 160, 140, '#000000');
    ctx.save();
    ctx.font      = 'bold 72px ' + FONT.heading;
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STREAKS', W / 2, 130);
    ctx.restore();

    // Hero — longest streak number HUGE
    ctx.save();
    ctx.font      = 'bold 320px ' + FONT.display;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(String(stats.longestStreak || 0), W / 2, 520);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(W / 2 - 220, 560, 440, 18);
    ctx.font      = 'bold 56px ' + FONT.heading;
    ctx.fillStyle = '#000000';
    ctx.fillText('DAYS IN A ROW', W / 2, 670);
    ctx.restore();

    // List of top streaks
    var startY = 760;
    var rowH = 190;
    var fills = ['#fef08a', '#fbcfe8', '#a7f3d0'];
    var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    function fmtDate(d) {
      if (!d) { return ''; }
      try {
        var dt = (d instanceof Date) ? d : new Date(String(d));
        if (isNaN(dt.getTime())) { return String(d); }
        return MONTH_NAMES[dt.getMonth()] + ' ' + dt.getDate();
      } catch (e) { return String(d); }
    }
    for (var i = 0; i < Math.min(5, (topStreaks || []).length); i++) {
      var st = topStreaks[i];
      var y = startY + i * (rowH + 24);
      hardCard(ctx, 80, y, W - 160, rowH, fills[i % fills.length]);
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.font      = 'bold 96px ' + FONT.display;
      ctx.fillText('#' + (i + 1), 110, y + 129);
      ctx.font      = 'bold 70px ' + FONT.display;
      ctx.fillText(String(st.days) + ' days', 290, y + 100);
      ctx.font      = '34px ' + FONT.body;
      ctx.fillText(fmtDate(st.start) + ' \u2013 ' + fmtDate(st.end), 290, y + 150);
      ctx.restore();
    }

    return c;
  }

  function slideVocabulary(hlStats, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 6);
    var W = h.W, H = h.H, FONT = h.FONT;
    var M = 60;

    // ── Header ──
    hardCard(ctx, 80, 60, W - 160, 140, '#000000');
    ctx.save();
    ctx.font = 'bold 72px ' + FONT.heading;
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VOCABULARY ' + year, W / 2, 130);
    ctx.restore();

    // ── Hero: total word count ──
    var heroY = 220, heroH = 210;
    hardCard(ctx, M, heroY, W - M * 2, heroH, '#000000');
    var totalStr = String(hlStats.wordCount || 0);
    ctx.save();
    var tFit = fitTextSize(ctx, totalStr, 480, 160, function (s) {
      return 'bold ' + s + 'px ' + FONT.display;
    });
    ctx.font = 'bold ' + tFit + 'px ' + FONT.display;
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(totalStr, M + 540, heroY + heroH / 2);
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 44px ' + FONT.heading;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('TOTAL', M + 560, heroY + heroH / 2 - 30);
    ctx.font = 'bold 44px ' + FONT.heading;
    ctx.fillText('WORDS', M + 560, heroY + heroH / 2 + 30);
    ctx.restore();

    // ── 2×2 grid: NOUNS | VERBS / ADJECTIVES | OTHER ──
    var gridY = heroY + heroH + 20;          // 420
    var gap   = 20;
    var cW    = Math.floor((W - M * 2 - gap) / 2);  // 470
    var cH    = Math.floor((H - gridY - 60 - gap) / 2); // ~695

    var categories = [
      { label: 'NOUNS',      count: (hlStats.nouns      || []).length, longest: hlStats.longestNoun  || null, shortest: hlStats.shortestNoun  || null, fill: '#fef08a' },
      { label: 'VERBS',      count: (hlStats.verbs      || []).length, longest: hlStats.longestVerb  || null, shortest: hlStats.shortestVerb  || null, fill: '#fbcfe8' },
      { label: 'ADJECTIVES', count: (hlStats.adjectives || []).length, longest: hlStats.longestAdj   || null, shortest: hlStats.shortestAdj   || null, fill: '#a7f3d0' },
      { label: 'OTHER',      count: (hlStats.others     || []).length, longest: hlStats.longestOther || null, shortest: hlStats.shortestOther || null, fill: '#bfdbfe' }
    ];

    categories.forEach(function (cat, i) {
      var col = i % 2;
      var row = Math.floor(i / 2);
      var cx  = M + col * (cW + gap);
      var cy  = gridY + row * (cH + gap);
      hardCard(ctx, cx, cy, cW, cH, cat.fill);

      // POS label
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      var labelFit = fitTextSize(ctx, cat.label, cW - 24, 30, function (s) {
        return 'bold ' + s + 'px ' + FONT.heading;
      });
      ctx.font = 'bold ' + labelFit + 'px ' + FONT.heading;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(cat.label, cx + cW / 2, cy + 48);
      ctx.restore();

      // Count
      var countStr = String(cat.count);
      ctx.save();
      var cFit = fitTextSize(ctx, countStr, cW - 24, 180, function (s) {
        return 'bold ' + s + 'px ' + FONT.display;
      });
      ctx.font = 'bold ' + cFit + 'px ' + FONT.display;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(countStr, cx + cW / 2, cy + 195);
      ctx.restore();

      // Red divider
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(cx + 16, cy + 300, cW - 32, 8);

      // Longest
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px ' + FONT.heading;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('LONGEST', cx + cW / 2, cy + 346);
      var longStr = cat.longest ? cat.longest.toUpperCase() : '\u2014';
      var lFit = fitTextSize(ctx, longStr, cW - 24, 90, function (s) {
        return 'bold ' + s + 'px ' + FONT.display;
      });
      ctx.font = 'bold ' + lFit + 'px ' + FONT.display;
      ctx.textBaseline = 'middle';
      ctx.fillText(longStr, cx + cW / 2, cy + 438);
      ctx.restore();

      // Red divider
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(cx + 16, cy + 498, cW - 32, 8);

      // Shortest
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px ' + FONT.heading;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('SHORTEST', cx + cW / 2, cy + 542);
      var shortStr = cat.shortest ? cat.shortest.toUpperCase() : '\u2014';
      var sFit = fitTextSize(ctx, shortStr, cW - 24, 80, function (s) {
        return 'bold ' + s + 'px ' + FONT.display;
      });
      ctx.font = 'bold ' + sFit + 'px ' + FONT.display;
      ctx.textBaseline = 'middle';
      ctx.fillText(shortStr, cx + cW / 2, cy + 626);
      ctx.restore();
    });

    return c;
  }

  function slideQuotes(hlStats, year, h) {
    var c    = h.makeCanvas();
    var ctx  = c.getContext('2d');
    h.drawBg(ctx, 7);
    var W = h.W, H = h.H, FONT = h.FONT;
    var quotes = (hlStats.quotes || []).slice();
    var M      = 60;

    // ── Header ──
    hardCard(ctx, 80, 60, W - 160, 140, '#000000');
    ctx.save();
    ctx.font = 'bold 72px ' + FONT.heading;
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QUOTES ' + year, W / 2, 130);
    ctx.restore();

    if (!quotes.length) {
      ctx.save();
      ctx.font = 'bold 56px ' + FONT.heading;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText('NO QUOTES THIS YEAR', W / 2, H / 2);
      ctx.restore();
      return c;
    }

    var fills    = ['#fef08a', '#fbcfe8', '#a7f3d0', '#bfdbfe', '#fed7aa', '#ddd6fe'];
    var initFills = ['#dc2626', '#2563eb', '#000000', '#16a34a', '#f97316', '#8b5cf6'];
    var cardW    = W - M * 2;
    var fontSize = 26;
    var lineH    = 38;
    var maxLines = 4;
    var padV     = 20;
    var padH     = 28;
    var cardGap  = 28;
    var curY     = 260;
    var shown    = 0;
    var INIT_SIZE = 72;

    quotes.forEach(function (quote, qi) {
      if (curY >= H - 80) { return; }
      var text = (typeof quote === 'string' ? quote : (quote && quote.text) || '')
        .replace(/\s+/g, ' ').trim();
      if (!text) { return; }

      var firstChar  = text.charAt(0).toUpperCase();
      var remainder  = text.slice(1);

      // Measure initial width
      ctx.font = 'bold ' + INIT_SIZE + 'px ' + FONT.heading;
      var initCharW = ctx.measureText(firstChar).width;
      var initBoxW  = Math.ceil(initCharW) + 20;
      var textX     = M + padH + initBoxW + 12;
      var innerW    = cardW - padH - initBoxW - 12 - padH;

      // word-wrap remainder
      ctx.font = fontSize + 'px ' + FONT.body;
      var wds = remainder.split(' ');
      var lines = [], cur = '';
      for (var wi = 0; wi < wds.length; wi++) {
        var tryLine = cur ? cur + ' ' + wds[wi] : wds[wi];
        if (ctx.measureText(tryLine).width > innerW && cur) {
          lines.push(cur);
          cur = wds[wi];
          if (lines.length === maxLines - 1) { cur += '\u2026'; break; }
        } else { cur = tryLine; }
      }
      if (cur && lines.length < maxLines) { lines.push(cur); }

      var minLines  = Math.ceil(INIT_SIZE / lineH);
      while (lines.length < minLines) { lines.push(''); }

      var cardH   = lines.length * lineH + padV * 2;
      var leftH   = H - 80 - curY;
      if (leftH < padV * 2 + lineH) { return; }
      if (cardH > leftH) { cardH = leftH; }

      hardCard(ctx, M, curY, cardW, cardH, fills[qi % fills.length]);

      // Initial letter tile
      var initFill = initFills[qi % initFills.length];
      var initBoxH = cardH;
      ctx.save();
      ctx.fillStyle = initFill;
      ctx.fillRect(M + padH, curY, initBoxW, initBoxH);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(M + padH, curY, initBoxW, initBoxH);
      ctx.font = 'bold ' + INIT_SIZE + 'px ' + FONT.heading;
      ctx.fillStyle = (initFill === '#000000' || initFill === '#2563eb' || initFill === '#16a34a' || initFill === '#8b5cf6') ? '#ffffff' : '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(firstChar, M + padH + initBoxW / 2, curY + cardH / 2);
      ctx.restore();

      // Faint index number top-right
      ctx.save();
      ctx.font = 'bold 22px ' + FONT.heading;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText((qi + 1 < 10 ? '0' : '') + (qi + 1), M + cardW - 14, curY + 10);
      ctx.restore();

      // Quote text (to the right of the initial)
      ctx.save();
      ctx.font = fontSize + 'px ' + FONT.body;
      ctx.fillStyle    = '#000000';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      lines.forEach(function (line, li) {
        if (line) { ctx.fillText(line, textX, curY + padV + li * lineH); }
      });
      ctx.restore();

      curY += cardH + cardGap;
      shown++;
    });

    // Overflow badge
    var overflow = quotes.length - shown;
    if (overflow > 0 && H - curY > 50) {
      ctx.save();
      ctx.font = 'bold 30px ' + FONT.heading;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText('+ ' + overflow + ' MORE', W / 2, curY + 24);
      ctx.restore();
    }

    return c;
  }

  function slideWordsCloud(hlStats, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 8);
    var W = h.W, H = h.H, FONT = h.FONT;
    var M = 80;

    // ── Header ──
    hardCard(ctx, 80, 60, W - 160, 140, '#000000');
    ctx.save();
    ctx.font = 'bold 72px ' + FONT.heading;
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEW WORDS ' + year, W / 2, 130);
    ctx.restore();

    // Word count badge
    if (hlStats.wordCount != null) {
      hardCard(ctx, M, 228, W - M * 2, 80, '#facc15');
      ctx.save();
      ctx.font = 'bold 40px ' + FONT.display;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hlStats.wordCount + ' WORDS SAVED', W / 2, 268);
      ctx.restore();
    }

    var allWords = hlStats.words || [];
    if (!allWords.length) {
      ctx.save();
      ctx.font = 'bold 56px ' + FONT.heading;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText('NO WORDS THIS YEAR', W / 2, H / 2);
      ctx.restore();
      return c;
    }

    // Deduplicate, preserve first occurrence order
    var seen = {}, uniq = [];
    allWords.forEach(function (w) {
      var k = w.toLowerCase();
      if (!seen[k]) { seen[k] = true; uniq.push(w); }
    });

    // ── Chip layout — variable-width pills packed left-to-right ──
    var chipFills = ['#fef08a', '#fbcfe8', '#a7f3d0', '#bfdbfe', '#fed7aa', '#ddd6fe', '#fca5a5', '#6ee7b7', '#93c5fd', '#fdba74', '#f9a8d4', '#d9f99d', '#67e8f9', '#c4b5fd', '#fde68a', '#bbf7d0'];
    var chipFS    = 24;   // font size
    var chipH     = 48;   // pill height
    var chipPadX  = 16;   // horizontal inner padding each side
    var chipGapX  = 8;    // horizontal gap between pills
    var chipGapY  = 10;   // vertical gap between rows
    var startY    = 340;
    var curX      = M;
    var curY      = startY;

    ctx.font = 'bold ' + chipFS + 'px ' + FONT.display;

    for (var wi = 0; wi < uniq.length; wi++) {
      if (curY + chipH > H - 60) { break; }
      var word = uniq[wi].toUpperCase();
      var tw   = ctx.measureText(word).width;
      var cw   = tw + chipPadX * 2;

      // Wrap to next row if needed
      if (curX + cw > W - M && curX > M) {
        curX  = M;
        curY += chipH + chipGapY;
        if (curY + chipH > H - 60) { break; }
      }

      var fill = chipFills[wi % chipFills.length];
      // Small offset shadow
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(curX + 6, curY + 6, cw, chipH);
      // Fill
      ctx.fillStyle = fill;
      ctx.fillRect(curX, curY, cw, chipH);
      // Border
      ctx.lineWidth   = 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(curX, curY, cw, chipH);
      // Label
      ctx.save();
      ctx.font = 'bold ' + chipFS + 'px ' + FONT.display;
      ctx.fillStyle    = '#000000';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(word, curX + chipPadX, curY + chipH / 2);
      ctx.restore();

      curX += cw + chipGapX;
    }

    return c;
  }

  function slideWordCloud(genreStats, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 9);
    var W = h.W, H = h.H, FONT = h.FONT;

    // Standard neo title bar
    hardCard(ctx, 80, 60, W - 160, 140, '#000000');
    ctx.save();
    ctx.font = 'bold 72px ' + FONT.heading;
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GENRES ' + year, W / 2, 130);
    ctx.restore();

    if (!genreStats.length) {
      ctx.save();
      ctx.font      = 'bold 56px ' + FONT.heading;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText('NO GENRE DATA', W / 2, H / 2);
      ctx.restore();
      return c;
    }

    var PALETTE = ['#fef08a', '#fbcfe8', '#a7f3d0', '#bfdbfe', '#fed7aa', '#ddd6fe', '#dc2626', '#2563eb', '#16a34a'];

    var words  = genreStats.slice(0, 60);
    var maxCnt = words[0].count;
    var minCnt = words[words.length - 1].count;
    var CLOUD_TOP = 240;
    var CX = W / 2;
    var CY = CLOUD_TOP + (H - CLOUD_TOP - 60) / 2;

    function fontSize(count) {
      var t = maxCnt === minCnt ? 1 : (count - minCnt) / (maxCnt - minCnt);
      return Math.round(34 + t * 80);
    }

    var placed = [];
    function overlaps(r) {
      for (var k = 0; k < placed.length; k++) {
        var p = placed[k];
        if (r.x < p.x + p.w && r.x + r.w > p.x && r.y < p.y + p.h && r.y + r.h > p.y) { return true; }
      }
      return false;
    }

    function tryPlace(word, count) {
      var fs   = fontSize(count);
      ctx.font = 'bold ' + fs + 'px ' + FONT.heading;
      var tw   = ctx.measureText(word).width;
      var th   = fs * 1.2;
      var PAD  = 12;
      for (var step = 0; step < 800; step++) {
        var angle = 0.15 * step;
        var r     = 18 * angle;
        var rx    = CX + r * Math.cos(angle) - tw / 2;
        var ry    = CY + r * Math.sin(angle) * 0.55 - th / 2;
        var box   = { x: rx - PAD, y: ry - PAD, w: tw + PAD * 2, h: th + PAD * 2 };
        if (box.x < 40 || box.x + box.w > W - 40 || box.y < CLOUD_TOP || box.y + box.h > H - 60) { continue; }
        if (!overlaps(box)) { placed.push(box); return { x: rx, y: ry + fs * 0.8, fs: fs }; }
      }
      return null;
    }

    words.forEach(function (genre, i) {
      var pos = tryPlace(genre.subject, genre.count);
      if (!pos) { return; }
      var col = PALETTE[i % PALETTE.length];
      ctx.save();
      ctx.font      = 'bold ' + pos.fs + 'px ' + FONT.heading;
      ctx.fillStyle = col;
      ctx.textAlign = 'left';
      // Draw offset shadow
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(genre.subject, pos.x + 4, pos.y + 4);
      ctx.fillStyle = col;
      ctx.fillText(genre.subject, pos.x, pos.y);
      ctx.restore();
    });

    return c;
  }

  function slideGenres(genreStats, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 9);
    var W = h.W, H = h.H, FONT = h.FONT;

    hardCard(ctx, 80, 60, W - 160, 140, '#000000');
    ctx.save();
    ctx.font      = 'bold 72px ' + FONT.heading;
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GENRES ' + year, W / 2, 130);
    ctx.restore();

    if (!genreStats.length) { return c; }

    var top = genreStats.slice(0, 8).sort(function (a, b) { return b.minutes - a.minutes; });
    var maxMinutes = top[0].minutes;
    var startY = 360;
    var rowH = 170;
    var BAR_LEFT = 80;
    var BAR_W = W - 160;
    var BAR_H = 80;
    var fills = ['#dc2626', '#2563eb', '#16a34a', '#facc15', '#ec4899', '#f97316', '#8b5cf6', '#0ea5e9'];

    top.forEach(function (g, i) {
      var y = startY + i * rowH;
      var barW = Math.max(60, Math.round((g.minutes / maxMinutes) * BAR_W));

      // Bar shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
      ctx.fillRect(BAR_LEFT + 12, y + 12, barW, BAR_H);
      // Bar fill
      ctx.fillStyle = fills[i % fills.length];
      ctx.fillRect(BAR_LEFT, y, barW, BAR_H);
      // Bar border
      ctx.lineWidth   = 5;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(BAR_LEFT, y, barW, BAR_H);

      // Label above bar
      ctx.save();
      ctx.font      = 'bold 36px ' + FONT.heading;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.fillText(h.fitText(ctx, (g.subject || 'Unknown').toUpperCase(), BAR_W - 200), BAR_LEFT, y - 14);

      // Reading time to right of bar
      ctx.font      = 'bold 36px ' + FONT.display;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'right';
      ctx.fillText(fmtMins(Math.round(g.minutes)), BAR_LEFT + BAR_W, y - 14);
      ctx.restore();
    });

    return c;
  }

  function slideMosaic(allBooksForYear, coverMap, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 10);
    var W = h.W, H = h.H, FONT = h.FONT;

    hardCard(ctx, 80, 60, W - 160, 140, '#000000');
    ctx.save();
    ctx.font = 'bold 72px ' + FONT.heading;
    ctx.fillStyle = '#facc15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BOOKS MOSAIC ' + year, W / 2, 130);
    ctx.restore();

    var books = allBooksForYear.slice().sort(function (a, b) { return b.minutes - a.minutes; });
    if (!books.length) {
      ctx.save();
      ctx.font = 'bold 56px ' + FONT.heading;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText('NO BOOKS THIS YEAR', W / 2, H / 2);
      ctx.restore();
      return c;
    }

    var COVER_AR    = 2 / 3;
    var MAX_H       = 320;
    var MIN_H       = 40;
    var GAP         = 6;
    var MOSAIC_TOP  = 240;
    var MOSAIC_LEFT = 40;
    var MOSAIC_W    = W - MOSAIC_LEFT * 2;
    var MOSAIC_H    = H - MOSAIC_TOP - 40;
    var maxMin      = books[0].minutes;

    var items = books.map(function (b) {
      var img = b.imageId ? coverMap[b.imageId] : null;
      var ar  = (img && img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : COVER_AR;
      var t   = Math.sqrt(b.minutes / maxMin);
      var nh  = MIN_H + t * (MAX_H - MIN_H);
      return { book: b, nh: nh, nw: nh * ar, ar: ar };
    });

    // Greedy row packing
    var rows = [], cur = [], curW = 0;
    items.forEach(function (item) {
      var projected = curW + (cur.length ? GAP : 0) + item.nw;
      if (projected > MOSAIC_W && cur.length > 0) {
        rows.push(cur); cur = [item]; curW = item.nw;
      } else {
        cur.push(item); curW = projected;
      }
    });
    if (cur.length) { rows.push(cur); }

    var y = MOSAIC_TOP;
    rows.forEach(function (row) {
      if (y + MIN_H > MOSAIC_TOP + MOSAIC_H) { return; }
      // Row height derived from actual aspect ratios — preserves each cover's shape
      var sumAR = row.reduce(function (s, it) { return s + it.ar; }, 0);
      var rowH  = Math.round((MOSAIC_W - GAP * (row.length - 1)) / sumAR);
      rowH      = Math.min(rowH, MAX_H, MOSAIC_TOP + MOSAIC_H - y);
      if (rowH <= 0) { return; }
      var x = MOSAIC_LEFT;
      row.forEach(function (item) {
        var iw  = Math.round(rowH * item.ar);
        var img = item.book.imageId ? coverMap[item.book.imageId] : null;
        // Neobrutalism: hard offset shadow
        ctx.fillStyle = 'rgba(0,0,0,0.90)';
        ctx.fillRect(x + 5, y + 5, iw, rowH);
        if (img) {
          ctx.drawImage(img, x, y, iw, rowH);
        } else {
          ctx.fillStyle = '#374151';
          ctx.fillRect(x, y, iw, rowH);
          ctx.save();
          ctx.font = Math.floor(Math.min(iw, rowH) * 0.4) + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('\uD83D\uDCDA', x + iw / 2, y + rowH / 2);
          ctx.restore();
        }
        // Thick border
        ctx.lineWidth   = 3;
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(x, y, iw, rowH);
        x += iw + GAP;
      });
      y += rowH + GAP;
    });

    return c;
  }

  // ── Theme registration ─────────────────────────────────────────────────

  window.WrappedThemes['neobrutalism'] = {
    id: 'neobrutalism',
    name: 'Neobrutalism',
    colors: {
      bg1:     '#fef08a',
      bg2:     '#fbcfe8',
      accent1: '#000000',
      accent2: '#dc2626',
      white:   '#000000',
      muted:   '#1f2937',
      dim:     '#374151',
      surface: '#ffffff',
      divider: '#000000',
      gold:    '#facc15',
      silver:  '#e5e7eb',
      bronze:  '#dc2626'
    },
    rankColors: ['#dc2626', '#2563eb', '#16a34a', '#facc15', '#000000'],
    fonts: {
      heading: '"Archivo Black", "Inter", -apple-system, sans-serif',
      body:    '"Inter", -apple-system, Arial, sans-serif',
      display: '"Archivo Black", "Inter", -apple-system, sans-serif'
    },

    drawBackground: function (ctx, W, H, seed) {
      var rng = makeRng(seed);
      ctx.fillStyle = BG_PALETTE[(seed | 0) % BG_PALETTE.length];
      ctx.fillRect(0, 0, W, H);

      // 2-3 black geometric shapes off in corners (decoration, behind cards)
      ctx.save();
      ctx.globalAlpha = 0.10;
      var shapes = 2 + Math.floor(rng() * 2);
      for (var i = 0; i < shapes; i++) {
        var sx = rng() * W;
        var sy = rng() * H;
        var sr = 200 + rng() * 240;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    drawCard: function (ctx, x, y, w, h, opts, h_) {
      var fill = opts.fill && opts.fill.indexOf('rgba') === 0 ? '#ffffff' : (opts.fill || '#ffffff');
      hardCard(ctx, x, y, w, h, fill);
    },

    slides: {
      slideIntro:       slideIntro,
      slideOverview:    slideOverview,
      slideTopBooks:    slideTopBooks,
      slideTopAuthors:  slideTopAuthors,
      slideHabits:      slideHabits,
      slideStreaks:     slideStreaks,
      slideQuotes:      slideQuotes,
      slideWordsCloud:  slideWordsCloud,
      slideWordCloud:   slideWordCloud,
      slideGenres:      slideGenres,
      slideMosaic:      slideMosaic
    }
  };
}());
