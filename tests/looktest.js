// How they look: the free parts and the star-opened ones, the code both ways (old codes from before still read),
// nonsense cleaned away, locks kept, and the couple sets.
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'look.js'), 'utf8') + ';this.Look=Look;', ctx);
const { Look: L } = ctx;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const J = o => JSON.stringify(o);

{ // what there is
  ok(L.COLORS.length === 11 && L.COLORS.every(c => /^#[0-9a-f]{6}$/.test(c[2]) && /^#[0-9a-f]{6}$/.test(c[3]) && /^#[0-9a-f]{6}$/.test(c[4])), 'eleven body colours, each with a dark and a light');
  ok(L.FREE_KEYS.every(k => L.FREE[k].length >= 4) && L.FREE.t.some(a => a[0] === 'bow') && L.FREE.t.some(a => a[0] === 'sprout'), 'the free parts each have several choices, the bow and the sprout among the tops');
  ok(L.DEF.pink.c === 'pink' && L.DEF.pink.t === 'bow' && L.DEF.mint.c === 'mint' && L.DEF.mint.t === 'sprout', 'pink starts as herself (pink, a bow) and mint as himself (mint, a sprout)');
  const ids = new Set(L.ALL.map(it => it.slot + it.id));
  ok(ids.size === L.ALL.length && L.ALL.every(it => it.need > 0 && it.need <= 75), 'every item has its own id and a star count to open it');
  ok(L.ITEMS.o.length >= 10 && L.ITEMS.b.length >= 5 && L.ITEMS.s.length >= 4, 'the new slots: outfits, things on the back, shoes');
  const c = L.color('sky'); ok(c.c === '#5ec8ff' && L.color('nope').id === 'pink', 'a colour by its id (an unknown one is pink)');
}
{ // the code
  const look = { c: 'sky', p: 'spots', e: 'star', m: 'cat', k: 'heart', t: 'antenna' }, wear = { h: 'crown', f: 'round', n: '', o: 'sailor', b: 'wings', s: 'boot' };
  const s = L.code(look, wear, 'pink'), back = L.parse(s, 'pink');
  ok(s === '2|crown.round..sailor.wings.boot|sky.spots.star.cat.heart.antenna', 'a look and what is worn, as a short code');
  ok(J(back.look) === J(look) && J(back.wear) === J(wear), 'and read back the same');
  const old = L.parse('straw.heart.scarf', 'mint');
  ok(old.wear.h === 'straw' && old.wear.f === 'heart' && old.wear.n === 'scarf' && old.wear.o === '' && J(old.look) === J(L.DEF.mint), 'a code from the old version (three things) still reads, with mint looking like mint');
  const bad = L.parse('2|crown.<b>.x.tux.jet.zzz|navy.spots.<script>.cat', 'pink');
  ok(bad.wear.h === 'crown' && bad.wear.f === '' && bad.wear.o === 'tux' && bad.wear.b === 'jet' && bad.wear.s === '' && bad.look.c === 'pink' && bad.look.p === 'spots' && bad.look.e === 'shiny' && bad.look.m === 'cat' && bad.look.t === 'bow', 'unknown parts are dropped one by one, the rest kept');
  ok(J(L.parse(null, 'mint').look) === J(L.DEF.mint) && J(L.parse('x'.repeat(500), 'pink').wear) === J(L.NONE), 'nothing, or something far too long: as they were');
  ok(L.code(null, L.NONE, 'pink') === '2|.....|', 'no look sent: the other side keeps its own');
  ok(J(L.parse('2|.....|', 'mint').look) === J(L.DEF.mint), 'and reads it as the usual look');
}
{ // locks
  const w = L.cleanWear({ h: 'halo', o: 'tee', s: 'gold', b: 'bag' }, 10);
  ok(w.h === '' && w.o === 'tee' && w.s === '' && w.b === 'bag', 'with 10 stars: the tee and the little bag on, the halo and the gold shoes not yet');
  ok(J(L.cleanWear({ h: 'halo', s: 'gold' }, 999)) === J({ h: 'halo', f: '', n: '', o: '', b: '', s: 'gold' }), 'with enough stars, everything');
}
{ // couple sets
  ok(L.pairSet({ o: 'tux' }, { o: 'gown' }).id === 'wed' && L.pairSet({ o: 'gown' }, { o: 'tux' }).name === 'เจ้าบ่าวเจ้าสาว', 'the groom and the bride, either way round');
  ok(L.pairSet({ o: 'pjs' }, { o: 'pjs' }).name === 'ชุดนอนคู่' && L.pairSet({ o: 'astro' }, { o: 'astro' }).id === 'astro', 'the same outfit on both is a set');
  ok(!L.pairSet({ o: 'pjs' }, { o: 'tee' }) && !L.pairSet({ o: '' }, { o: '' }) && !L.pairSet(null, { o: 'tee' }), 'different outfits, or none: no set');
}
console.log(fails ? fails + ' FAILED' : 'LOOK OK');
process.exit(fails ? 1 : 0);
