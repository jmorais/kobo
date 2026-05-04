/* global normalizeLibrary, collectSessions, computeBookMinutesByYear,
          computeGeneralStats, safeSessions, parseSessionDate,
          formatDurationLabel, getAvailableYears, periodForHour,
          collectReadingDays, formatLocalDate, parseHighlightDate, JSZip */

'use strict';

(function () {

  // ── Canvas dimensions (Instagram Story 1080×1920) ────────────────────────
  var W = 1080;
  var H = 1920;

  // ── Theme colours ────────────────────────────────────────────────────────
  var CLR = {
    bg1:     '#0d0d1a',
    bg2:     '#160d2e',
    accent1: '#a78bfa',
    accent2: '#60a5fa',
    white:   '#ffffff',
    muted:   '#9ca3af',
    dim:     '#6b7280',
    surface: '#1a1a2e',
    divider: '#1e2535',
    gold:    '#fbbf24',
    silver:  '#9ca3af',
    bronze:  '#cd7f32'
  };

  var RANK_COLOURS = [CLR.gold, CLR.silver, CLR.bronze, CLR.accent1, CLR.accent2];

  // ── Canvas helpers ───────────────────────────────────────────────────────

  function makeCanvas() {
    var c = document.createElement('canvas');
    c.width  = W;
    c.height = H;
    return c;
  }

  function drawBg(ctx, seed) {
    // Mulberry32-inspired PRNG seeded per slide
    var s = ((seed | 0) + 1) * 1664525 + 1013904223;
    function rand() {
      s = Math.imul(s ^ (s >>> 15), s | 1) >>> 0;
      s = (s ^ (s + Math.imul(s ^ (s >>> 7), s | 61) >>> 0)) >>> 0;
      s = (s ^ (s >>> 14)) >>> 0;
      return s / 4294967296;
    }

    // Curated dark base pairs
    var BASES = [
      ['#0d0d1a', '#160d2e'], // navy/purple
      ['#080d18', '#0c1428'], // deep blue
      ['#0a180c', '#0c1e12'], // deep forest
      ['#180c0c', '#260c16'], // deep crimson
      ['#0c1818', '#0a1e1e'], // deep teal
      ['#161608', '#1c1c0c'], // deep olive
      ['#160c18', '#1c0c24'], // deep violet
      ['#100c1a', '#160c22'], // near-black indigo
    ];

    // Curated glow accent colours
    var GLOWS = [
      '#a78bfa', '#60a5fa', '#34d399', '#f472b6',
      '#fb923c', '#facc15', '#22d3ee', '#c084fc',
      '#f87171', '#a3e635', '#818cf8', '#2dd4bf',
    ];

    var base = BASES[Math.floor(rand() * BASES.length)];

    // Diagonal gradient in a random direction
    var flip0 = rand() > 0.5;
    var flip1 = rand() > 0.5;
    var x0 = flip0 ? W : 0;
    var y0 = flip1 ? H : 0;
    var x1 = flip0 ? 0 : W;
    var y1 = flip1 ? 0 : H;
    var g  = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0,    base[0]);
    g.addColorStop(0.55, base[1]);
    g.addColorStop(1,    base[0]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 3 procedural radial glows
    ctx.save();
    for (var i = 0; i < 3; i++) {
      var gx    = rand() * W;
      var gy    = rand() * H;
      var gr    = 380 + rand() * 640;
      var alpha = 0.07 + rand() * 0.13;
      var col   = GLOWS[Math.floor(rand() * GLOWS.length)];
      ctx.globalAlpha = alpha;
      var rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      rg.addColorStop(0, col);
      rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function accentGrad(ctx, x1, x2, y) {
    var g = ctx.createLinearGradient(x1, y, x2, y);
    g.addColorStop(0, CLR.accent1);
    g.addColorStop(1, CLR.accent2);
    return g;
  }

  function drawAccentBar(ctx, y) {
    ctx.save();
    ctx.strokeStyle = accentGrad(ctx, 80, 400, y);
    ctx.lineWidth   = 7;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(400, y);
    ctx.stroke();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function fitText(ctx, text, maxWidth) {
    if (!text) { return ''; }
    if (ctx.measureText(text).width <= maxWidth) { return text; }
    var t = text;
    while (t.length > 0) {
      t = t.slice(0, -1);
      if (ctx.measureText(t + '\u2026').width <= maxWidth) { return t + '\u2026'; }
    }
    return '\u2026';
  }

  function drawSectionHeader(ctx, label, y) {
    ctx.save();
    ctx.font      = '52px Inter, -apple-system, Arial, sans-serif';
    ctx.fillStyle = CLR.muted;
    ctx.textAlign = 'left';
    ctx.fillText(label, 80, y);
    ctx.restore();
    drawAccentBar(ctx, y + 30);
  }

  function drawDivider(_ctx, _y) {
    // dividers removed
  }

  function drawGradientText(ctx, text, x, y, fontSize, textAlign) {
    ctx.save();
    ctx.font      = 'bold ' + fontSize + 'px Inter, -apple-system, Arial, sans-serif';
    ctx.textAlign = textAlign || 'left';
    var measured  = ctx.measureText(text).width;
    var startX    = (textAlign === 'center') ? (x - measured / 2) : x;
    ctx.fillStyle = accentGrad(ctx, startX, startX + measured, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawBranding(_ctx) {
    // branding removed
  }

  // ── Image loader ─────────────────────────────────────────────────────────

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img       = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function loadCovers(topBooks, basePath) {
    var promises = topBooks.map(function (book) {
      if (!book.imageId) { return Promise.resolve(null); }
      return loadImage(basePath + encodeURIComponent(book.imageId) + ' - N3_LIBRARY_GRID.jpg');
    });
    return Promise.all(promises).then(function (imgs) {
      var map = {};
      topBooks.forEach(function (book, i) {
        if (book.imageId) { map[book.imageId] = imgs[i]; }
      });
      return map;
    });
  }

  function drawCover(ctx, img, x, y, cw, ch) {
    ctx.save();
    roundRect(ctx, x, y, cw, ch, 14);
    ctx.clip();
    if (img) {
      ctx.drawImage(img, x, y, cw, ch);
    } else {
      ctx.fillStyle = CLR.surface;
      ctx.fill();
      ctx.font      = '60px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = CLR.dim;
      ctx.fillText('\uD83D\uDCDA', x + cw / 2, y + ch / 2 + 22);
    }
    ctx.restore();
  }

  // ── Stats helpers ────────────────────────────────────────────────────────

  function computeAuthorsByYear(allSessions, year, bookMap) {
    var yearStart = new Date(year, 0, 1);
    var yearEnd   = new Date(year + 1, 0, 1);
    var totals    = {};

    allSessions.forEach(function (session) {
      var segStart = session.start > yearStart ? session.start : yearStart;
      var segEnd   = session.end   < yearEnd   ? session.end   : yearEnd;
      if (segEnd <= segStart) { return; }

      var minutes = (segEnd - segStart) / 60000;
      var book    = bookMap[session.bookId];
      var author  = (book && book.author) ? book.author : 'Unknown';

      if (!totals[author]) {
        totals[author] = { author: author, minutes: 0, bookIds: {} };
      }
      totals[author].minutes += minutes;
      totals[author].bookIds[session.bookId] = true;
    });

    return Object.keys(totals).map(function (a) {
      var e = totals[a];
      return { author: e.author, minutes: e.minutes, bookCount: Object.keys(e.bookIds).length };
    }).sort(function (a, b) { return b.minutes - a.minutes; });
  }

  function computeTopStreaks(yearSessions, year) {
    // Build a sorted list of unique reading-day strings within the year
    var yearStart = new Date(year, 0, 1);
    var yearEnd   = new Date(year + 1, 0, 1);
    var inYear    = yearSessions.filter(function (s) {
      return s.start < yearEnd && s.end > yearStart;
    });
    var days = collectReadingDays(inYear).filter(function (d) {
      return d >= String(year) && d < String(year + 1);
    });

    if (!days.length) { return []; }

    var streaks = [];
    var run = 1;
    var runStart = days[0];

    for (var i = 1; i < days.length; i++) {
      var prev = new Date(days[i - 1]);
      var curr = new Date(days[i]);
      var diff = Math.round((curr - prev) / 86400000);
      if (diff === 1) {
        run++;
      } else {
        streaks.push({ days: run, start: runStart, end: days[i - 1] });
        run = 1;
        runStart = days[i];
      }
    }
    streaks.push({ days: run, start: runStart, end: days[days.length - 1] });

    return streaks.sort(function (a, b) { return b.days - a.days; }).slice(0, 5);
  }

  function countFinishedInYear(books, year) {
    var yearStart = new Date(year, 0, 1);
    var yearEnd   = new Date(year + 1, 0, 1);
    return books.filter(function (book) {
      if (book.read_status !== 'Finished') { return false; }
      return safeSessions(book).some(function (session) {
        var end = new Date(parseSessionDate(session[1]));
        return end >= yearStart && end < yearEnd;
      });
    }).length;
  }

  function computeHighlightsStats(books, year) {
    var yearStart = new Date(year, 0, 1);
    var yearEnd   = new Date(year + 1, 0, 1);
    var words  = [];
    var quotes = [];

    books.forEach(function (book) {
      (book.highlights || []).forEach(function (h) {
        var date = parseHighlightDate(h.date_created);
        if (!date || date < yearStart || date >= yearEnd) { return; }
        var text = (h.text || '').trim();
        if (!text) { return; }
        if (h.type === 'word') {
          words.push(text);
        } else if (h.type === 'quote') {
          quotes.push(text);
        }
      });
    });

    var sorted = words.slice().sort(function (a, b) { return a.length - b.length; });
    return {
      wordCount:    words.length,
      quoteCount:   quotes.length,
      shortestWord: sorted.length ? sorted[0] : null,
      longestWord:  sorted.length ? sorted[sorted.length - 1] : null,
      words:        words,
      quotes:       quotes
    };
  }

  // ── Slide 1 — Intro ──────────────────────────────────────────────────────

  function slideIntro(year) {
    var c   = makeCanvas();
    var ctx = c.getContext('2d');
    drawBg(ctx, 0);

    // ── Decorative rings ─────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.arc(W - 80, 380, 300, 0, Math.PI * 2);
    ctx.strokeStyle = CLR.accent1;
    ctx.lineWidth   = 2;
    ctx.globalAlpha = 0.10;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(W - 80, 380, 200, 0, Math.PI * 2);
    ctx.strokeStyle = CLR.accent2;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.14;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(120, H - 360, 240, 0, Math.PI * 2);
    ctx.strokeStyle = CLR.accent2;
    ctx.lineWidth   = 2;
    ctx.globalAlpha = 0.09;
    ctx.stroke();
    ctx.restore();

    // ── Scattered dots ───────────────────────────────────────────────────
    var dotCols  = [CLR.accent1, CLR.accent2, '#34d399', '#f472b6', '#fb923c'];
    var dotSpecs = [
      { x: 820, y: 1380, r: 10 }, { x: 910, y: 1460, r: 6  },
      { x: 760, y: 1500, r: 14 }, { x: 970, y: 1540, r: 5  },
      { x: 850, y: 1600, r: 8  }, { x: 940, y: 1670, r: 11 },
      { x: 790, y: 1720, r: 5  }, { x: 1010, y: 1620, r: 7 },
      { x: 880, y: 1760, r: 9  }, { x: 700, y: 1680, r: 6  }
    ];
    dotSpecs.forEach(function (d, i) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle   = dotCols[i % dotCols.length];
      ctx.globalAlpha = 0.30;
      ctx.fill();
      ctx.restore();
    });

    // ── Year pill badge ──────────────────────────────────────────────────
    var yearStr  = String(year);
    var PILL_CX  = 130;
    var PILL_Y   = 200;
    var PILL_H   = 64;
    ctx.save();
    ctx.font = 'bold 40px Inter, Arial, sans-serif';
    var pillTW = ctx.measureText(yearStr).width;
    var pillW  = pillTW + 56;
    ctx.restore();

    ctx.save();
    roundRect(ctx, PILL_CX - pillW / 2, PILL_Y - PILL_H / 2, pillW, PILL_H, PILL_H / 2);
    ctx.fillStyle   = 'rgba(167,139,250,0.18)';
    ctx.fill();
    ctx.strokeStyle = CLR.accent1;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font      = 'bold 40px Inter, Arial, sans-serif';
    ctx.fillStyle = CLR.accent1;
    ctx.textAlign = 'center';
    ctx.fillText(yearStr, PILL_CX, PILL_Y + 14);
    ctx.restore();

    // ── "YOUR" ───────────────────────────────────────────────────────────
    ctx.save();
    ctx.font      = 'bold 130px Inter, Arial, sans-serif';
    ctx.fillStyle = CLR.white;
    ctx.textAlign = 'left';
    ctx.globalAlpha = 0.92;
    ctx.fillText('YOUR', 60, 640);
    ctx.restore();

    // ── "READING" (gradient) ─────────────────────────────────────────────
    drawGradientText(ctx, 'READING', 60, 800, 148, 'left');

    // ── "WRAPPED" — massive, white ───────────────────────────────────────
    ctx.save();
    ctx.font      = 'bold 172px Inter, Arial, sans-serif';
    ctx.fillStyle = CLR.white;
    ctx.textAlign = 'left';
    ctx.fillText('WRAPPED', 60, 1000);
    ctx.restore();

    // ── Gradient underline beneath WRAPPED ───────────────────────────────
    ctx.save();
    var g = ctx.createLinearGradient(60, 0, 700, 0);
    g.addColorStop(0, CLR.accent1);
    g.addColorStop(1, CLR.accent2);
    ctx.fillStyle   = g;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(60, 1022, 640, 6);
    ctx.restore();

    // ── Tagline ──────────────────────────────────────────────────────────
    ctx.save();
    ctx.font      = '52px Inter, -apple-system, Arial, sans-serif';
    ctx.fillStyle = CLR.muted;
    ctx.textAlign = 'left';
    ctx.fillText('Here\u2019s your year in books.', 60, 1140);
    ctx.restore();

    drawBranding(ctx);
    return c;
  }

  // ── Slide 2 — Overview ───────────────────────────────────────────────────

  function slideOverview(stats, year, booksFinished) {
    var c   = makeCanvas();
    var ctx = c.getContext('2d');
    drawBg(ctx, 1);

    // ── Hero label ───────────────────────────────────────────────────────
    ctx.save();
    ctx.font      = '52px Inter, -apple-system, Arial, sans-serif';
    ctx.fillStyle = CLR.muted;
    ctx.textAlign = 'center';
    ctx.fillText(String(year) + ' in numbers', W / 2, 200);
    ctx.restore();

    // ── Hero stat — total reading time ───────────────────────────────────
    var heroVal = formatDurationLabel(stats.totalMinutes);
    drawGradientText(ctx, heroVal, W / 2, 480, 172, 'center');

    ctx.save();
    ctx.font      = '52px Inter, -apple-system, Arial, sans-serif';
    ctx.fillStyle = CLR.muted;
    ctx.textAlign = 'center';
    ctx.fillText('read this year', W / 2, 560);
    ctx.restore();

    // ── 2×2 card grid ────────────────────────────────────────────────────
    // Card layout: padding 52px on each side, 32px gutter
    var pad   = 52;
    var gutter = 32;
    var cw    = Math.floor((W - pad * 2 - gutter) / 2);
    var ch    = 340;
    var col0  = pad;
    var col1  = pad + cw + gutter;
    var row0  = 680;
    var row1  = row0 + ch + gutter;

    var cards = [
      { value: String(stats.sessionCount),        label: 'Sessions',       icon: '\uD83D\uDCD6' },
      { value: String(booksFinished),             label: 'Books finished', icon: '\u2705' },
      { value: stats.preferredPeriod,             label: 'Fav. period',    icon: '\uD83C\uDF19' },
      { value: String(stats.longestStreak) + 'd', label: 'Best streak',    icon: '\uD83D\uDD25' }
    ];

    var positions = [
      { x: col0, y: row0 },
      { x: col1, y: row0 },
      { x: col0, y: row1 },
      { x: col1, y: row1 }
    ];

    cards.forEach(function (card, i) {
      var px = positions[i].x;
      var py = positions[i].y;

      // Card surface
      ctx.save();
      roundRect(ctx, px, py, cw, ch, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.055)';
      ctx.fill();
      ctx.restore();

      // Icon
      ctx.save();
      ctx.font      = '68px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(card.icon, px + 30, py + 88);
      ctx.restore();

      // Value
      ctx.save();
      ctx.font      = 'bold 88px Inter, -apple-system, Arial, sans-serif';
      ctx.textAlign = 'left';
      var measured  = ctx.measureText(card.value).width;
      var maxW      = cw - 60;
      var fontSize  = measured > maxW ? Math.floor(88 * maxW / measured) : 88;
      ctx.restore();
      drawGradientText(ctx, card.value, px + 30, py + 218, fontSize);

      // Label
      ctx.save();
      ctx.font      = '38px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.muted;
      ctx.textAlign = 'left';
      ctx.fillText(card.label, px + 30, py + 294);
      ctx.restore();
    });

    drawBranding(ctx);
    return c;
  }

  // ── Slide 3 — Top Books ──────────────────────────────────────────────────

  function slideTopBooks(topBooks, allBooksForYear, coverMap, year) {
    var c   = makeCanvas();
    var ctx = c.getContext('2d');
    drawBg(ctx, 2);

    // ── Header ───────────────────────────────────────────────────────────
    ctx.save();
    ctx.font      = '52px Inter, -apple-system, Arial, sans-serif';
    ctx.fillStyle = CLR.muted;
    ctx.textAlign = 'left';
    ctx.fillText(String(year) + '  \u00b7  Top Books', 80, 160);
    ctx.restore();
    drawAccentBar(ctx, 192);

    var max = Math.min(topBooks.length, 5);
    if (!max) { drawBranding(ctx); return c; }

    // ── #1 Hero card ─────────────────────────────────────────────────────
    var hero     = topBooks[0];
    var heroCW   = 220;
    var heroCH   = 330;
    var heroX    = 80;
    var heroY    = 240;

    // Gold glow behind cover
    ctx.save();
    ctx.globalAlpha = 0.22;
    var glow = ctx.createRadialGradient(heroX + heroCW / 2, heroY + heroCH / 2, 0,
                                        heroX + heroCW / 2, heroY + heroCH / 2, heroCW);
    glow.addColorStop(0, CLR.gold);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(heroX - 40, heroY - 40, heroCW + 80, heroCH + 80);
    ctx.restore();

    drawCover(ctx, coverMap[hero.imageId] || null, heroX, heroY, heroCW, heroCH);

    // "#1" rank badge on top-left corner of cover
    ctx.save();
    ctx.font      = 'bold 52px Inter, Arial, sans-serif';
    ctx.fillStyle = CLR.gold;
    ctx.textAlign = 'left';
    ctx.fillText('1', heroX + 12, heroY + 56);
    ctx.restore();

    // Title, author, time — right of cover
    var htx = heroX + heroCW + 40;
    var htw = W - htx - 60;

    ctx.save();
    ctx.font      = 'bold 62px Inter, -apple-system, Arial, sans-serif';
    ctx.fillStyle = CLR.white;
    ctx.textAlign = 'left';
    // Two-line title: try to split naturally
    var titleWords = (hero.title || 'Untitled').split(' ');
    var line1 = '', line2 = '';
    for (var wi = 0; wi < titleWords.length; wi++) {
      var test = line1 ? line1 + ' ' + titleWords[wi] : titleWords[wi];
      if (ctx.measureText(test).width <= htw) {
        line1 = test;
      } else {
        line2 = titleWords.slice(wi).join(' ');
        break;
      }
    }
    ctx.fillText(fitText(ctx, line1, htw), htx, heroY + 80);
    if (line2) { ctx.fillText(fitText(ctx, line2, htw), htx, heroY + 158); }
    ctx.restore();

    if (hero.author) {
      ctx.save();
      ctx.font      = '44px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.muted;
      ctx.textAlign = 'left';
      ctx.fillText(fitText(ctx, hero.author, htw), htx, heroY + (line2 ? 230 : 160));
      ctx.restore();
    }

    drawGradientText(ctx, formatDurationLabel(hero.minutes), htx,
      heroY + (line2 ? 320 : 240), 72);

    // ── Ranks 2–5 list ────────────────────────────────────────────────────
    var listY  = heroY + heroCH + 60;
    var sCW    = 90;
    var sCH    = 135;
    var ROW_H  = 200;

    for (var i = 1; i < max; i++) {
      var book = topBooks[i];
      var ry   = listY + (i - 1) * ROW_H;
      var col  = RANK_COLOURS[i] || CLR.dim;

      // Rank numeral
      ctx.save();
      ctx.font      = 'bold 52px Inter, Arial, sans-serif';
      ctx.fillStyle = col;
      ctx.textAlign = 'right';
      ctx.globalAlpha = 0.85;
      ctx.fillText(String(i + 1), 76, ry + 80);
      ctx.restore();

      // Small cover
      drawCover(ctx, coverMap[book.imageId] || null, 88, ry + 8, sCW, sCH);

      // Text
      var stx = 88 + sCW + 28;
      var stw = W - stx - 60;

      ctx.save();
      ctx.font      = 'bold 52px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.white;
      ctx.textAlign = 'left';
      ctx.fillText(fitText(ctx, book.title || 'Untitled', stw), stx, ry + 60);
      ctx.restore();

      if (book.author) {
        ctx.save();
        ctx.font      = '38px Inter, -apple-system, Arial, sans-serif';
        ctx.fillStyle = CLR.muted;
        ctx.textAlign = 'left';
        ctx.fillText(fitText(ctx, book.author, stw), stx, ry + 110);
        ctx.restore();
      }

      drawGradientText(ctx, formatDurationLabel(book.minutes), stx, ry + 166, 40);
    }

    // ── Cover cloud — remaining books read this year ───────────────────────
    var cloudStart = listY + (max - 1) * ROW_H + 32;
    var remaining  = H - cloudStart - 60;
    if (remaining > 120 && allBooksForYear.length > max) {
      var COLS     = 7;
      var GUTTER   = 14;
      var ccw      = Math.floor((W - 80 * 2 - GUTTER * (COLS - 1)) / COLS);
      var cch      = Math.floor(ccw * 1.5);
      var rowsAvail = Math.max(1, Math.floor((remaining - 16) / (cch + GUTTER)));
      var maxCovers = COLS * rowsAvail;
      var extras   = allBooksForYear.slice(max, max + maxCovers);

      // Faint label
      ctx.save();
      ctx.font      = '34px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.dim;
      ctx.textAlign = 'left';
      ctx.fillText('also read this year', 80, cloudStart + 44);
      ctx.restore();

      var gridTop = cloudStart + 60;
      extras.forEach(function (entry, idx) {
        var col = idx % COLS;
        var row = Math.floor(idx / COLS);
        var ex  = 80 + col * (ccw + GUTTER);
        var ey  = gridTop + row * (cch + GUTTER);
        drawCover(ctx, coverMap[entry.imageId] || null, ex, ey, ccw, cch);
      });
    }

    drawBranding(ctx);
    return c;
  }

  // ── Slide 4 — Top Authors ────────────────────────────────────────────────

  function slideTopAuthors(topAuthors, year) {
    var c   = makeCanvas();
    var ctx = c.getContext('2d');
    drawBg(ctx, 3);

    drawSectionHeader(ctx, year + ' \u00b7 Top Authors', 210);

    var ROW_H  = 154;
    var startY = 310;
    var max    = Math.min(topAuthors.length, 10);

    for (var i = 0; i < max; i++) {
      var a  = topAuthors[i];
      var ry = startY + i * ROW_H;

      // Rank badge
      ctx.save();
      ctx.beginPath();
      ctx.arc(80, ry + 46, 38, 0, Math.PI * 2);
      ctx.fillStyle   = RANK_COLOURS[i] || CLR.dim;
      ctx.globalAlpha = 0.14;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.font      = 'bold 44px Inter, Arial, sans-serif';
      ctx.fillStyle = RANK_COLOURS[i] || CLR.dim;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), 80, ry + 62);
      ctx.restore();

      ctx.save();
      ctx.font      = 'bold 46px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.white;
      ctx.textAlign = 'left';
      ctx.fillText(fitText(ctx, a.author, W - 220), 148, ry + 42);
      ctx.restore();

      ctx.save();
      ctx.font      = '34px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.muted;
      ctx.textAlign = 'left';
      ctx.fillText(
        a.bookCount + (a.bookCount === 1 ? ' book' : ' books') + '  \u00b7  ' + formatDurationLabel(a.minutes),
        148, ry + 96
      );
      ctx.restore();

      if (i < max - 1) { drawDivider(ctx, ry + ROW_H - 4); }
    }

    drawBranding(ctx);
    return c;
  }

  // ── Slide 5 — Habits ─────────────────────────────────────────────────────

  function slideHabits(stats, year) {
    var c   = makeCanvas();
    var ctx = c.getContext('2d');
    drawBg(ctx, 4);

    drawSectionHeader(ctx, year + ' \u00b7 Reading Habits', 210);

    var habits = [
      { icon: '\uD83C\uDF19', label: 'Favourite time to read', value: stats.preferredPeriod, sub: null },
      { icon: '\uD83D\uDD52', label: 'Average session',        value: formatDurationLabel(stats.averageMinutes), sub: null },
      { icon: '\uD83C\uDFC6', label: 'Longest session',        value: formatDurationLabel(stats.longestMinutes), sub: stats.longestBookTitle },
      { icon: '\uD83D\uDCC5', label: 'Avg time per day',       value: formatDurationLabel(stats.averageMinutesPerDay), sub: null }
    ];

    var startY   = 370;
    var baseGap  = 372;
    var subExtra = 80; // extra pixels below items that have a subtitle
    var curY     = startY;

    habits.forEach(function (h, i) {
      var y = curY;

      ctx.save();
      ctx.font      = '74px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(h.icon, 80, y + 18);
      ctx.restore();

      ctx.save();
      ctx.font      = '42px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.dim;
      ctx.textAlign = 'left';
      ctx.fillText(h.label, 80, y + 88);
      ctx.restore();

      drawGradientText(ctx, h.value, 80, y + 208, 96);

      if (h.sub) {
        ctx.save();
        ctx.font      = '38px Inter, -apple-system, Arial, sans-serif';
        ctx.fillStyle = CLR.muted;
        ctx.textAlign = 'left';
        ctx.fillText(fitText(ctx, h.sub, W - 160), 80, y + 270);
        ctx.restore();
      }

      curY += baseGap + (h.sub ? subExtra : 0);
    });

    drawBranding(ctx);
    return c;
  }

  // ── Slide 6 — Streaks ────────────────────────────────────────────────────

  function slideStreaks(stats, topStreaks, year) {
    var c   = makeCanvas();
    var ctx = c.getContext('2d');
    drawBg(ctx, 5);

    drawSectionHeader(ctx, year + ' \u00b7 Consistency', 210);

    // ── Hero: longest streak ─────────────────────────────────────────────
    ctx.save();
    ctx.font      = '52px Inter, -apple-system, Arial, sans-serif';
    ctx.fillStyle = CLR.muted;
    ctx.textAlign = 'center';
    ctx.fillText('Longest streak', W / 2, 370);
    ctx.restore();

    drawGradientText(ctx, String(stats.longestStreak), W / 2, 640, 240, 'center');

    ctx.save();
    ctx.font      = 'bold 64px Inter, -apple-system, Arial, sans-serif';
    ctx.fillStyle = CLR.white;
    ctx.textAlign = 'center';
    ctx.fillText('days in a row', W / 2, 730);
    ctx.restore();

    // ── Top-5 streak list ────────────────────────────────────────────────
    var LIST_TOP = 840;
    var ROW_H    = 176;

    topStreaks.forEach(function (streak, i) {
      var ry  = LIST_TOP + i * ROW_H;
      var col = RANK_COLOURS[i] || CLR.dim;

      // Rank circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(80, ry + 44, 36, 0, Math.PI * 2);
      ctx.fillStyle   = col;
      ctx.globalAlpha = 0.14;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.font      = 'bold 40px Inter, Arial, sans-serif';
      ctx.fillStyle = col;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), 80, ry + 58);
      ctx.restore();

      // Day count
      drawGradientText(ctx, String(streak.days) + ' days', 148, ry + 62, 56);

      // Date range
      var fmt = function (d) {
        var parts = d.split('-');
        var months = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10);
      };
      ctx.save();
      ctx.font      = '36px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.muted;
      ctx.textAlign = 'left';
      ctx.fillText(fmt(streak.start) + ' \u2013 ' + fmt(streak.end), 148, ry + 116);
      ctx.restore();
    });

    // ── Bottom metrics ────────────────────────────────────────────────────
    var metY = LIST_TOP + 5 * ROW_H + 60;
    var bCols = [
      { x: W / 4,       value: String(stats.sessionCount),                              label: 'Sessions'    },
      { x: (3 * W) / 4, value: formatDurationLabel(Math.round(stats.averageMinutes)),   label: 'Avg session' }
    ];
    bCols.forEach(function (col) {
      drawGradientText(ctx, col.value, col.x, metY, 72, 'center');
      ctx.save();
      ctx.font      = '40px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.muted;
      ctx.textAlign = 'center';
      ctx.fillText(col.label, col.x, metY + 58);
      ctx.restore();
    });

    drawBranding(ctx);
    return c;
  }

  // ── Slide 7 — Vocabulary ──────────────────────────────────────────────────

  function slideVocabulary(hlStats, year) {
    var c   = makeCanvas();
    var ctx = c.getContext('2d');
    drawBg(ctx, 6);

    drawSectionHeader(ctx, year + ' \u00b7 Vocabulary', 210);

    // ── Words ──
    ctx.save();
    ctx.font      = '52px Inter, -apple-system, Arial, sans-serif';
    ctx.fillStyle = CLR.muted;
    ctx.textAlign = 'left';
    ctx.fillText('New words saved', 80, 390);
    ctx.restore();

    drawGradientText(ctx, String(hlStats.wordCount), 80, 560, 160);

    var lwY = 640;
    var swY = lwY + 310;

    if (hlStats.longestWord) {
      ctx.save();
      ctx.font      = '40px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.dim;
      ctx.textAlign = 'left';
      ctx.fillText('Longest word', 80, lwY + 52);
      ctx.restore();

      ctx.save();
      ctx.font = 'bold 72px Inter, -apple-system, Arial, sans-serif';
      var lwFitted = fitText(ctx, hlStats.longestWord, W - 160);
      ctx.restore();
      drawGradientText(ctx, lwFitted, 80, lwY + 160, 72);

      ctx.save();
      ctx.font      = '36px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.dim;
      ctx.textAlign = 'left';
      ctx.fillText(hlStats.longestWord.length + ' characters', 80, lwY + 220);
      ctx.restore();
    }

    if (hlStats.shortestWord) {
      ctx.save();
      ctx.font      = '40px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.dim;
      ctx.textAlign = 'left';
      ctx.fillText('Shortest word', 80, swY + 52);
      ctx.restore();

      ctx.save();
      ctx.font = 'bold 72px Inter, -apple-system, Arial, sans-serif';
      var swFitted = fitText(ctx, hlStats.shortestWord, W - 160);
      ctx.restore();
      drawGradientText(ctx, swFitted, 80, swY + 160, 72);

      ctx.save();
      ctx.font      = '36px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.dim;
      ctx.textAlign = 'left';
      ctx.fillText(hlStats.shortestWord.length + ' characters', 80, swY + 220);
      ctx.restore();
    }

    drawDivider(ctx, swY + 280);

    // ── Quotes ──
    var qY = swY + 360;

    ctx.save();
    ctx.font      = '52px Inter, -apple-system, Arial, sans-serif';
    ctx.fillStyle = CLR.muted;
    ctx.textAlign = 'left';
    ctx.fillText('Quotes saved', 80, qY);
    ctx.restore();

    drawGradientText(ctx, String(hlStats.quoteCount), 80, qY + 190, 160);

    drawBranding(ctx);
    return c;
  }

  // ── Slide 8 — Recap ──────────────────────────────────────────────────────

  function slideHighlights(stats, year, booksFinished, totalBooks) {
    var c   = makeCanvas();
    var ctx = c.getContext('2d');
    drawBg(ctx, 7);

    drawSectionHeader(ctx, year + ' \u00b7 Year Recap', 210);

    var items = [
      { label: 'Total reading time',  value: formatDurationLabel(stats.totalMinutes) },
      { label: 'Total sessions',      value: String(stats.sessionCount) },
      { label: 'Books finished',      value: String(booksFinished) },
      { label: 'Longest streak',      value: String(stats.longestStreak) + ' days' },
      { label: 'Page turns',          value: String(stats.totalPageTurns) }
    ];

    var startY = 340;
    var gap    = 300;

    items.forEach(function (item, i) {
      var y = startY + i * gap;

      ctx.save();
      ctx.font      = '48px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.dim;
      ctx.textAlign = 'left';
      ctx.fillText(item.label, 80, y);
      ctx.restore();

      drawGradientText(ctx, item.value, 80, y + 96, 88);

      if (i < items.length - 1) { drawDivider(ctx, y + 148); }
    });

    drawBranding(ctx);
    return c;
  }

  // ── Slide — Quotes Collage ────────────────────────────────────────────────

  function slideQuotes(hlStats, year) {
    var c   = makeCanvas();
    var ctx = c.getContext('2d');
    drawBg(ctx, 11);

    var quotes = (hlStats.quotes || []).slice();

    if (!quotes.length) {
      ctx.save();
      ctx.font      = '52px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.muted;
      ctx.textAlign = 'center';
      ctx.fillText('No quotes saved this year', W / 2, H / 2);
      ctx.restore();
      drawBranding(ctx);
      return c;
    }

    // Shuffle quotes with a seeded sequence so output is reproducible
    var rng = (function () {
      var s = 0xdeadbeef + year;
      return function () {
        s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
        s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
        s ^= s >>> 16;
        return (s >>> 0) / 0xffffffff;
      };
    })();
    quotes = quotes.slice().sort(function () { return rng() - 0.5; });

    var FONTS = [
      'Georgia, "Times New Roman", serif',
      'Inter, -apple-system, Arial, sans-serif',
      '"Palatino Linotype", Palatino, serif',
      '"Courier New", Courier, monospace',
      'Inter, -apple-system, Arial, sans-serif'
    ];
    var WEIGHTS = ['normal', 'bold', 'normal', 'bold', '300'];
    var PALETTE = [
      'rgba(167,139,250,VAL)',   // accent1
      'rgba(96,165,250,VAL)',    // accent2
      'rgba(255,255,255,VAL)',   // white
      'rgba(52,211,153,VAL)',    // green
      'rgba(244,114,182,VAL)',   // pink
      'rgba(251,191,36,VAL)',    // gold
      'rgba(156,163,175,VAL)'    // muted
    ];

    // Slightly expand canvas drawing area so text can bleed off edges
    var BLEED = 80;
    var drawW  = W + BLEED * 2;
    var drawH  = H + BLEED * 2;

    var placed = []; // {x,y,w,h} rects in canvas space

    function overlaps(bx, by, bw, bh) {
      for (var k = 0; k < placed.length; k++) {
        var p = placed[k];
        var PAD = 6;
        if (bx < p.x + p.w + PAD && bx + bw > p.x - PAD &&
            by < p.y + p.h + PAD && by + bh > p.y - PAD) { return true; }
      }
      return false;
    }

    // Truncate long quotes to a reasonable snippet
    function snippet(text) {
      var t = text.trim().replace(/\s+/g, ' ');
      if (t.length <= 100) { return t; }
      // Cut at word boundary
      var cut = t.slice(0, 100);
      var last = cut.lastIndexOf(' ');
      return (last > 50 ? cut.slice(0, last) : cut) + '\u2026';
    }

    // Break a snippet into wrapped lines given a max pixel width
    function wrapLines(ctx, text, maxW) {
      var words = text.split(' ');
      var lines = [];
      var cur   = '';
      words.forEach(function (w) {
        var test = cur ? cur + ' ' + w : w;
        if (ctx.measureText(test).width <= maxW) {
          cur = test;
        } else {
          if (cur) { lines.push(cur); }
          cur = w;
        }
      });
      if (cur) { lines.push(cur); }
      return lines;
    }

    var placed_count = 0;
    var MAX_PLACED   = Math.min(quotes.length, 60);
    var attempts     = 0;
    var MAX_ATTEMPTS = MAX_PLACED * 30;

    while (placed_count < MAX_PLACED && attempts < MAX_ATTEMPTS) {
      attempts++;
      var qi     = placed_count % quotes.length;
      var q      = snippet(quotes[qi]);
      var fi     = Math.floor(rng() * FONTS.length);
      var size   = Math.round(22 + rng() * 52); // 22–74px
      var isVert = rng() < 0.28; // ~28% rotated 90°
      var angle  = isVert
        ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2)
        : (rng() - 0.5) * 0.18; // slight skew for horizontal
      var maxLineW = isVert
        ? Math.round(80 + rng() * 320)  // short lines when vertical
        : Math.round(260 + rng() * 620); // wider lines horizontal

      ctx.save();
      ctx.font = WEIGHTS[fi] + ' ' + size + 'px ' + FONTS[fi];
      var lines   = wrapLines(ctx, q, maxLineW);
      var lineH   = size * 1.35;
      var blockW  = lines.reduce(function (m, l) { return Math.max(m, ctx.measureText(l).width); }, 0);
      var blockH  = lines.length * lineH;
      ctx.restore();

      // Bounding box after rotation (approximate using diagonal)
      var diag = Math.sqrt(blockW * blockW + blockH * blockH);
      var bw   = isVert ? blockH : (Math.cos(Math.abs(angle)) * blockW + Math.sin(Math.abs(angle)) * blockH);
      var bh   = isVert ? blockW : (Math.sin(Math.abs(angle)) * blockW + Math.cos(Math.abs(angle)) * blockH);

      // Random placement — allow slight overflow on all sides
      var px = Math.round(-BLEED + rng() * (W + BLEED));
      var py = Math.round(-BLEED + rng() * (H + BLEED));

      if (overlaps(px - bw / 2, py - bh / 2, bw, bh)) { continue; }
      placed.push({ x: px - bw / 2, y: py - bh / 2, w: bw, h: bh });

      // Pick colour — deeper alpha for background-ish quotes, stronger for foreground
      var depthAlpha = 0.18 + rng() * 0.72;
      var colTemplate = PALETTE[Math.floor(rng() * PALETTE.length)];
      var col = colTemplate.replace('VAL', depthAlpha.toFixed(2));

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.font        = WEIGHTS[fi] + ' ' + size + 'px ' + FONTS[fi];
      ctx.fillStyle   = col;
      ctx.textAlign   = 'left';
      ctx.textBaseline = 'top';
      lines.forEach(function (line, li) {
        ctx.fillText(line, -blockW / 2, -blockH / 2 + li * lineH);
      });
      ctx.restore();

      placed_count++;
    }

    // Overlay: faint gradient vignette so edges feel intentional
    ctx.save();
    var vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Label — centred, semi-transparent, on top of everything
    ctx.save();
    ctx.font      = 'bold 44px Inter, -apple-system, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.textAlign = 'center';
    ctx.fillText(String(year) + '  \u00b7  your quotes', W / 2, H - 80);
    ctx.restore();

    drawBranding(ctx);
    return c;
  }

  // ── Slide — Words Cloud ───────────────────────────────────────────────────

  function slideWordsCloud(hlStats, year) {
    var c   = makeCanvas();
    var ctx = c.getContext('2d');
    drawBg(ctx, 10);

    drawSectionHeader(ctx, year + ' \u00b7 New Words', 210);

    var allWords = hlStats.words || [];

    if (!allWords.length) {
      ctx.save();
      ctx.font      = '52px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.muted;
      ctx.textAlign = 'center';
      ctx.fillText('No words saved this year', W / 2, H / 2);
      ctx.restore();
      drawBranding(ctx);
      return c;
    }

    // Count frequency of each unique word (case-insensitive)
    var freq = {};
    allWords.forEach(function (w) {
      var key = w.toLowerCase();
      freq[key] = { word: w, count: (freq[key] ? freq[key].count : 0) + 1 };
    });
    var wordList = Object.keys(freq).map(function (k) { return freq[k]; })
      .sort(function (a, b) { return b.count - a.count || a.word.localeCompare(b.word); });

    var CLOUD_PALETTE = [
      CLR.accent1, CLR.accent2, '#34d399', '#f472b6',
      '#fb923c', '#facc15', '#22d3ee', '#c084fc', '#f87171', '#a3e635'
    ];

    var words   = wordList.slice(0, 120);
    var maxCnt  = words[0].count;
    var minCnt  = words[words.length - 1].count;
    var CLOUD_TOP = 270;
    var CX = W / 2;
    var CY = CLOUD_TOP + (H - CLOUD_TOP - 60) / 2;

    function fontSize(count) {
      var t = maxCnt === minCnt ? 1 : (count - minCnt) / (maxCnt - minCnt);
      return Math.round(30 + t * 90); // 30px … 120px
    }

    var placed = [];
    function overlaps(r) {
      for (var k = 0; k < placed.length; k++) {
        var p = placed[k];
        if (r.x < p.x + p.w && r.x + r.w > p.x &&
            r.y < p.y + p.h && r.y + r.h > p.y) { return true; }
      }
      return false;
    }

    function tryPlace(word, count) {
      var fs   = fontSize(count);
      ctx.font = 'bold ' + fs + 'px Inter, -apple-system, Arial, sans-serif';
      var tw   = ctx.measureText(word).width;
      var th   = fs * 1.2;
      var PAD  = 10;
      var b    = 18;
      for (var step = 0; step < 1000; step++) {
        var angle = 0.15 * step;
        var r     = b * angle;
        var rx    = CX + r * Math.cos(angle) - tw / 2;
        var ry    = CY + r * Math.sin(angle) * 0.52 - th / 2;
        var box   = { x: rx - PAD, y: ry - PAD, w: tw + PAD * 2, h: th + PAD * 2 };
        if (box.x < 40 || box.x + box.w > W - 40 ||
            box.y < CLOUD_TOP || box.y + box.h > H - 60) { continue; }
        if (!overlaps(box)) {
          placed.push(box);
          return { x: rx, y: ry + fs * 0.8, fs: fs };
        }
      }
      return null;
    }

    words.forEach(function (item, i) {
      var pos = tryPlace(item.word, item.count);
      if (!pos) { return; }
      var col = CLOUD_PALETTE[i % CLOUD_PALETTE.length];
      ctx.save();
      ctx.font        = 'bold ' + pos.fs + 'px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle   = col;
      ctx.globalAlpha = 0.50 + 0.50 * ((item.count - minCnt) / (maxCnt - minCnt + 1));
      ctx.textAlign   = 'left';
      ctx.fillText(item.word, pos.x, pos.y);
      ctx.restore();
    });

    drawBranding(ctx);
    return c;
  }

  // ── Genre fetching (Open Library) ─────────────────────────────────────────

  function fetchGenresForYear(allBooksForYear, bookMap) {
    var booksWithIsbn = allBooksForYear.map(function (entry) {
      var b = bookMap[entry.bookId];
      return { bookId: entry.bookId, minutes: entry.minutes, isbn: b ? (b.isbn13 || null) : null };
    }).filter(function (item) { return item.isbn; });

    if (!booksWithIsbn.length) { return Promise.resolve({}); }

    var BATCH = 20;
    var batches = [];
    for (var i = 0; i < booksWithIsbn.length; i += BATCH) {
      batches.push(booksWithIsbn.slice(i, i + BATCH));
    }

    var genreMap = {}; // isbn -> subjects[]

    var fetchBatch = function (batch) {
      var bibkeys = batch.map(function (item) { return 'ISBN:' + item.isbn; }).join(',');
      var url = 'https://openlibrary.org/api/books?bibkeys=' +
        encodeURIComponent(bibkeys) + '&format=json&jscmd=data';
      return fetch(url)
        .then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (data) {
          batch.forEach(function (item) {
            var bookData = data['ISBN:' + item.isbn];
            if (bookData && Array.isArray(bookData.subjects)) {
              genreMap[item.isbn] = bookData.subjects
                .map(function (s) { return typeof s === 'string' ? s : (s.name || ''); })
                .filter(Boolean);
            }
          });
        })
        .catch(function () {});
    };

    return batches.reduce(function (chain, batch) {
      return chain.then(function () { return fetchBatch(batch); });
    }, Promise.resolve()).then(function () { return genreMap; });
  }

  function computeGenreStats(allBooksForYear, bookMap, genreMap) {
    var counts = {};
    allBooksForYear.forEach(function (entry) {
      var b = bookMap[entry.bookId];
      if (!b || !b.isbn13) { return; }
      var subjects = genreMap[b.isbn13] || [];
      subjects.forEach(function (subject) {
        var key = subject.trim();
        if (!key) { return; }
        var norm = key.toLowerCase();
        if (!counts[norm]) { counts[norm] = { subject: key, count: 0, minutes: 0 }; }
        counts[norm].count++;
        counts[norm].minutes += entry.minutes;
      });
    });
    return Object.keys(counts).map(function (k) { return counts[k]; })
      .sort(function (a, b) { return b.count - a.count || b.minutes - a.minutes; });
  }

  // ── Slide — Top Genres ───────────────────────────────────────────────────

  function slideGenres(genreStats, year) {
    var c   = makeCanvas();
    var ctx = c.getContext('2d');
    drawBg(ctx, 8);

    drawSectionHeader(ctx, year + ' \u00b7 Genres', 210);

    if (!genreStats.length) {
      ctx.save();
      ctx.font      = '52px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.muted;
      ctx.textAlign = 'center';
      ctx.fillText('No ISBN data available', W / 2, H / 2);
      ctx.restore();
      drawBranding(ctx);
      return c;
    }

    var top       = genreStats.slice(0, 10);
    var maxCount  = top[0].count;
    var BAR_LEFT  = 80;
    var BAR_MAX_W = W - BAR_LEFT - 80;
    var startY    = 320;
    var ROW_H     = 150;
    var BAR_H     = 52;

    top.forEach(function (genre, i) {
      var ry      = startY + i * ROW_H;
      var barW    = Math.max(8, Math.round((genre.count / maxCount) * BAR_MAX_W));

      // Bar background
      ctx.save();
      roundRect(ctx, BAR_LEFT, ry + 60, BAR_MAX_W, BAR_H, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fill();
      ctx.restore();

      // Bar fill
      ctx.save();
      roundRect(ctx, BAR_LEFT, ry + 60, barW, BAR_H, 10);
      ctx.fillStyle = accentGrad(ctx, BAR_LEFT, BAR_LEFT + barW, ry + 60);
      ctx.globalAlpha = 0.75;
      ctx.fill();
      ctx.restore();

      // Genre label
      ctx.save();
      ctx.font      = '44px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.white;
      ctx.textAlign = 'left';
      ctx.fillText(fitText(ctx, genre.subject, BAR_MAX_W - 120), BAR_LEFT, ry + 48);
      ctx.restore();

      // Count badge
      ctx.save();
      ctx.font      = 'bold 40px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.muted;
      ctx.textAlign = 'right';
      ctx.fillText(String(genre.count) + (genre.count === 1 ? ' book' : ' books'),
        W - 80, ry + 48);
      ctx.restore();
    });

    drawBranding(ctx);
    return c;
  }

  // ── Slide — Word Cloud ───────────────────────────────────────────────────

  function slideWordCloud(genreStats, year) {
    var c   = makeCanvas();
    var ctx = c.getContext('2d');
    drawBg(ctx, 9);

    drawSectionHeader(ctx, year + ' \u00b7 Themes & Genres', 210);

    if (!genreStats.length) {
      ctx.save();
      ctx.font      = '52px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = CLR.muted;
      ctx.textAlign = 'center';
      ctx.fillText('No ISBN data available', W / 2, H / 2);
      ctx.restore();
      drawBranding(ctx);
      return c;
    }

    var CLOUD_PALETTE = [
      CLR.accent1, CLR.accent2, '#34d399', '#f472b6',
      '#fb923c', '#facc15', '#22d3ee', '#c084fc', '#f87171', '#a3e635'
    ];

    var words  = genreStats.slice(0, 60);
    var maxCnt = words[0].count;
    var minCnt = words[words.length - 1].count;
    var CLOUD_TOP = 270;
    var CX = W / 2;
    var CY = CLOUD_TOP + (H - CLOUD_TOP - 60) / 2;

    // Map count → font size
    function fontSize(count) {
      var t = maxCnt === minCnt ? 1 : (count - minCnt) / (maxCnt - minCnt);
      return Math.round(34 + t * 80); // 34px … 114px
    }

    // Placed bounding boxes for collision
    var placed = [];

    function overlaps(r) {
      for (var k = 0; k < placed.length; k++) {
        var p = placed[k];
        if (r.x < p.x + p.w && r.x + r.w > p.x &&
            r.y < p.y + p.h && r.y + r.h > p.y) { return true; }
      }
      return false;
    }

    function tryPlace(word, count) {
      var fs     = fontSize(count);
      ctx.font   = 'bold ' + fs + 'px Inter, -apple-system, Arial, sans-serif';
      var tw     = ctx.measureText(word).width;
      var th     = fs * 1.2;
      var PAD    = 12;

      // Archimedean spiral
      var a = 0, b = 18;
      for (var step = 0; step < 800; step++) {
        var angle = 0.15 * step;
        var r     = b * angle;
        var rx    = CX + r * Math.cos(angle) - tw / 2;
        var ry    = CY + r * Math.sin(angle) * 0.55 - th / 2;
        var box   = { x: rx - PAD, y: ry - PAD, w: tw + PAD * 2, h: th + PAD * 2 };

        // Keep within canvas
        if (box.x < 40 || box.x + box.w > W - 40 ||
            box.y < CLOUD_TOP || box.y + box.h > H - 60) { continue; }

        if (!overlaps(box)) {
          placed.push(box);
          return { x: rx, y: ry + fs * 0.8, fs: fs };
        }
      }
      return null;
    }

    words.forEach(function (genre, i) {
      var pos = tryPlace(genre.subject, genre.count);
      if (!pos) { return; }
      var col = CLOUD_PALETTE[i % CLOUD_PALETTE.length];
      ctx.save();
      ctx.font      = 'bold ' + pos.fs + 'px Inter, -apple-system, Arial, sans-serif';
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.55 + 0.45 * ((genre.count - minCnt) / (maxCnt - minCnt + 1));
      ctx.textAlign = 'left';
      ctx.fillText(genre.subject, pos.x, pos.y);
      ctx.restore();
    });

    drawBranding(ctx);
    return c;
  }

  // ── Orchestrator ─────────────────────────────────────────────────────────

  function generateWrapped(books, year, onProgress) {
    var bookMap     = {};
    books.forEach(function (b) { bookMap[b.id] = b; });

    var allSessions = collectSessions(books);

    // Filter to sessions that overlap the selected year
    var yearStart = new Date(year, 0, 1);
    var yearEnd   = new Date(year + 1, 0, 1);
    var yearSessions = allSessions.filter(function (s) {
      return s.start < yearEnd && s.end > yearStart;
    });

    var stats        = computeGeneralStats(books, yearSessions, 5);
    var booksFinished = countFinishedInYear(books, year);

    var topBooks = computeBookMinutesByYear(allSessions, year)
      .filter(function (e) { return e.minutes > 0; })
      .sort(function (a, b) { return b.minutes - a.minutes; })
      .map(function (entry) {
        var b = bookMap[entry.bookId];
        return Object.assign({}, entry, { author: b ? (b.author || null) : null });
      });

    var allBooksForYear = topBooks.slice(); // already all books with time > 0 this year
    var top5Books = topBooks.slice(0, 5);

    var topAuthors = computeAuthorsByYear(allSessions, year, bookMap).slice(0, 10);
    var hlStats     = computeHighlightsStats(books, year);
    var topStreaks   = computeTopStreaks(yearSessions, year);

    onProgress('Loading covers\u2026', 15);

    // Derive cover base path relative to the current page (wrapped/index.html → ../covers/)
    var coverBase = '../covers/';

    return loadCovers(allBooksForYear, coverBase).then(function (coverMap) {
      onProgress('Fetching genres\u2026', 50);
      return fetchGenresForYear(allBooksForYear, bookMap).then(function (genreMap) {
        var genreStats = computeGenreStats(allBooksForYear, bookMap, genreMap);
        onProgress('Rendering slides\u2026', 70);

        var slides = [
          { name: '01-intro.png',       canvas: slideIntro(year) },
          { name: '02-overview.png',    canvas: slideOverview(stats, year, booksFinished) },
          { name: '03-top-books.png',   canvas: slideTopBooks(top5Books, allBooksForYear, coverMap, year) },
          { name: '04-top-authors.png', canvas: slideTopAuthors(topAuthors, year) },
          { name: '05-habits.png',      canvas: slideHabits(stats, year) },
          { name: '06-streaks.png',     canvas: slideStreaks(stats, topStreaks, year) },
          { name: '07-vocabulary.png',  canvas: slideVocabulary(hlStats, year) },
          { name: '08-quotes.png',      canvas: slideQuotes(hlStats, year) },
          { name: '09-words-cloud.png', canvas: slideWordsCloud(hlStats, year) },
          { name: '10-genres.png',      canvas: slideGenres(genreStats, year) },
          { name: '11-wordcloud.png',   canvas: slideWordCloud(genreStats, year) }
        ];

        onProgress('Done', 100);
        return slides;
      });
    });
  }

  // ── UI ───────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {

    var yearSelect      = document.getElementById('wrapped-year');
    var generateBtn     = document.getElementById('wrapped-generate');
    var progressWrap    = document.getElementById('wrapped-progress');
    var progressEl      = document.getElementById('wrapped-progress-bar');
    var progressLabel   = document.getElementById('wrapped-progress-label');
    var previewGrid     = document.getElementById('wrapped-preview');
    var downloadAllBtn  = document.getElementById('wrapped-download-all');
    var fileInput       = document.getElementById('wrapped-file');
    var loadFileBtn     = document.getElementById('wrapped-load-file');
    var dataStatus      = document.getElementById('wrapped-data-status');

    if (!yearSelect) { return; } // not on the wrapped page

    var currentLibrary = null;

    function setProgress(label, pct) {
      if (progressLabel) { progressLabel.textContent = label; }
      if (progressEl)    { progressEl.value = pct; }
    }

    function populateYears(library) {
      var allSessions = collectSessions(library.books);
      var years = getAvailableYears(allSessions).slice().reverse(); // newest first
      yearSelect.innerHTML = years.map(function (y) {
        return '<option value="' + y + '">' + y + '</option>';
      }).join('');
      yearSelect.disabled  = years.length === 0;
      generateBtn.disabled = years.length === 0;
      if (dataStatus) {
        dataStatus.textContent = library.books.length + ' books loaded';
        dataStatus.className   = 'wrapped-status wrapped-status--ok';
      }
    }

    function ingestRaw(raw) {
      try {
        var lib = normalizeLibrary(raw);
        currentLibrary = lib;
        populateYears(lib);
      } catch (e) {
        if (dataStatus) {
          dataStatus.textContent = 'Failed to parse data: ' + e.message;
          dataStatus.className   = 'wrapped-status wrapped-status--err';
        }
      }
    }

    // Default: try to load ../data.json relative to wrapped/
    (function () {
      fetch('../data.json')
        .then(function (r) {
          if (!r.ok) { throw new Error('HTTP ' + r.status); }
          return r.json();
        })
        .then(function (raw) { ingestRaw(raw); })
        .catch(function () {
          if (dataStatus) {
            dataStatus.textContent = 'No data loaded — upload a data.json file below.';
          }
        });
    }());

    // File upload
    if (loadFileBtn) {
      loadFileBtn.addEventListener('click', function () {
        var file = fileInput && fileInput.files[0];
        if (!file) { alert('Choose a JSON file first.'); return; }
        var reader = new FileReader();
        reader.onload = function (e) {
          try {
            ingestRaw(JSON.parse(e.target.result));
          } catch (ex) {
            alert('Invalid JSON: ' + ex.message);
          }
        };
        reader.readAsText(file);
      });
    }

    // Generate
    generateBtn.addEventListener('click', function () {
      if (!currentLibrary) { return; }
      var year = parseInt(yearSelect.value, 10);
      if (!year) { return; }

      generateBtn.disabled    = true;
      progressWrap.style.display = 'block';
      previewGrid.innerHTML   = '';
      if (downloadAllBtn) { downloadAllBtn.style.display = 'none'; }

      setProgress('Starting\u2026', 0);

      generateWrapped(currentLibrary.books, year, setProgress)
        .then(function (slides) {
          slides.forEach(function (slide) {
            var dataUrl = slide.canvas.toDataURL('image/png');

            var item = document.createElement('div');
            item.className = 'wrapped-preview-item';

            var thumb = document.createElement('img');
            thumb.src = dataUrl;
            thumb.alt = slide.name;

            var link = document.createElement('a');
            link.href     = dataUrl;
            link.download = 'wrapped-' + slide.name;
            link.className = 'btn wrapped-dl-btn';
            link.textContent = '\u2193 Download';

            var label = document.createElement('span');
            label.className = 'wrapped-slide-name';
            label.textContent = slide.name.replace(/^\d+-/, '').replace('.png', '');

            item.appendChild(thumb);
            item.appendChild(label);
            item.appendChild(link);
            previewGrid.appendChild(item);
          });

          // ZIP via JSZip (CDN-loaded)
          if (typeof JSZip !== 'undefined' && downloadAllBtn) {
            var zip = new JSZip();
            slides.forEach(function (slide) {
              var base64 = slide.canvas.toDataURL('image/png')
                .replace(/^data:image\/png;base64,/, '');
              zip.file('wrapped-' + year + '/' + slide.name, base64, { base64: true });
            });
            zip.generateAsync({ type: 'blob' }).then(function (blob) {
              var url = URL.createObjectURL(blob);
              downloadAllBtn.href     = url;
              downloadAllBtn.download = 'wrapped-' + year + '.zip';
              downloadAllBtn.style.display = 'inline-flex';
            });
          }

          generateBtn.disabled       = false;
          progressWrap.style.display = 'none';
        })
        .catch(function (err) {
          alert('Error generating Wrapped: ' + err.message);
          generateBtn.disabled       = false;
          progressWrap.style.display = 'none';
        });
    });
  });

}());
