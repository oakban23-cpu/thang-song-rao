// The QR code on the big screen: read back by a small reader written here on its own (format, mask, zigzag, blocks,
// Reed-Solomon check, the bytes), across lengths, masks and versions; plus one code a phone camera reader decoded,
// kept as it was.
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'qr.js'), 'utf8') + ';this.QR=QR;', ctx);
const { QR } = ctx;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

// GF(256) for the reader's own Reed-Solomon check
const EXP = [], LOG = [];
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x = (x << 1) ^ (x & 128 ? 0x11d : 0); x &= 255; }
const gmul = (a, b) => (a && b ? EXP[(LOG[a] + LOG[b]) % 255] : 0);
const syndromesZero = (cw, n) => { for (let i = 0; i < n; i++) { let s = 0; for (const c of cw) s = gmul(s, EXP[i]) ^ c; if (s) return false; } return true; };
// level M block layout per version, from the standard's table
const LAYOUT = { 1: [[1, 26, 16]], 2: [[1, 44, 28]], 3: [[1, 70, 44]], 4: [[2, 50, 32]], 5: [[2, 67, 43]], 6: [[4, 43, 27]], 7: [[4, 49, 31]], 8: [[2, 60, 38], [2, 61, 39]],
  9: [[3, 58, 36], [2, 59, 37]], 10: [[4, 69, 43], [1, 70, 44]], 11: [[1, 80, 50], [4, 81, 51]], 12: [[6, 58, 36], [2, 59, 37]], 13: [[8, 59, 37], [1, 60, 38]] };

function read(q) {
  const n = q.size, d = (x, y) => q.dark(x, y), v = (n - 17) / 4;
  // format: both copies, unmasked with 101010000010010, must name level M and agree
  let f1 = 0, f2 = 0;
  const a = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  a.forEach(([x, y], i) => { if (d(x, y)) f1 |= 1 << i; });
  for (let i = 0; i < 8; i++) if (d(n - 1 - i, 8)) f2 |= 1 << i;
  for (let i = 8; i < 15; i++) if (d(8, n - 15 + i)) f2 |= 1 << i;
  f1 ^= 0x5412; f2 ^= 0x5412;
  const level = f1 >> 13, mask = (f1 >> 10) & 7;
  // which modules are fixed patterns
  const fixed = (x, y) => {
    if ((x < 9 && y < 9) || (x >= n - 8 && y < 9) || (x < 9 && y >= n - 8) || x === 6 || y === 6) return true;
    if (v >= 7 && ((x >= n - 11 && x < n - 8 && y < 6) || (y >= n - 11 && y < n - 8 && x < 6))) return true;
    const ap = QR.alignPos(v);
    for (const ax of ap) for (const ay of ap) {
      if ((ax === 6 && ay === 6) || (ax === 6 && ay === ap[ap.length - 1]) || (ax === ap[ap.length - 1] && ay === 6)) continue;
      if (Math.abs(x - ax) <= 2 && Math.abs(y - ay) <= 2) return true;
    }
    return false;
  };
  const M = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => (x * y) % 2 + (x * y) % 3 === 0, (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0][mask];
  // the zigzag: column pairs from the right, up then down, column 6 skipped
  const bits = [];
  let up = true;
  for (let c = n - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    for (let k = 0; k < n; k++) { const y = up ? n - 1 - k : k; for (const x of [c, c - 1]) if (!fixed(x, y)) bits.push(d(x, y) !== M(x, y)); }
    up = !up;
  }
  const words = []; for (let i = 0; i + 8 <= bits.length; i += 8) words.push(bits.slice(i, i + 8).reduce((s, b) => s * 2 + (b ? 1 : 0), 0));
  // undo the interleaving into blocks
  const groups = []; for (const [cnt, tot, dat] of LAYOUT[v]) for (let i = 0; i < cnt; i++) groups.push({ tot, dat, w: [] });
  const maxDat = Math.max(...groups.map(g => g.dat)); let p = 0;
  for (let i = 0; i < maxDat; i++) for (const g of groups) if (i < g.dat) g.w.push(words[p++]);
  const ec = groups[0].tot - groups[0].dat;
  for (let i = 0; i < ec; i++) for (const g of groups) g.w.push(words[p++]);
  const rsOk = groups.every(g => syndromesZero(g.w, ec));
  const data = [].concat(...groups.map(g => g.w.slice(0, g.dat)));
  // byte mode: 0100, the count, the bytes
  let bp = 0; const take = k => { let r = 0; for (let i = 0; i < k; i++) { r = r * 2 + ((data[bp >> 3] >> (7 - (bp & 7))) & 1); bp++; } return r; };
  const mode = take(4), len = take(v <= 9 ? 8 : 16), bytes = []; for (let i = 0; i < len; i++) bytes.push(take(8));
  return { v, level, mask, sameFormat: f1 === f2, rsOk, mode, text: Buffer.from(bytes).toString('utf8'), darkModule: d(8, n - 8) };
}

