/* Glassmorphism — full slide overrides.

   Aesthetic: frosted-glass panels floating over a deep purple/indigo
   gradient with diffuse glows. Translucent surfaces, soft lavender halos,
   white/lavender text. */

(function () {
  'use strict';
  window.WrappedThemes = window.WrappedThemes || {};

  var GLASS_FILL    = 'rgba(255, 255, 255, 0.10)';
  var GLASS_BORDER  = 'rgba(255, 255, 255, 0.22)';
  var GLOW_LAVENDER = '#a78bfa';
  var WHITE         = '#ffffff';
  var LAVENDER      = '#cbd5e1';
  var DIM           = '#94a3b8';

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
      size -= 4;
    }
    return size;
  }

  function glassPanel(ctx, x, y, w, h, opts, helpers) {
    opts = opts || {};
    var radius = opts.radius != null ? opts.radius : 20;
    // Subtle drop shadow first
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    helpers.roundRect(ctx, x + 4, y + 6, w, h, radius);
    ctx.fill();
    ctx.restore();
    // Frosted glass fill
    ctx.save();
    helpers.roundRect(ctx, x, y, w, h, radius);
    ctx.fillStyle = opts.fill || GLASS_FILL;
    ctx.fill();
    // Inner glow border
    ctx.lineWidth   = 2;
    ctx.strokeStyle = GLASS_BORDER;
    ctx.stroke();
    ctx.restore();
  }

  function glowText(ctx, text, x, y, opts) {
    opts = opts || {};
    ctx.save();
    if (opts.glow) {
      ctx.shadowColor = opts.glowColor || GLOW_LAVENDER;
      ctx.shadowBlur = opts.glow;
    }
    ctx.font      = opts.font;
    ctx.fillStyle = opts.color || WHITE;
    ctx.textAlign = opts.align || 'left';
    if (opts.baseline) { ctx.textBaseline = opts.baseline; }
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // ── Slides ─────────────────────────────────────────────────────────────

  function slideIntro(year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 0);
    var W = h.W, H = h.H, FONT = h.FONT;

    // Big lavender glow rings behind title
    ctx.save();
    var glow = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 700);
    glow.addColorStop(0, 'rgba(167,139,250,0.35)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Frosted central panel
    glassPanel(ctx, 100, 600, W - 200, 720, { radius: 32 }, h);

    glowText(ctx, 'YOUR READING', W / 2, 800, {
      font: 'bold 72px ' + FONT.heading, color: LAVENDER, align: 'center', glow: 30, glowColor: GLOW_LAVENDER
    });
    glowText(ctx, 'WRAPPED', W / 2, 920, {
      font: 'bold 96px ' + FONT.display, color: WHITE, align: 'center', glow: 40, glowColor: GLOW_LAVENDER
    });
    glowText(ctx, String(year), W / 2, 1180, {
      font: 'bold 240px ' + FONT.display, color: GLOW_LAVENDER, align: 'center', glow: 60, glowColor: '#c4b5fd'
    });

    return c;
  }

  function slideOverview(stats, year, booksFinished, hlStats, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 1);
    var W = h.W, H = h.H, FONT = h.FONT;

    glowText(ctx, year + ' in numbers', 80, 185, { font: '52px ' + FONT.body, color: LAVENDER });

    glassPanel(ctx, 80, 254, W - 160, 240, { radius: 18 }, h);

    // Hero
    var hero = fmtMins(stats.totalMinutes);
    var fzHero = fitTextSize(ctx, hero, W - 160, 140, function (s) {
      return 'bold ' + s + 'px ' + FONT.display;
    });
    ctx.save();
    ctx.shadowColor = GLOW_LAVENDER;
    ctx.shadowBlur  = 40;
    ctx.font        = 'bold ' + fzHero + 'px ' + FONT.display;
    ctx.fillStyle   = WHITE;
    ctx.textAlign   = 'left';
    ctx.fillText(hero, 80, 385);
    ctx.restore();
    glowText(ctx, 'read this year', 80, 448, { font: '40px ' + FONT.body, color: LAVENDER });

    // Stat rows
    var rows = [
      { label: 'Sessions',       val: String(stats.sessionCount) },
      { label: 'Books finished', val: String(booksFinished || 0) },
      { label: 'Best streak',    val: String(stats.longestStreak || 0) + ' days' },
      { label: 'Words saved',    val: String(hlStats && hlStats.wordCount  != null ? hlStats.wordCount  : 0) },
      { label: 'Quotes saved',   val: String(hlStats && hlStats.quoteCount != null ? hlStats.quoteCount : 0) }
    ];

    var startY = 514;
    var rowH   = 260;

    rows.forEach(function (row, i) {
      var y = startY + i * rowH;
      glassPanel(ctx, 80, y, W - 160, rowH - 20, { radius: 18 }, h);
      glowText(ctx, row.label, 120, y + 44, { font: '30px ' + FONT.body, color: LAVENDER });
      var fz = fitTextSize(ctx, row.val, W - 280, 110, function (s) {
        return 'bold ' + s + 'px ' + FONT.display;
      });
      ctx.save();
      ctx.shadowColor = GLOW_LAVENDER;
      ctx.shadowBlur  = 28;
      ctx.font        = 'bold ' + fz + 'px ' + FONT.display;
      ctx.fillStyle   = WHITE;
      ctx.textAlign   = 'left';
      ctx.fillText(row.val, 120, y + 202);
      ctx.restore();
    });

    return c;
  }

  function slideTopBooks(topBooks, allBooks, coverMap, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 2);
    var W = h.W, H = h.H, FONT = h.FONT;

    glowText(ctx, year + ' · Top Books', 80, 240, { font: '52px ' + FONT.body, color: LAVENDER });

    if (!topBooks.length) { return c; }
    var hero = topBooks[0];

    // Hero glass panel
    glassPanel(ctx, 80, 360, W - 160, 460, { radius: 28 }, h);
    var coverX = 120, coverY = 400, coverW = 280, coverH = 380;
    var img = hero.imageId ? coverMap[hero.imageId] : null;
    if (img) {
      ctx.save();
      h.roundRect(ctx, coverX, coverY, coverW, coverH, 14);
      ctx.clip();
      ctx.drawImage(img, coverX, coverY, coverW, coverH);
      ctx.restore();
      // Lavender glow ring around cover
      ctx.save();
      ctx.shadowColor = GLOW_LAVENDER;
      ctx.shadowBlur = 30;
      h.roundRect(ctx, coverX, coverY, coverW, coverH, 14);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(167,139,250,0.6)';
      ctx.stroke();
      ctx.restore();
    }

    glowText(ctx, '#1', coverX + coverW + 50, coverY + 70, { font: 'bold 80px ' + FONT.display, color: WHITE, glow: 20 });
    glowText(ctx, h.fitText(ctx, hero.title || 'Unknown', W - coverX - coverW - 200), coverX + coverW + 50, coverY + 150, { font: 'bold 52px ' + FONT.heading, color: WHITE });
    if (hero.author) {
      glowText(ctx, h.fitText(ctx, hero.author, W - coverX - coverW - 200), coverX + coverW + 50, coverY + 210, { font: '32px ' + FONT.body, color: LAVENDER });
    }
    glowText(ctx, fmtMins(hero.minutes), coverX + coverW + 50, coverY + 320, { font: 'bold 64px ' + FONT.display, color: GLOW_LAVENDER, glow: 24 });

    // Ranks 2-5 in smaller frosted pills
    var startY = 870;
    var pillH = 180;
    for (var i = 1; i < Math.min(5, topBooks.length); i++) {
      var book = topBooks[i];
      var y = startY + (i - 1) * (pillH + 16);
      glassPanel(ctx, 80, y, W - 160, pillH, { radius: 20 }, h);
      glowText(ctx, '#' + (i + 1), 110, y + 110, { font: 'bold 72px ' + FONT.display, color: GLOW_LAVENDER, glow: 16 });
      glowText(ctx, h.fitText(ctx, book.title || 'Unknown', W - 600), 280, y + 80, { font: 'bold 40px ' + FONT.heading, color: WHITE });
      if (book.author) {
        glowText(ctx, h.fitText(ctx, book.author, W - 600), 280, y + 130, { font: '28px ' + FONT.body, color: LAVENDER });
      }
      glowText(ctx, fmtMins(book.minutes), W - 110, y + 110, { font: 'bold 44px ' + FONT.display, color: GLOW_LAVENDER, align: 'right', glow: 16 });
    }

    return c;
  }

  function slideTopAuthors(topAuthors, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 3);
    var W = h.W, H = h.H, FONT = h.FONT;

    glowText(ctx, year + ' · Top Authors', 80, 240, { font: '52px ' + FONT.body, color: LAVENDER });

    var startY = 360;
    var rowH = 160;
    for (var i = 0; i < Math.min(8, topAuthors.length); i++) {
      var a = topAuthors[i];
      var y = startY + i * (rowH + 12);
      glassPanel(ctx, 80, y, W - 160, rowH, { radius: 18 }, h);
      glowText(ctx, '#' + (i + 1), 110, y + 100, { font: 'bold 60px ' + FONT.display, color: GLOW_LAVENDER, glow: 14 });
      glowText(ctx, h.fitText(ctx, a.author || 'Unknown', W - 540), 240, y + 70, { font: 'bold 38px ' + FONT.heading, color: WHITE });
      glowText(ctx, a.bookCount + (a.bookCount === 1 ? ' book' : ' books'), 240, y + 115, { font: '26px ' + FONT.body, color: LAVENDER });
      glowText(ctx, fmtMins(a.minutes), W - 110, y + 100, { font: 'bold 42px ' + FONT.display, color: GLOW_LAVENDER, align: 'right', glow: 14 });
    }

    return c;
  }

  function slideHabits(stats, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 4);
    var W = h.W, H = h.H, FONT = h.FONT;

    glowText(ctx, year + ' · Habits', 80, 240, { font: '52px ' + FONT.body, color: LAVENDER });

    var habs = [
      { glyph: '🌙', val: (stats.preferredPeriod || '—').toUpperCase(), label: 'Favourite period' },
      { glyph: '⏱',  val: fmtMins(Math.round(stats.averageMinutes || 0)), label: 'Average session' },
      { glyph: '🏆', val: fmtMins(Math.round(stats.longestMinutes || 0)), label: 'Longest session' },
      { glyph: '📅', val: fmtMins(Math.round(stats.averageMinutesPerDay || 0)), label: 'Per day' }
    ];
    var colW = (W - 80 - 80 - 60) / 2;
    var rowH = 580;
    habs.forEach(function (hb, i) {
      var x = 80 + (i % 2) * (colW + 60);
      var y = 380 + Math.floor(i / 2) * (rowH + 40);
      glassPanel(ctx, x, y, colW, rowH, { radius: 28 }, h);
      ctx.save();
      ctx.shadowColor = GLOW_LAVENDER;
      ctx.shadowBlur = 30;
      ctx.font      = '160px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(hb.glyph, x + colW / 2, y + 220);
      ctx.restore();
      ctx.save();
      ctx.shadowColor = GLOW_LAVENDER;
      ctx.shadowBlur = 22;
      ctx.fillStyle = WHITE;
      ctx.textAlign = 'center';
      var fitSize = fitTextSize(ctx, hb.val, colW - 60, 80, function (s) {
        return 'bold ' + s + 'px ' + FONT.display;
      });
      ctx.font = 'bold ' + fitSize + 'px ' + FONT.display;
      ctx.fillText(hb.val, x + colW / 2, y + 380);
      ctx.restore();
      glowText(ctx, hb.label, x + colW / 2, y + rowH - 50, { font: '30px ' + FONT.body, color: LAVENDER, align: 'center' });
    });

    return c;
  }

  function slideStreaks(stats, topStreaks, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 5);
    var W = h.W, H = h.H, FONT = h.FONT;

    glowText(ctx, year + ' · Streaks', W / 2, 240, { font: '52px ' + FONT.body, color: LAVENDER, align: 'center' });

    glowText(ctx, String(stats.longestStreak || 0), W / 2, 720, {
      font: 'bold 380px ' + FONT.display, color: WHITE, align: 'center', glow: 80, glowColor: GLOW_LAVENDER
    });
    glowText(ctx, 'consecutive days', W / 2, 820, { font: '40px ' + FONT.body, color: LAVENDER, align: 'center' });

    var startY = 950;
    function fmt(d) { try { return d.toLocaleDateString(); } catch (e) { return ''; } }
    var rowH = 150;
    for (var i = 0; i < Math.min(4, (topStreaks || []).length); i++) {
      var st = topStreaks[i];
      var y = startY + i * (rowH + 14);
      glassPanel(ctx, 80, y, W - 160, rowH, { radius: 16 }, h);
      glowText(ctx, '#' + (i + 1), 110, y + 90, { font: 'bold 50px ' + FONT.display, color: GLOW_LAVENDER, glow: 12 });
      glowText(ctx, String(st.days) + ' days', 240, y + 80, { font: 'bold 44px ' + FONT.display, color: WHITE });
      glowText(ctx, fmt(st.start) + ' – ' + fmt(st.end), 240, y + 120, { font: '24px ' + FONT.body, color: LAVENDER });
    }

    return c;
  }

  function slideVocabulary(hlStats, year, h) {
    // slideHighlights — 5 frosted stat rows with connecting gradient lines
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 6);
    var W = h.W, H = h.H, FONT = h.FONT;

    glowText(ctx, year + ' · Highlights', 80, 240, { font: '52px ' + FONT.body, color: LAVENDER });

    var items = [
      { val: String(hlStats.wordCount || 0),                       label: 'New words' },
      { val: hlStats.longestWord || '—',                            label: 'Longest word' },
      { val: String((hlStats.longestWord || '').length || 0),       label: 'Letters in longest' },
      { val: String(hlStats.quoteCount || 0),                       label: 'Quotes saved' },
      { val: hlStats.shortestWord || '—',                           label: 'Shortest word' }
    ];
    var startY = 360;
    var rowH = 220;
    items.forEach(function (it, i) {
      var y = startY + i * (rowH + 12);
      glassPanel(ctx, 80, y, W - 160, rowH, { radius: 22 }, h);
      glowText(ctx, it.label, 120, y + 70, { font: '28px ' + FONT.body, color: LAVENDER });
      var fz = fitTextSize(ctx, String(it.val), W - 280, 90, function (s) {
        return 'bold ' + s + 'px ' + FONT.display;
      });
      ctx.save();
      ctx.shadowColor = GLOW_LAVENDER;
      ctx.shadowBlur = 22;
      ctx.font      = 'bold ' + fz + 'px ' + FONT.display;
      ctx.fillStyle = WHITE;
      ctx.textAlign = 'left';
      ctx.fillText(String(it.val), 120, y + 170);
      ctx.restore();
    });

    return c;
  }

  function slideQuotes(hlStats, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 7);
    var W = h.W, H = h.H, FONT = h.FONT;

    glowText(ctx, year + ' · Quotes', 80, 240, { font: '52px ' + FONT.body, color: LAVENDER });
    var quotes = (hlStats.quotes || []).slice(0, 4);
    if (!quotes.length) {
      glowText(ctx, 'No quotes saved this year', W / 2, H / 2, { font: 'italic 40px ' + FONT.body, color: DIM, align: 'center' });
      return c;
    }
    var startY = 360;
    var availH = H - startY - 80;
    var boxH = Math.floor((availH - (quotes.length - 1) * 24) / quotes.length);
    quotes.forEach(function (q, i) {
      var t = (typeof q === 'string' ? q : (q && q.text) || '').replace(/\s+/g, ' ').trim();
      var y = startY + i * (boxH + 24);
      glassPanel(ctx, 80, y, W - 160, boxH, { radius: 22 }, h);
      // Word-wrap
      ctx.save();
      ctx.font      = 'italic 32px ' + FONT.body;
      ctx.fillStyle = WHITE;
      var maxW = W - 280;
      var words = t.split(' ');
      var lines = [];
      var cur = '';
      for (var k = 0; k < words.length; k++) {
        var tryLine = cur ? cur + ' ' + words[k] : words[k];
        if (ctx.measureText(tryLine).width > maxW && cur) { lines.push(cur); cur = words[k]; }
        else { cur = tryLine; }
      }
      if (cur) { lines.push(cur); }
      var lineH = 44;
      var totalH = lines.length * lineH;
      var lineY = y + (boxH - totalH) / 2 + lineH;
      lines.forEach(function (ln, li) {
        ctx.fillText(ln, 130, lineY + li * lineH);
      });
      ctx.restore();
    });

    return c;
  }

  function slideWordsCloud(hlStats, year, h) {
    var c   = h.makeCanvas();
    var ctx = c.getContext('2d');
    h.drawBg(ctx, 8);
    var W = h.W, H = h.H, FONT = h.FONT;

    glowText(ctx, year + ' · New Words', 80, 240, { font: '52px ' + FONT.body, color: LAVENDER });
    if (hlStats.wordCount != null) {
      glowText(ctx, hlStats.wordCount + ' words saved', 80, 360, { font: '38px ' + FONT.body, color: DIM });
    }
    var allWords = hlStats.words || [];
    if (!allWords.length) {
      glowText(ctx, 'No new words saved', W / 2, H / 2, { font: 'italic 40px ' + FONT.body, color: DIM, align: 'center' });
      return c;
    }
    var freq = {};
    allWords.forEach(function (w) { var k = w.toLowerCase(); freq[k] = { word: w, count: (freq[k] ? freq[k].count : 0) + 1 }; });
    var words = Object.keys(freq).map(function (k) { return freq[k]; })
      .sort(function (a, b) { return b.count - a.count; }).slice(0, 80);
    var maxCnt = words[0].count;
    var minCnt = words[words.length - 1].count;

    var placed = [];
    function overlaps(x, y, w, ht) {
      for (var k = 0; k < placed.length; k++) {
        var p = placed[k];
        if (x < p.x + p.w + 12 && x + w > p.x - 12 && y < p.y + p.h + 12 && y + ht > p.y - 12) { return true; }
      }
      return false;
    }
    var CX = W / 2, CY = H / 2 + 80;
    words.forEach(function (w, i) {
      var t = maxCnt === minCnt ? 1 : (w.count - minCnt) / (maxCnt - minCnt);
      var size = Math.round(28 + t * 88);
      ctx.save();
      ctx.font = (i < 3 ? 'bold ' : '') + size + 'px ' + FONT.heading;
      var tw = ctx.measureText(w.word).width;
      var th = size * 1.2;
      var found = null;
      for (var ang = 0; ang < 1500; ang++) {
        var r = 1.2 * ang;
        var theta = ang * 0.4;
        var x = CX + r * Math.cos(theta) - tw / 2;
        var y = CY + r * Math.sin(theta) - th / 2;
        if (x < 80 || x + tw > W - 80 || y < 440 || y + th > H - 80) { continue; }
        if (!overlaps(x, y, tw, th)) { found = { x: x, y: y, w: tw, h: th }; break; }
      }
      if (found) {
        placed.push(found);
        ctx.shadowColor = GLOW_LAVENDER;
        ctx.shadowBlur = i === 0 ? 30 : (15 - Math.min(i, 14));
        ctx.fillStyle = i === 0 ? WHITE : (i < 5 ? LAVENDER : DIM);
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
    h.drawBg(ctx, 9);
    var W = h.W, H = h.H, FONT = h.FONT;

    glowText(ctx, year + ' · Genres', 80, 240, { font: '52px ' + FONT.body, color: LAVENDER });
    if (!genreStats.length) { return c; }
    var top = genreStats.slice(0, 8);
    var maxCnt = top[0].count;
    var startY = 360;
    var rowH = 150;
    var BAR_LEFT = 80;
    var BAR_W = W - 160;
    var BAR_H = 64;

    top.forEach(function (g, i) {
      var y = startY + i * rowH;
      var barW = Math.max(40, Math.round((g.count / maxCnt) * BAR_W));
      // Frosted bar background
      ctx.save();
      h.roundRect(ctx, BAR_LEFT, y + 60, BAR_W, BAR_H, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.restore();
      // Glowing bar fill
      ctx.save();
      ctx.shadowColor = GLOW_LAVENDER;
      ctx.shadowBlur = 16;
      h.roundRect(ctx, BAR_LEFT, y + 60, barW, BAR_H, 12);
      var grad = ctx.createLinearGradient(BAR_LEFT, 0, BAR_LEFT + barW, 0);
      grad.addColorStop(0, 'rgba(167,139,250,0.7)');
      grad.addColorStop(1, 'rgba(196,181,253,0.85)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
      // Genre label
      glowText(ctx, h.fitText(ctx, g.subject || 'Unknown', BAR_W - 200), BAR_LEFT, y + 44, { font: 'bold 32px ' + FONT.heading, color: WHITE });
      // Count right
      glowText(ctx, String(g.count) + (g.count === 1 ? ' book' : ' books'), BAR_LEFT + BAR_W, y + 44, { font: '28px ' + FONT.body, color: LAVENDER, align: 'right' });
    });

    return c;
  }

  // ── Theme registration ─────────────────────────────────────────────────

  window.WrappedThemes['glassmorphism'] = {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    colors: {
      bg1:     '#1e1b4b',
      bg2:     '#312e81',
      accent1: '#a78bfa',
      accent2: '#c4b5fd',
      white:   '#ffffff',
      muted:   '#cbd5e1',
      dim:     '#94a3b8',
      surface: 'rgba(255, 255, 255, 0.10)',
      divider: 'rgba(255, 255, 255, 0.18)',
      gold:    '#fcd34d',
      silver:  '#e2e8f0',
      bronze:  '#f59e0b'
    },
    rankColors: ['#a78bfa', '#c4b5fd', '#f0abfc', '#7dd3fc', '#fcd34d'],
    fonts: {
      heading: '"Inter", -apple-system, Arial, sans-serif',
      body:    '"Inter", -apple-system, Arial, sans-serif',
      display: '"Inter", -apple-system, Arial, sans-serif'
    },

    drawBackground: function (ctx, W, H, seed) {
      var s = ((seed | 0) + 1) * 1664525 + 1013904223;
      function rand() {
        s = Math.imul(s ^ (s >>> 15), s | 1) >>> 0;
        s = (s ^ (s + Math.imul(s ^ (s >>> 7), s | 61) >>> 0)) >>> 0;
        return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
      }
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0,   '#1e1b4b');
      g.addColorStop(0.5, '#312e81');
      g.addColorStop(1,   '#581c87');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      var glows = ['#a78bfa', '#c4b5fd', '#f0abfc', '#7dd3fc'];
      for (var i = 0; i < 4; i++) {
        var gx = rand() * W, gy = rand() * H, gr = 600 + rand() * 600;
        ctx.globalAlpha = 0.16;
        var rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        rg.addColorStop(0, glows[i]);
        rg.addColorStop(1, 'transparent');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      for (var n = 0; n < 600; n++) { ctx.fillRect(rand() * W, rand() * H, 2, 2); }
      ctx.restore();
    },

    drawCard: function (ctx, x, y, w, h, opts, helpers) {
      glassPanel(ctx, x, y, w, h, { radius: opts && opts.radius != null ? opts.radius : 20 }, helpers);
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
      slideGenres:      slideGenres
    }
  };
}());
