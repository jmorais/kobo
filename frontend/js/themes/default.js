/* Default theme — preserves the original Wrapped look (dark navy/purple
   gradient base, procedural radial accent glows). The drawBackground body
   is the pre-refactor drawBg from wrapped.js, lifted verbatim with W/H/seed
   passed in as parameters instead of captured from the IIFE. */

(function () {
  'use strict';
  window.WrappedThemes = window.WrappedThemes || {};

  window.WrappedThemes['default'] = {
    id: 'default',
    name: 'Default',
    colors: {
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
    },
    rankColors: ['#fbbf24', '#9ca3af', '#cd7f32', '#a78bfa', '#60a5fa'],
    // fonts omitted — falls through to defaultFonts() in wrapped.js (Inter stack).

    drawBackground: function (ctx, W, H, seed) {
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
        ['#100c1a', '#160c22']  // near-black indigo
      ];

      // Curated glow accent colours
      var GLOWS = [
        '#a78bfa', '#60a5fa', '#34d399', '#f472b6',
        '#fb923c', '#facc15', '#22d3ee', '#c084fc',
        '#f87171', '#a3e635', '#818cf8', '#2dd4bf'
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
  };
}());