{ // the link a phone opens, read back
  const t = 'https://oakban23-cpu.github.io/thang-song-rao/?pad=1234', q = QR.make(t), r = read(q);
  ok(q.version === 4 && q.size === 33, 'the pad link fits in version 4 (33 x 33)');
  ok(r.level === 0 && r.sameFormat && r.mask === q.mask && r.darkModule, 'format: level M, the chosen mask, both copies the same, the dark module');
  ok(r.rsOk && r.mode === 4 && r.text === t, 'every block passes its error correction check and the link reads back');
  const KEEP = ['1fcd1727f', '10423c441', '175f67d5d', '17560f15d', '1750f225d', '1053c9441', '1fd55557f', '001f50900', '17c78817c', '1e8d9666d', '13dbed5d6', '139c91fdc', '01415d1b9', '1da32ae47', '1ceef51de', '1382e1bec', '0fd76b1b1',
    '0c844366d', '1340204f6', '182484f7c', '19d2e569a', '170b36e49', '1543400c2', '16bf15cdf', '11ca893f2', '00161f917', '1fc379b56', '1053beb1f', '1751705fb', '175b2f39f', '175e35d68', '1046a4c94', '1fd1785e2'];
  const rows = q.rows.map(rw => BigInt('0b' + rw.map(b => (b ? 1 : 0)).join('')).toString(16).padStart(9, '0'));
  ok(rows.join() === KEEP.join(), 'the same modules as the code a camera reader decoded');
}
{ // many lengths, every mask, versions 1 to 13, and Thai text
  let all = true, seen = new Set(), n = 0;
  const al = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/:?=&.-_~%';
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const texts = ['a', 'ทางสองเรา จอย ๑๒๓๔', 'https://claude.ai/artifact/Cu3vqpWduGu6QUYeNroCym'];
  for (const L of [13, 14, 25, 26, 41, 42, 61, 62, 83, 84, 105, 106, 121, 122, 151, 152, 179, 180, 212, 213, 250, 279, 330]) texts.push(Array.from({ length: L }, () => al[Math.floor(rnd() * al.length)]).join(''));
  for (const t of texts) for (const m of [null, 0, 1, 2, 3, 4, 5, 6, 7]) {
    const q = QR.make(t, m), r = read(q); n++; seen.add(q.version);
    if (!(r.rsOk && r.text === t && r.level === 0 && r.sameFormat && (m == null || r.mask === m))) { all = false; console.log('  failed:', t.length, 'chars, mask', m, 'version', q.version, JSON.stringify(r).slice(0, 120)); }
  }
  ok(all && seen.size === 13, `${n} codes from 1 to ${Math.max(...seen)} versions all read back with their error correction intact`);
  ok(QR.make('x'.repeat(2000)) === null, 'a text too long for a code gives none (no broken code)');
}
{ // the picture
  const q = QR.make('hi'), d = QR.path(q, 4);
  ok(/^(M\d+ \d+h\d+v1h-\d+z)+$/.test(d) && d.startsWith('M4 4h7'), 'the SVG path: one run per row of dark modules, inside a quiet zone of four');
}
console.log(fails ? fails + ' FAILED' : 'QR OK');
process.exit(fails ? 1 : 0);
