/* Spotify-era 2023 — flat pop-art, geometric blocks, solid saturated color.
   Off-white base, large geometric shape per slide, solid color blocked
   stat cards with thick black borders. Numbers are graphic elements. */

(function () {
  'use strict';
  window.WrappedThemes = window.WrappedThemes || {};

  var BASE = '#fafaf6';
  var INK  = '#000000';
  var POP  = ['#ef4444', '#3b82f6', '#10b981', '#fbbf24', '#ec4899', '#f97316', '#8b5cf6', '#06b6d4'];

  function fmtMins(m) { if (typeof formatDurationLabel === 'function') return formatDurationLabel(m); var h = Math.floor(m / 60), mm = Math.round(m % 60); return h ? (h + 'h ' + mm + 'm') : (mm + 'm'); }
  function fitTextSize(ctx, text, maxW, startSize, fontFn) { var size = startSize; while (size > 12) { ctx.font = fontFn(size); if (ctx.measureText(text).width <= maxW) return size; size -= 4; } return size; }
  function makeRng(seed) { var s = ((seed | 0) + 1) * 1664525 + 1013904223; return function () { s = Math.imul(s ^ (s >>> 15), s | 1) >>> 0; s = (s ^ (s + Math.imul(s ^ (s >>> 7), s | 61) >>> 0)) >>> 0; return ((s ^ (s >>> 14)) >>> 0) / 4294967296; }; }

  function popCard(ctx, x, y, w, h_, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h_);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.strokeRect(x, y, w, h_);
  }

  function popBg(ctx, W, H, seed) {
    ctx.fillStyle = BASE; ctx.fillRect(0, 0, W, H);
    var rng = makeRng(seed);
    var col = POP[Math.floor(rng() * POP.length)];
    var shape = (seed | 0) % 3;
    ctx.fillStyle = col;
    if (shape === 0) {
      var cx = rng() * W, cy = rng() * H, cr = 380 + rng() * 320;
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
    } else if (shape === 1) {
      var corner = Math.floor(rng() * 4);
      ctx.beginPath();
      if (corner === 0) { ctx.moveTo(0, 0); ctx.lineTo(W * 0.7, 0); ctx.lineTo(0, H * 0.7); }
      else if (corner === 1) { ctx.moveTo(W, 0); ctx.lineTo(W, H * 0.7); ctx.lineTo(W * 0.3, 0); }
      else if (corner === 2) { ctx.moveTo(W, H); ctx.lineTo(W * 0.3, H); ctx.lineTo(W, H * 0.3); }
      else { ctx.moveTo(0, H); ctx.lineTo(0, H * 0.3); ctx.lineTo(W * 0.7, H); }
      ctx.closePath(); ctx.fill();
    } else {
      var bandH = 260 + rng() * 240, bandY = 200 + rng() * (H - 600);
      ctx.fillRect(0, bandY, W, bandH);
    }
  }

  function slideIntro(year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 0); var W = h.W, H = h.H, FONT = h.FONT;
    // Year giant on left, title stacked right
    ctx.fillStyle = INK; ctx.font = 'bold 540px ' + FONT.display; ctx.textAlign = 'left';
    ctx.fillText(String(year), 60, H / 2 + 100);
    ctx.lineWidth = 6; ctx.strokeStyle = INK;
    ctx.strokeText(String(year), 60, H / 2 + 100);
    ctx.fillStyle = INK; ctx.font = 'bold 96px ' + FONT.heading;
    ctx.fillText('YOUR', 80, H - 540);
    ctx.fillText('READING', 80, H - 440);
    ctx.fillText('WRAPPED', 80, H - 340);
    return c;
  }

  function slideOverview(stats, year, booksFinished, hlStats, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 1); var W = h.W, H = h.H, FONT = h.FONT;
    ctx.fillStyle = INK; ctx.font = 'bold 80px ' + FONT.heading;
    ctx.fillText(year + ' IN NUMBERS', 80, 260);

    popCard(ctx, 80, 340, W - 160, 224, POP[5] || POP[6]);

    // Hero
    var hero = fmtMins(stats.totalMinutes);
    var fz = fitTextSize(ctx, hero, W - 160, 160, function (s) { return 'bold ' + s + 'px ' + FONT.display; });
    ctx.fillStyle = INK; ctx.font = 'bold ' + fz + 'px ' + FONT.display; ctx.textAlign = 'left';
    ctx.fillText(hero, 80, 460);
    ctx.font = '36px ' + FONT.body; ctx.fillStyle = '#525252';
    ctx.fillText('READ THIS YEAR', 80, 516);

    // Stat rows
    var fills = [POP[0], POP[3], POP[2], POP[1], POP[4] || POP[0]];
    var rows = [
      { val: String(stats.sessionCount),                        label: 'SESSIONS' },
      { val: String(booksFinished || 0),                        label: 'BOOKS FINISHED' },
      { val: String(stats.longestStreak || 0) + 'D',            label: 'BEST STREAK' },
      { val: String(hlStats && hlStats.wordCount  != null ? hlStats.wordCount  : 0), label: 'WORDS SAVED' },
      { val: String(hlStats && hlStats.quoteCount != null ? hlStats.quoteCount : 0), label: 'QUOTES SAVED' }
    ];
    var startY = 584; var rowH = 244;
    rows.forEach(function (row, i) {
      var y = startY + i * rowH;
      popCard(ctx, 80, y, W - 160, rowH - 20, fills[i]);
      ctx.fillStyle = INK; ctx.font = 'bold 28px ' + FONT.heading; ctx.textAlign = 'left';
      ctx.fillText(row.label, 110, y + 40);
      var fz2 = fitTextSize(ctx, row.val, W - 280, 150, function (s) { return 'bold ' + s + 'px ' + FONT.display; });
      ctx.font = 'bold ' + fz2 + 'px ' + FONT.display;
      ctx.fillText(row.val, 110, y + 194);
    });
    return c;
  }

  function slideTopBooks(topBooks, _allBooks, _coverMap, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 2); var W = h.W, H = h.H, FONT = h.FONT;
    ctx.fillStyle = INK; ctx.font = 'bold 80px ' + FONT.heading; ctx.fillText(year + ' BOOKS', 80, 280);
    if (!topBooks.length) return c;
    // Hero
    var hero = topBooks[0];
    ctx.save(); ctx.fillStyle = POP[0]; ctx.globalAlpha = 0.18;
    ctx.font = 'bold 600px ' + FONT.display; ctx.fillText('1', 60, 700); ctx.restore();
    ctx.fillStyle = INK; ctx.font = 'bold 56px ' + FONT.heading;
    ctx.fillText(h.fitText(ctx, hero.title || 'Unknown', W - 160), 80, 460);
    if (hero.author) { ctx.fillStyle = '#525252'; ctx.font = '32px ' + FONT.body; ctx.fillText(h.fitText(ctx, hero.author, W - 160), 80, 510); }
    ctx.fillStyle = POP[0]; ctx.font = 'bold 64px ' + FONT.display; ctx.fillText(fmtMins(hero.minutes), 80, 600);
    for (var i = 1; i < Math.min(5, topBooks.length); i++) {
      var book = topBooks[i]; var y = 800 + (i - 1) * 230;
      popCard(ctx, 80, y, W - 160, 200, POP[i % POP.length]);
      ctx.fillStyle = INK; ctx.font = 'bold 110px ' + FONT.display;
      ctx.fillText(String(i + 1), 110, y + 140);
      ctx.font = 'bold 36px ' + FONT.heading;
      ctx.fillText(h.fitText(ctx, book.title || 'Unknown', W - 480), 280, y + 80);
      if (book.author) { ctx.font = '24px ' + FONT.body; ctx.fillText(h.fitText(ctx, book.author, W - 480), 280, y + 120); }
      ctx.font = 'bold 36px ' + FONT.display; ctx.textAlign = 'right';
      ctx.fillText(fmtMins(book.minutes), W - 110, y + 140); ctx.textAlign = 'left';
    }
    return c;
  }

  function slideTopAuthors(topAuthors, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 3); var W = h.W, H = h.H, FONT = h.FONT;
    ctx.fillStyle = INK; ctx.font = 'bold 80px ' + FONT.heading; ctx.fillText(year + ' AUTHORS', 80, 280);
    for (var i = 0; i < Math.min(7, topAuthors.length); i++) {
      var a = topAuthors[i]; var y = 380 + i * 200;
      popCard(ctx, 80, y, W - 160, 170, POP[i % POP.length]);
      ctx.fillStyle = INK; ctx.font = 'bold 100px ' + FONT.display;
      ctx.fillText(String(i + 1), 110, y + 130);
      ctx.font = 'bold 40px ' + FONT.heading;
      ctx.fillText(h.fitText(ctx, a.author || 'Unknown', W - 540), 270, y + 80);
      ctx.font = '24px ' + FONT.body; ctx.fillText(a.bookCount + (a.bookCount === 1 ? ' book' : ' books'), 270, y + 120);
      ctx.font = 'bold 38px ' + FONT.display; ctx.textAlign = 'right';
      ctx.fillText(fmtMins(a.minutes), W - 110, y + 110); ctx.textAlign = 'left';
    }
    return c;
  }

  function slideHabits(stats, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 4); var W = h.W, H = h.H, FONT = h.FONT;
    ctx.fillStyle = INK; ctx.font = 'bold 80px ' + FONT.heading; ctx.fillText(year + ' HABITS', 80, 280);
    var habs = [
      { glyph: '🌙', val: (stats.preferredPeriod || '—').toUpperCase(), label: 'PERIOD', color: POP[0] },
      { glyph: '⏱', val: fmtMins(Math.round(stats.averageMinutes || 0)), label: 'AVG', color: POP[1] },
      { glyph: '🏆', val: fmtMins(Math.round(stats.longestMinutes || 0)), label: 'LONGEST', color: POP[2] },
      { glyph: '📅', val: fmtMins(Math.round(stats.averageMinutesPerDay || 0)), label: 'PER DAY', color: POP[3] }
    ];
    var colW = (W - 220) / 2; var rowH = 580;
    habs.forEach(function (hb, i) {
      var x = 80 + (i % 2) * (colW + 60); var y = 380 + Math.floor(i / 2) * (rowH + 40);
      popCard(ctx, x, y, colW, rowH, hb.color);
      ctx.fillStyle = INK; ctx.textAlign = 'center';
      ctx.font = '180px sans-serif'; ctx.fillText(hb.glyph, x + colW / 2, y + 220);
      var fz = fitTextSize(ctx, hb.val, colW - 60, 80, function (s) { return 'bold ' + s + 'px ' + FONT.display; });
      ctx.font = 'bold ' + fz + 'px ' + FONT.display;
      ctx.fillText(hb.val, x + colW / 2, y + 380);
      ctx.font = 'bold 36px ' + FONT.heading;
      ctx.fillText(hb.label, x + colW / 2, y + rowH - 50); ctx.textAlign = 'left';
    });
    return c;
  }

  function slideStreaks(stats, topStreaks, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 5); var W = h.W, H = h.H, FONT = h.FONT;
    ctx.fillStyle = INK; ctx.font = 'bold 80px ' + FONT.heading; ctx.textAlign = 'center';
    ctx.fillText(year + ' STREAKS', W / 2, 280); ctx.textAlign = 'left';
    // Background number at low alpha
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = POP[2];
    ctx.font = 'bold 800px ' + FONT.display; ctx.textAlign = 'center';
    ctx.fillText(String(stats.longestStreak || 0), W / 2, H / 2 + 200);
    ctx.restore();
    // Foreground number
    ctx.fillStyle = INK; ctx.font = 'bold 360px ' + FONT.display; ctx.textAlign = 'center';
    ctx.fillText(String(stats.longestStreak || 0), W / 2, 720);
    ctx.font = 'bold 48px ' + FONT.heading; ctx.fillText('CONSECUTIVE DAYS', W / 2, 800); ctx.textAlign = 'left';
    function fmt(d) { try { return d.toLocaleDateString(); } catch (e) { return ''; } }
    for (var i = 0; i < Math.min(4, (topStreaks || []).length); i++) {
      var st = topStreaks[i]; var y = 970 + i * 180;
      popCard(ctx, 80, y, W - 160, 160, POP[i % POP.length]);
      ctx.fillStyle = INK; ctx.font = 'bold 80px ' + FONT.display;
      ctx.fillText('#' + (i + 1), 110, y + 110);
      ctx.font = 'bold 44px ' + FONT.display; ctx.fillText(String(st.days) + ' days', 280, y + 80);
      ctx.font = '24px ' + FONT.body; ctx.fillText(fmt(st.start) + ' – ' + fmt(st.end), 280, y + 120);
    }
    return c;
  }

  function slideVocabulary(hlStats, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 6); var W = h.W, H = h.H, FONT = h.FONT;
    ctx.fillStyle = INK; ctx.font = 'bold 80px ' + FONT.heading; ctx.fillText(year + ' WORDS', 80, 280);
    var rows = [
      { val: String(hlStats.wordCount || 0), label: 'NEW WORDS', color: POP[0] },
      { val: hlStats.longestWord || '—', label: 'LONGEST', color: POP[1] },
      { val: String(hlStats.quoteCount || 0), label: 'QUOTES', color: POP[2] },
      { val: hlStats.shortestWord || '—', label: 'SHORTEST', color: POP[3] }
    ];
    rows.forEach(function (r, i) {
      var y = 380 + i * 290;
      popCard(ctx, 80, y, W - 160, 270, r.color);
      ctx.fillStyle = INK; ctx.font = 'bold 32px ' + FONT.heading;
      ctx.fillText(r.label, 130, y + 60);
      var fz = fitTextSize(ctx, String(r.val), W - 280, 130, function (s) { return 'bold ' + s + 'px ' + FONT.display; });
      ctx.font = 'bold ' + fz + 'px ' + FONT.display;
      ctx.fillText(String(r.val), 130, y + 200);
    });
    return c;
  }

  function slideQuotes(hlStats, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 7); var W = h.W, H = h.H, FONT = h.FONT;
    ctx.fillStyle = INK; ctx.font = 'bold 80px ' + FONT.heading; ctx.textAlign = 'center';
    ctx.fillText(year + ' QUOTE', W / 2, 280); ctx.textAlign = 'left';
    var quotes = (hlStats.quotes || []);
    if (!quotes.length) {
      ctx.fillStyle = '#525252'; ctx.font = 'italic 36px ' + FONT.body; ctx.textAlign = 'center';
      ctx.fillText('No quotes saved this year', W / 2, H / 2);
      return c;
    }
    var pick = (typeof quotes[0] === 'string' ? quotes[0] : (quotes[0] && quotes[0].text) || '').trim();
    popCard(ctx, 80, 420, W - 160, 1100, POP[0]);
    ctx.fillStyle = INK; ctx.font = 'bold 200px ' + FONT.display; ctx.textAlign = 'center';
    ctx.fillText('"', W / 2, 660);
    ctx.font = 'bold 48px ' + FONT.heading;
    var maxW = W - 280; var words = pick.split(' '); var lines = []; var cur = '';
    for (var i = 0; i < words.length; i++) { var t = cur ? cur + ' ' + words[i] : words[i]; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = t; }
    if (cur) lines.push(cur);
    var lineH = 64; var totalH = lines.length * lineH;
    var startY = 700 + 200 - totalH / 2;
    lines.forEach(function (l, li) { ctx.fillText(l, W / 2, startY + li * lineH); });
    ctx.textAlign = 'left';
    return c;
  }

  function slideWordsCloud(hlStats, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 8); var W = h.W, H = h.H, FONT = h.FONT;
    ctx.fillStyle = INK; ctx.font = 'bold 80px ' + FONT.heading; ctx.fillText(year + ' NEW WORDS', 80, 280);
    if (hlStats.wordCount != null) { ctx.fillStyle = INK; ctx.font = '40px ' + FONT.body; ctx.fillText(hlStats.wordCount + ' words saved', 80, 400); }
    var allWords = hlStats.words || []; if (!allWords.length) return c;
    var freq = {};
    allWords.forEach(function (w) { var k = w.toLowerCase(); freq[k] = { word: w, count: (freq[k] ? freq[k].count : 0) + 1 }; });
    var words = Object.keys(freq).map(function (k) { return freq[k]; })
      .sort(function (a, b) { return b.count - a.count; }).slice(0, 36);
    var rng = makeRng(8);
    var cols = 6; var rows = 6; var pad = 16;
    var gridX = 80, gridY = 480, gridW = W - 160, gridH = H - gridY - 80;
    var cw = (gridW - (cols - 1) * pad) / cols, ch = (gridH - (rows - 1) * pad) / rows;
    for (var i = 0; i < Math.min(words.length, cols * rows); i++) {
      var col = i % cols, row = Math.floor(i / cols);
      var x = gridX + col * (cw + pad), y = gridY + row * (ch + pad);
      popCard(ctx, x, y, cw, ch, POP[Math.floor(rng() * POP.length)]);
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var fz = fitTextSize(ctx, words[i].word, cw - 24, 40, function (s) { return 'bold ' + s + 'px ' + FONT.heading; });
      ctx.font = 'bold ' + fz + 'px ' + FONT.heading;
      ctx.fillText(words[i].word.toUpperCase(), x + cw / 2, y + ch / 2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    return c;
  }

  function slideGenres(genreStats, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 9); var W = h.W, H = h.H, FONT = h.FONT;
    ctx.fillStyle = INK; ctx.font = 'bold 80px ' + FONT.heading; ctx.fillText(year + ' GENRES', 80, 280);
    if (!genreStats.length) return c;
    var top = genreStats.slice(0, 7); var maxCnt = top[0].count;
    var BAR_W = W - 320;
    top.forEach(function (g, i) {
      var y = 380 + i * 200; var w = Math.max(60, Math.round((g.count / maxCnt) * BAR_W));
      popCard(ctx, 80, y, w, 100, POP[i % POP.length]);
      ctx.fillStyle = INK; ctx.font = 'bold 36px ' + FONT.heading;
      ctx.fillText(h.fitText(ctx, (g.subject || 'Unknown').toUpperCase(), w - 40), 100, y + 64);
      ctx.font = 'bold 56px ' + FONT.display; ctx.textAlign = 'right';
      ctx.fillText(String(g.count), W - 80, y + 70); ctx.textAlign = 'left';
    });
    return c;
  }

  window.WrappedThemes['spotify-2023'] = {
    id: 'spotify-2023',
    name: 'Spotify 2023',
    colors: { bg1: BASE, bg2: '#dc2626', accent1: POP[0], accent2: POP[3], white: INK, muted: '#525252', dim: '#a3a3a3', surface: '#ffffff', divider: INK, gold: POP[3], silver: '#e5e7eb', bronze: POP[5] },
    rankColors: POP,
    fonts: { heading: '"Archivo Black", "Inter", -apple-system, sans-serif', body: '"Inter", -apple-system, Arial, sans-serif', display: '"Archivo Black", "Inter", -apple-system, sans-serif' },
    drawBackground: popBg,
    drawCard: function (ctx, x, y, w, h_, opts, _h) { popCard(ctx, x, y, w, h_, POP[0]); },
    slides: { slideIntro: slideIntro, slideOverview: slideOverview, slideTopBooks: slideTopBooks, slideTopAuthors: slideTopAuthors, slideHabits: slideHabits, slideStreaks: slideStreaks, slideQuotes: slideQuotes, slideWordsCloud: slideWordsCloud, slideGenres: slideGenres }
  };
}());
