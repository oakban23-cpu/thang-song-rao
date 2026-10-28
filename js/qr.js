/* A QR code for a short text (the link a phone opens to become a pad): byte mode, error correction level M (a smudge
   or a glare on the screen still reads), the smallest version from 1 to 20 that fits, and the mask that reads best.
   No page needed. QR.make(text, mask?) gives { size, version, mask, dark(x, y) } or null when the text is too long;
   QR.path(q, quiet) gives an SVG path of the dark modules (one unit per module, the quiet zone around it). */
const QR = (() => {
  'use strict';
  // error correction codewords per block and the number of blocks, level M, versions 1..20
  const ECC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26];
  const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16];
  const MAXV = 20;
  // modules left for data and error correction once the fixed patterns are drawn
  function rawModules(v) {
    let n = (16 * v + 128) * v + 64;
    if (v >= 2) { const a = Math.floor(v / 7) + 2; n -= (25 * a - 10) * a - 55; if (v >= 7) n -= 36; }
    return n;
  }
  const dataCodewords = v => Math.floor(rawModules(v) / 8) - ECC[v] * BLOCKS[v];
  function alignPos(v) {
    if (v === 1) return [];
    const n = Math.floor(v / 7) + 2, size = v * 4 + 17, step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, out = [6];
    for (let p = size - 7; out.length < n; p -= step) out.splice(1, 0, p);
    return out;
  }
  // Reed-Solomon over GF(256), x^8 + x^4 + x^3 + x^2 + 1
  const EXP = new Array(512), LOG = new Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
  function rsGen(n) {                                                  // (x - a^0)(x - a^1)...(x - a^(n-1)), highest first
    let g = [1];
    for (let i = 0; i < n; i++) { const h = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { h[j] ^= g[j]; h[j + 1] ^= mul(g[j], EXP[i]); } g = h; }
    return g;
  }
  function rsRem(data, n) {
    const g = rsGen(n), r = new Array(n).fill(0);
    for (const d of data) { const f = d ^ r[0]; r.shift(); r.push(0); if (f) for (let j = 0; j < n; j++) r[j] ^= mul(g[j + 1], f); }
    return r;
  }
  const utf8 = s => [...unescape(encodeURIComponent(String(s)))].map(c => c.charCodeAt(0));
  // the bits: byte mode, the length, the bytes, an end, then filler up to the version's size
  function codewords(bytes, v) {
    const bits = [], put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, v <= 9 ? 8 : 16); for (const b of bytes) put(b, 8);
    const cap = dataCodewords(v) * 8;
    put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
    const out = []; for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((a, b) => a * 2 + b, 0));
    for (let p = 0xec; out.length < cap / 8; p ^= 0xec ^ 0x11) out.push(p);
    return out;
  }
  // split into blocks, add each block's error correction, then interleave
  function interleave(data, v) {
    const nb = BLOCKS[v], ec = ECC[v], raw = Math.floor(rawModules(v) / 8), short = nb - raw % nb, shortLen = Math.floor(raw / nb) - ec, blocks = [];
    for (let i = 0, k = 0; i < nb; i++) { const d = data.slice(k, k + shortLen + (i < short ? 0 : 1)); k += d.length; blocks.push([d, rsRem(d, ec)]); }
    const out = [];
    for (let i = 0; i <= shortLen; i++) for (const [d] of blocks) if (i < d.length) out.push(d[i]);
    for (let i = 0; i < ec; i++) for (const [, e] of blocks) out.push(e[i]);
    return out;
  }
  const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];
  function formatBits(mask) {                                          // level M is 00
    const d = mask; let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    return ((d << 10) | r) ^ 0x5412;
  }
  function versionBits(v) {
    let r = v;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    return (v << 12) | r;
  }
  // the fixed patterns: finders, timing, alignment, the reserved format and version areas
  function base(v) {
    const n = v * 4 + 17, m = [], fn = [];
    for (let y = 0; y < n; y++) { m.push(new Array(n).fill(false)); fn.push(new Array(n).fill(false)); }
    const set = (x, y, d) => { m[y][x] = d; fn[y][x] = true; };
    for (let i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]])
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < n && y >= 0 && y < n) set(x, y, d !== 2 && d !== 4);
      }
    const ap = alignPos(v), last = ap.length - 1;
    for (let i = 0; i <= last; i++) for (let j = 0; j <= last; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    drawFormat(m, fn, 0, n);
    if (v >= 7) { const b = versionBits(v); for (let i = 0; i < 18; i++) { const d = ((b >>> i) & 1) === 1, a = n - 11 + i % 3, c = Math.floor(i / 3); set(a, c, d); set(c, a, d); } }
    return { n, m, fn };
  }
  function drawFormat(m, fn, mask, n) {
    const b = formatBits(mask), bit = i => ((b >>> i) & 1) === 1, set = (x, y, d) => { m[y][x] = d; fn[y][x] = true; };
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(n - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, n - 15 + i, bit(i));
    set(8, n - 8, true);                                               // the dark module
  }
  // the codewords along the zigzag, two columns at a time from the bottom right, skipping the timing column
  function place(m, fn, cw, n) {
    let i = 0;
    for (let right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? n - 1 - vert : vert;
        if (fn[y][x]) continue;
        m[y][x] = i < cw.length * 8 && ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++;
      }
    }
  }
  // how badly a mask reads: long runs, 2x2 blocks, finder look-alikes, too dark or too light
  function penalty(m, n) {
    let p = 0, dark = 0;
    const line = get => {
      let run = 1, s = 0, prev = get(0);
      for (let i = 1; i <= n; i++) {
        const c = i < n ? get(i) : !prev;
        if (c === prev) run++; else { if (run >= 5) s += run - 2; run = 1; prev = c; }
      }
      for (let i = 0; i + 6 < n; i++)
        if (get(i) && !get(i + 1) && get(i + 2) && get(i + 3) && get(i + 4) && !get(i + 5) && get(i + 6)) {
          const before = [1, 2, 3, 4].every(k => i - k < 0 || !get(i - k)), after = [7, 8, 9, 10].every(k => i + k >= n || !get(i + k));
          if (before || after) s += 40;
        }
      return s;
    };
    for (let y = 0; y < n; y++) p += line(x => m[y][x]);
    for (let x = 0; x < n; x++) p += line(y => m[y][x]);
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3; }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) dark++;
    p += (Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1) * 10;
    return p;
  }
  function make(text, forceMask) {
    const bytes = utf8(text);
    let v = 1;
    while (v <= MAXV && bytes.length + (v <= 9 ? 2 : 3) > dataCodewords(v)) v++;
    if (v > MAXV) return null;
    const cw = interleave(codewords(bytes, v), v);
    const { n, m, fn } = base(v);
    place(m, fn, cw, n);
    const masked = k => { const a = m.map(r => r.slice()); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fn[y][x] && MASKS[k](x, y)) a[y][x] = !a[y][x]; drawFormat(a, fn.map(r => r.slice()), k, n); return a; };
    let best = null, bestK = 0, bestP = Infinity;
    for (let k = 0; k < 8; k++) {
      if (forceMask != null && k !== forceMask) continue;
      const a = masked(k), pk = penalty(a, n);
      if (pk < bestP) { best = a; bestK = k; bestP = pk; }
    }
    return { size: n, version: v, mask: bestK, dark: (x, y) => x >= 0 && y >= 0 && x < n && y < n && best[y][x], rows: best };
  }
  // the dark modules as one SVG path, runs along each row merged
  function path(q, quiet = 4) {
    let d = '';
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) {
      if (!q.dark(x, y)) continue;
      let w = 1; while (q.dark(x + w, y)) w++;
      d += `M${x + quiet} ${y + quiet}h${w}v1h-${w}z`; x += w - 1;
    }
    return d;
  }
  return { make, path, dataCodewords, rsRem, formatBits, versionBits, alignPos, MAXV };
})();
