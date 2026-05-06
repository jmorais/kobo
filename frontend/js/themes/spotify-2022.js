/* Spotify-era 2022 — rave / festival energy. Near-black background with
   neon radial explosions, glowing text and borders, heavy shadowBlur. */

(function () {
  'use strict';
  window.WrappedThemes = window.WrappedThemes || {};

  var BG       = '#0a0a0f';
  var SURFACE  = '#111118';
  var WHITE    = '#ffffff';
  var MUTED    = '#a3a3a3';
  var DIM      = '#5e5e5e';
  var NEONS    = ['#ff007a', '#00f0ff', '#39ff14', '#ffeb3b', '#ff5e1a', '#c026d3', '#3b82f6'];

  function fmtMins(m) { if (typeof formatDurationLabel === 'function') return formatDurationLabel(m); var h = Math.floor(m / 60), mm = Math.round(m % 60); return h ? (h + 'h ' + mm + 'm') : (mm + 'm'); }
  function fitTextSize(ctx, text, maxW, startSize, fontFn) { var size = startSize; while (size > 12) { ctx.font = fontFn(size); if (ctx.measureText(text).width <= maxW) return size; size -= 4; } return size; }
  function makeRng(seed) { var s = ((seed | 0) + 1) * 1664525 + 1013904223; return function () { s = Math.imul(s ^ (s >>> 15), s | 1) >>> 0; s = (s ^ (s + Math.imul(s ^ (s >>> 7), s | 61) >>> 0)) >>> 0; return ((s ^ (s >>> 14)) >>> 0) / 4294967296; }; }

  function neonForSeed(seed) { return NEONS[(seed | 0) % NEONS.length]; }

  function darkCard(ctx, x, y, w, h_, neon, helpers) {
    ctx.save();
    helpers.roundRect(ctx, x, y, w, h_, 16);
    ctx.fillStyle = SURFACE; ctx.fill();
    ctx.shadowColor = neon; ctx.shadowBlur = 18;
    ctx.lineWidth = 2; ctx.strokeStyle = neon;
    ctx.stroke();
    ctx.restore();
  }

  function glowText(ctx, text, x, y, opts) {
    ctx.save();
    if (opts.glow) { ctx.shadowColor = opts.glowColor || opts.color; ctx.shadowBlur = opts.glow; }
    ctx.font = opts.font; ctx.fillStyle = opts.color; ctx.textAlign = opts.align || 'left';
    if (opts.baseline) ctx.textBaseline = opts.baseline;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function slideIntro(year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 0); var W = h.W, H = h.H, FONT = h.FONT;
    var n1 = NEONS[0], n2 = NEONS[1], n3 = NEONS[2];
    // Outlined "WRAPPED" — stroke not fill
    ctx.save();
    ctx.font = 'bold 240px ' + FONT.heading;
    ctx.textAlign = 'center';
    ctx.shadowColor = n1; ctx.shadowBlur = 40;
    ctx.lineWidth = 6; ctx.strokeStyle = n1;
    ctx.strokeText('WRAPPED', W / 2, H / 2 - 100);
    ctx.restore();
    glowText(ctx, String(year), W / 2, H / 2 + 200, { font: 'bold 280px ' + FONT.display, color: n2, glow: 60, align: 'center' });
    glowText(ctx, 'YOUR YEAR', W / 2, H / 2 + 360, { font: 'bold 56px ' + FONT.heading, color: n3, glow: 24, align: 'center' });
    return c;
  }

  function slideOverview(stats, year, booksFinished, hlStats, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 1); var W = h.W, H = h.H, FONT = h.FONT;
    var n = neonForSeed(1);
    glowText(ctx, year + ' IN NUMBERS', 80, 195, { font: 'bold 64px ' + FONT.heading, color: n, glow: 24 });

    darkCard(ctx, 80, 306, W - 160, 244, n, h);

    // Hero
    var hero = fmtMins(stats.totalMinutes);
    var fz = fitTextSize(ctx, hero, W - 160, 160, function (s) { return 'bold ' + s + 'px ' + FONT.display; });
    glowText(ctx, hero, 80, 420, { font: 'bold ' + fz + 'px ' + FONT.display, color: WHITE, glow: 50, glowColor: n });
    glowText(ctx, 'READ THIS YEAR', 80, 488, { font: '32px ' + FONT.body, color: n, glow: 12 });

    // Stat rows
    var rows = [
      { val: String(stats.sessionCount),                         label: 'SESSIONS',       color: NEONS[0] },
      { val: String(booksFinished || 0),                         label: 'BOOKS FINISHED', color: NEONS[1] },
      { val: String(stats.longestStreak || 0) + 'D',             label: 'BEST STREAK',    color: NEONS[2] },
      { val: String(hlStats && hlStats.wordCount  != null ? hlStats.wordCount  : 0), label: 'WORDS SAVED',    color: NEONS[3] },
      { val: String(hlStats && hlStats.quoteCount != null ? hlStats.quoteCount : 0), label: 'QUOTES SAVED',   color: NEONS[4] }
    ];
    var startY = 558; var rowH = 252;
    rows.forEach(function (row, i) {
      var y = startY + i * rowH;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(W - 80, y); ctx.stroke();
      ctx.restore();
      glowText(ctx, row.label, 80, y + 42, { font: 'bold 28px ' + FONT.heading, color: row.color, glow: 12 });
      var fz2 = fitTextSize(ctx, row.val, W - 160, 155, function (s) { return 'bold ' + s + 'px ' + FONT.display; });
      glowText(ctx, row.val, 80, y + 204, { font: 'bold ' + fz2 + 'px ' + FONT.display, color: WHITE, glow: 40, glowColor: row.color });
    });
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(80, startY + rows.length * rowH); ctx.lineTo(W - 80, startY + rows.length * rowH); ctx.stroke();
    ctx.restore();
    return c;
  }

  function slideTopBooks(topBooks, _allBooks, _coverMap, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 2); var W = h.W, H = h.H, FONT = h.FONT;
    var n = neonForSeed(2);
    glowText(ctx, year + ' TOP BOOKS', 80, 240, { font: 'bold 64px ' + FONT.heading, color: n, glow: 24 });
    if (!topBooks.length) return c;
    var hero = topBooks[0];
    glowText(ctx, '#1', 80, 460, { font: 'bold 200px ' + FONT.display, color: NEONS[0], glow: 50 });
    var fz = fitTextSize(ctx, hero.title || 'Unknown', W - 380, 64, function (s) { return 'bold ' + s + 'px ' + FONT.heading; });
    glowText(ctx, h.fitText(ctx, hero.title || 'Unknown', W - 380), 360, 380, { font: 'bold ' + fz + 'px ' + FONT.heading, color: NEONS[0], glow: 30 });
    if (hero.author) {
      glowText(ctx, h.fitText(ctx, hero.author, W - 380), 360, 440, { font: '28px ' + FONT.body, color: MUTED });
    }
    glowText(ctx, fmtMins(hero.minutes), 360, 510, { font: 'bold 56px ' + FONT.display, color: NEONS[1], glow: 30 });
    for (var i = 1; i < Math.min(5, topBooks.length); i++) {
      var book = topBooks[i]; var y = 700 + (i - 1) * 220; var nc = NEONS[i % NEONS.length];
      darkCard(ctx, 80, y, W - 160, 200, nc, h);
      glowText(ctx, '#' + (i + 1), 110, y + 130, { font: 'bold 88px ' + FONT.display, color: nc, glow: 24 });
      glowText(ctx, h.fitText(ctx, book.title || 'Unknown', W - 480), 280, y + 80, { font: 'bold 36px ' + FONT.heading, color: WHITE });
      if (book.author) glowText(ctx, h.fitText(ctx, book.author, W - 480), 280, y + 120, { font: '24px ' + FONT.body, color: MUTED });
      glowText(ctx, fmtMins(book.minutes), 280, y + 170, { font: 'bold 36px ' + FONT.display, color: nc, glow: 16 });
    }
    return c;
  }

  function slideTopAuthors(topAuthors, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 3); var W = h.W, H = h.H, FONT = h.FONT;
    glowText(ctx, year + ' TOP AUTHORS', 80, 240, { font: 'bold 64px ' + FONT.heading, color: NEONS[0], glow: 24 });
    for (var i = 0; i < Math.min(8, topAuthors.length); i++) {
      var a = topAuthors[i]; var y = 360 + i * 170; var nc = NEONS[i % NEONS.length];
      darkCard(ctx, 80, y, W - 160, 150, nc, h);
      // Rank circle
      ctx.save(); ctx.shadowColor = nc; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(140, y + 75, 40, 0, Math.PI * 2);
      ctx.fillStyle = SURFACE; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = nc; ctx.stroke();
      ctx.restore();
      glowText(ctx, String(i + 1), 140, y + 88, { font: 'bold 36px ' + FONT.display, color: nc, glow: 14, align: 'center' });
      glowText(ctx, h.fitText(ctx, a.author || 'Unknown', W - 540), 220, y + 70, { font: 'bold 38px ' + FONT.heading, color: WHITE });
      glowText(ctx, a.bookCount + (a.bookCount === 1 ? ' book' : ' books'), 220, y + 110, { font: '24px ' + FONT.body, color: MUTED });
      glowText(ctx, fmtMins(a.minutes), W - 100, y + 90, { font: 'bold 38px ' + FONT.display, color: nc, glow: 18, align: 'right' });
    }
    return c;
  }

  function slideHabits(stats, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 4); var W = h.W, H = h.H, FONT = h.FONT;
    glowText(ctx, year + ' HABITS', 80, 240, { font: 'bold 64px ' + FONT.heading, color: NEONS[2], glow: 24 });
    var habs = [
      { glyph: '🌙', val: (stats.preferredPeriod || '—').toUpperCase(), label: 'PERIOD', color: NEONS[0] },
      { glyph: '⏱', val: fmtMins(Math.round(stats.averageMinutes || 0)), label: 'AVG SESSION', color: NEONS[1] },
      { glyph: '🏆', val: fmtMins(Math.round(stats.longestMinutes || 0)), label: 'LONGEST', color: NEONS[3] },
      { glyph: '📅', val: fmtMins(Math.round(stats.averageMinutesPerDay || 0)), label: 'PER DAY', color: NEONS[5] }
    ];
    var colW = (W - 220) / 2; var rowH = 580;
    habs.forEach(function (hb, i) {
      var x = 80 + (i % 2) * (colW + 60); var y = 380 + Math.floor(i / 2) * (rowH + 40);
      darkCard(ctx, x, y, colW, rowH, hb.color, h);
      ctx.save(); ctx.shadowColor = hb.color; ctx.shadowBlur = 30;
      ctx.font = '160px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = WHITE;
      ctx.fillText(hb.glyph, x + colW / 2, y + 220);
      ctx.restore();
      var fz = fitTextSize(ctx, hb.val, colW - 60, 90, function (s) { return 'bold ' + s + 'px ' + FONT.display; });
      glowText(ctx, hb.val, x + colW / 2, y + 380, { font: 'bold ' + fz + 'px ' + FONT.display, color: hb.color, glow: 30, align: 'center' });
      glowText(ctx, hb.label, x + colW / 2, y + rowH - 50, { font: 'bold 30px ' + FONT.heading, color: WHITE, align: 'center' });
    });
    return c;
  }

  function slideStreaks(stats, topStreaks, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 5); var W = h.W, H = h.H, FONT = h.FONT;
    var n = NEONS[2];
    glowText(ctx, year + ' STREAKS', W / 2, 240, { font: 'bold 64px ' + FONT.heading, color: n, glow: 24, align: 'center' });
    // Outlined hero
    ctx.save();
    ctx.font = 'bold 480px ' + FONT.display; ctx.textAlign = 'center';
    ctx.shadowColor = n; ctx.shadowBlur = 80;
    ctx.lineWidth = 8; ctx.strokeStyle = n; ctx.fillStyle = WHITE;
    ctx.strokeText(String(stats.longestStreak || 0), W / 2, 800);
    ctx.fillText(String(stats.longestStreak || 0), W / 2, 800);
    ctx.restore();
    glowText(ctx, 'CONSECUTIVE DAYS', W / 2, 880, { font: 'bold 44px ' + FONT.heading, color: n, glow: 16, align: 'center' });
    function fmt(d) { try { return d.toLocaleDateString(); } catch (e) { return ''; } }
    for (var i = 0; i < Math.min(4, (topStreaks || []).length); i++) {
      var st = topStreaks[i]; var y = 1020 + i * 160; var nc = NEONS[i % NEONS.length];
      darkCard(ctx, 80, y, W - 160, 140, nc, h);
      glowText(ctx, '#' + (i + 1), 110, y + 90, { font: 'bold 50px ' + FONT.display, color: nc, glow: 18 });
      glowText(ctx, String(st.days) + ' days', 240, y + 70, { font: 'bold 44px ' + FONT.display, color: WHITE });
      glowText(ctx, fmt(st.start) + ' – ' + fmt(st.end), 240, y + 110, { font: '24px ' + FONT.body, color: MUTED });
    }
    return c;
  }

  function slideVocabulary(hlStats, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 6); var W = h.W, H = h.H, FONT = h.FONT;
    glowText(ctx, year + ' HIGHLIGHTS', 80, 240, { font: 'bold 64px ' + FONT.heading, color: NEONS[3], glow: 24 });
    var rows = [
      { val: String(hlStats.wordCount || 0), label: 'NEW WORDS', color: NEONS[0] },
      { val: hlStats.longestWord || '—', label: 'LONGEST WORD', color: NEONS[1] },
      { val: String(hlStats.quoteCount || 0), label: 'QUOTES', color: NEONS[2] },
      { val: hlStats.shortestWord || '—', label: 'SHORTEST', color: NEONS[3] },
      { val: String((hlStats.longestWord || '').length || 0), label: 'LETTERS', color: NEONS[4] }
    ];
    rows.forEach(function (r, i) {
      var y = 380 + i * 220;
      darkCard(ctx, 80, y, W - 160, 200, r.color, h);
      glowText(ctx, r.label, 130, y + 60, { font: 'bold 28px ' + FONT.heading, color: r.color, glow: 12 });
      var fz = fitTextSize(ctx, String(r.val), W - 280, 80, function (s) { return 'bold ' + s + 'px ' + FONT.display; });
      glowText(ctx, String(r.val), 130, y + 160, { font: 'bold ' + fz + 'px ' + FONT.display, color: WHITE, glow: 22, glowColor: r.color });
    });
    return c;
  }

  function slideQuotes(hlStats, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 7); var W = h.W, H = h.H, FONT = h.FONT;
    glowText(ctx, year + ' QUOTES', W / 2, 240, { font: 'bold 64px ' + FONT.heading, color: NEONS[5], glow: 24, align: 'center' });
    var quotes = (hlStats.quotes || []).slice(0, 3);
    if (!quotes.length) {
      glowText(ctx, 'No quotes saved this year', W / 2, H / 2, { font: 'italic 36px ' + FONT.body, color: DIM, align: 'center' });
      return c;
    }
    var availH = H - 380 - 80;
    var boxH = Math.floor((availH - (quotes.length - 1) * 30) / quotes.length);
    quotes.forEach(function (q, i) {
      var t = (typeof q === 'string' ? q : (q && q.text) || '').replace(/\s+/g, ' ').trim();
      var y = 380 + i * (boxH + 30); var nc = NEONS[i % NEONS.length];
      darkCard(ctx, 80, y, W - 160, boxH, nc, h);
      glowText(ctx, '"', 110, y + 80, { font: 'bold 100px ' + FONT.display, color: nc, glow: 20 });
      ctx.save();
      ctx.font = 'italic 30px ' + FONT.body; ctx.fillStyle = WHITE;
      var maxW = W - 280; var words = t.split(' '); var lines = []; var cur = '';
      for (var k = 0; k < words.length; k++) { var tt = cur ? cur + ' ' + words[k] : words[k]; if (ctx.measureText(tt).width > maxW && cur) { lines.push(cur); cur = words[k]; } else cur = tt; }
      if (cur) lines.push(cur);
      var lineH = 42; var totalH = lines.length * lineH;
      var lineY = y + (boxH - totalH) / 2 + lineH;
      lines.forEach(function (ln, li) { ctx.fillText(ln, 220, lineY + li * lineH); });
      ctx.restore();
    });
    return c;
  }

  function slideWordsCloud(hlStats, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 8); var W = h.W, H = h.H, FONT = h.FONT;
    glowText(ctx, year + ' NEW WORDS', 80, 240, { font: 'bold 64px ' + FONT.heading, color: NEONS[1], glow: 24 });
    if (hlStats.wordCount != null) { glowText(ctx, hlStats.wordCount + ' words saved', 80, 360, { font: '38px ' + FONT.body, color: NEONS[3] }); }
    var allWords = hlStats.words || []; if (!allWords.length) return c;
    var freq = {};
    allWords.forEach(function (w) { var k = w.toLowerCase(); freq[k] = { word: w, count: (freq[k] ? freq[k].count : 0) + 1 }; });
    var words = Object.keys(freq).map(function (k) { return freq[k]; })
      .sort(function (a, b) { return b.count - a.count; }).slice(0, 80);
    var maxCnt = words[0].count, minCnt = words[words.length - 1].count;
    var rng = makeRng(8);
    var placed = [];
    function overlaps(x, y, w, hh) { for (var k = 0; k < placed.length; k++) { var p = placed[k]; if (x < p.x + p.w + 10 && x + w > p.x - 10 && y < p.y + p.h + 10 && y + hh > p.y - 10) return true; } return false; }
    var CX = W / 2, CY = H / 2 + 80;
    words.forEach(function (w, i) {
      var t = maxCnt === minCnt ? 1 : (w.count - minCnt) / (maxCnt - minCnt);
      var size = Math.round(28 + t * 88);
      ctx.font = (i < 3 ? 'bold ' : '') + size + 'px ' + FONT.heading;
      var tw = ctx.measureText(w.word).width; var th = size * 1.1;
      var found = null;
      for (var ang = 0; ang < 1500; ang++) {
        var r = 1.4 * ang, theta = ang * 0.4;
        var x = CX + r * Math.cos(theta) - tw / 2;
        var y = CY + r * Math.sin(theta) - th / 2;
        if (x < 80 || x + tw > W - 80 || y < 440 || y + th > H - 80) continue;
        if (!overlaps(x, y, tw, th)) { found = { x: x, y: y, w: tw, h: th }; break; }
      }
      if (found) {
        placed.push(found);
        var col = NEONS[Math.floor(rng() * NEONS.length)];
        ctx.save();
        ctx.shadowColor = col; ctx.shadowBlur = i < 5 ? 26 : 12;
        ctx.fillStyle = col;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(w.word, found.x, found.y);
        ctx.restore();
      }
    });
    return c;
  }

  function slideGenres(genreStats, year, h) {
    var c = h.makeCanvas(); var ctx = c.getContext('2d');
    h.drawBg(ctx, 9); var W = h.W, H = h.H, FONT = h.FONT;
    glowText(ctx, year + ' GENRES', 80, 240, { font: 'bold 64px ' + FONT.heading, color: NEONS[6], glow: 24 });
    if (!genreStats.length) return c;
    var top = genreStats.slice(0, 8); var maxCnt = top[0].count;
    var BAR_W = W - 240;
    top.forEach(function (g, i) {
      var y = 360 + i * 170; var w = Math.max(40, Math.round((g.count / maxCnt) * BAR_W));
      var nc = NEONS[i % NEONS.length];
      glowText(ctx, h.fitText(ctx, (g.subject || 'Unknown').toUpperCase(), BAR_W), 80, y, { font: 'bold 32px ' + FONT.heading, color: nc, glow: 14 });
      ctx.save();
      ctx.shadowColor = nc; ctx.shadowBlur = 18;
      var grad = ctx.createLinearGradient(80, 0, 80 + w, 0);
      grad.addColorStop(0, nc); grad.addColorStop(1, NEONS[(i + 1) % NEONS.length]);
      ctx.fillStyle = grad; ctx.fillRect(80, y + 30, w, 36);
      ctx.restore();
      glowText(ctx, String(g.count), W - 80, y + 56, { font: 'bold 32px ' + FONT.display, color: nc, glow: 14, align: 'right' });
    });
    return c;
  }

  window.WrappedThemes['spotify-2022'] = {
    id: 'spotify-2022',
    name: 'Spotify 2022',
    colors: { bg1: BG, bg2: '#1a0a2e', accent1: NEONS[0], accent2: NEONS[1], white: WHITE, muted: MUTED, dim: DIM, surface: SURFACE, divider: '#2a2a4e', gold: NEONS[3], silver: '#c0c0c0', bronze: NEONS[4] },
    rankColors: NEONS,
    fonts: { heading: '"Bebas Neue", "Arial Narrow", "Inter", sans-serif', body: '"Inter", -apple-system, Arial, sans-serif', display: '"Bebas Neue", "Arial Narrow", "Inter", sans-serif' },
    drawBackground: function (ctx, W, H, seed) {
      var rng = makeRng(seed);
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (var i = 0; i < 5; i++) {
        var gx = rng() * W, gy = rng() * H, gr = 480 + rng() * 480;
        var col = NEONS[Math.floor(rng() * NEONS.length)];
        ctx.globalAlpha = 0.30 + rng() * 0.25;
        var rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        rg.addColorStop(0, col); rg.addColorStop(1, 'transparent');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
      for (var y = 0; y < H; y += 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();
    },
    drawCard: function (ctx, x, y, w, h_, opts, helpers) {
      darkCard(ctx, x, y, w, h_, NEONS[0], helpers);
    },
    slides: { slideIntro: slideIntro, slideOverview: slideOverview, slideTopBooks: slideTopBooks, slideTopAuthors: slideTopAuthors, slideHabits: slideHabits, slideStreaks: slideStreaks, slideQuotes: slideQuotes, slideWordsCloud: slideWordsCloud, slideGenres: slideGenres }
  };
}());
