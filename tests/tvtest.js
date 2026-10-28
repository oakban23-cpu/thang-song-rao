// The big screen and the phone pads: messages both ways are made safe, phones get their colours (and keep them), new
// presses and commands are counted once, and the clock between them.
const vm = require('vm'), fs = require('fs'), path = require('path');
const JS = fs.existsSync(path.join(__dirname, 'game.js')) ? __dirname : path.join(__dirname, '..', 'js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(JS, 'tvlink.js'), 'utf8') + ';this.TvLink=TvLink;', ctx);
const { TvLink: L } = ctx;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const pad = extra => Object.assign({ app: 'tsr', tv: 'p', code: '1234', sid: 'abcd1234', n: 'ฝ้าย', want: 'mint', j: [0.5, -2], h: 'A,U,zz', c: { A: 3, U: 1, Q: 9 }, t: { A: 1500 }, cmd: [2, 'start', 'climb', 1], br: 'climb', sk: '3.1', ck: 1000 }, extra);
{ // a phone's words
  const p = L.readPad(pad(), '1234');
  ok(p && p.sid === 'abcd1234' && p.n === 'ฝ้าย' && p.want === 'mint', 'a phone: who and which colour it would like');
  ok(p.j[0] === .5 && p.j[1] === -1, 'the stick, kept within its circle');
  ok(p.h.has('A') && p.h.has('U') && !p.h.has('zz') && p.c.A === 3 && p.c.Q === undefined && p.t.A === 1500, 'buttons held, presses and times (unknown buttons dropped)');
  ok(p.cmd && p.cmd[1] === 'start' && p.cmd[2] === 'climb' && p.cmd[3] === 1 && p.br === 'climb' && p.sk === '3.1', 'a command, the mode it looks at, a sticker');
  ok(!L.readPad(pad({ code: '9999' }), '1234') && !L.readPad(pad({ sid: '<x>' }), '1234') && !L.readPad(pad({ tv: 's' }), '1234') && !L.readPad('hi', '1234'), 'not a pad of this screen: ignored');
  const q = L.readPad(pad({ n: '<script>เอ', j: 'x', h: 5, c: { A: -1, U: 1.5 }, cmd: [0, 'start'], br: '../x', sk: 'z' }), '1234');
  ok(q && q.n === 'scriptเอ' && q.j[0] === 0 && q.h.size === 0 && !('A' in q.c) && !('U' in q.c) && !q.cmd && q.br === '' && q.sk === '', 'nonsense in a pad message is cleaned away');
  ok(!L.readPad(pad({ cmd: [5, 'format'] }), '1234').cmd, 'an unknown command is dropped');
}
{ // the screen's words
  const m = { app: 'tsr', tv: 's', code: '1234', sid: 'scr0001', seat: { pink: ['abcd1234', 'ฝ้าย'], mint: ['<bad>', 'x'] }, st: 'play', kind: 'climb', li: 2, lab: 'ผาที่ ๓', nm: 'น้ำตก', hint: 'ระวังแพะ',
    pad: { pink: { t: 'k', role: '', b: [['A', 'เชือก'], ['U', 'เกาะ<br>ค้าง'], ['Z', 'x']] }, mint: { t: 'nope' } }, tip: { pink: 'กดค้าง!' }, ms: { climb: '★ ๓ / ๑๕', '<x>': 'y' },
    lv: { climb: [[0, '๑', 'ผาริมทะเล', '★★★', 0, 1], [1, '๒', 'ถ้ำ', 'ยังล็อกอยู่', 1, 0], ['x']] }, clear: { h: 'ถึงยอดแล้ว', s: 7, next: 'ผาถัดไป' }, pause: { no: 'ผาที่ ๓', swap: '' }, ce: { abcd1234: [10, 2] }, hn: 5000 };
  const s = L.readScreen(m, '1234');
  ok(s && s.st === 'play' && s.kind === 'climb' && s.li === 2 && s.seat.pink[0] === 'abcd1234' && s.seat.mint[0] === '', 'the screen: what is on, who sits where');
  ok(s.pad.pink.t === 'k' && s.pad.pink.b.length === 2 && s.pad.pink.b[1][1] === 'เกาะ\nค้าง' && s.pad.mint === null, "each one's buttons and their words (tags made plain)");
  ok(s.ms.climb && !s.ms['<x>'] && s.lv.climb.length === 2 && s.lv.climb[1][4] === 1, 'the stars per mode and a level list');
  ok(s.clear.s === 3 && s.clear.next === 'ผาถัดไป' && s.pause.no === 'ผาที่ ๓' && s.ce.abcd1234[0] === 10, 'results, the pause, the clock echo');
  ok(!L.readScreen(Object.assign({}, m, { code: '1' }), '1234') && !L.readScreen(Object.assign({}, m, { tv: 'p' }), '1234'), 'another screen: ignored');
  const z = L.readScreen({ app: 'tsr', tv: 's', code: '1234', sid: 'scr0001', st: 'hack', li: 'x', hint: 5, pad: 7, lv: { climb: 'x' } }, '1234');
  ok(z && z.st === 'menu' && z.li === -1 && z.hint === '' && z.pad.pink === null && !z.lv.climb, 'nonsense from the screen is cleaned away');
}
{ // colours
  const pads = new Map([['aaaa', { at: 1000, want: 'mint', first: 10 }], ['bbbb', { at: 1000, want: 'mint', first: 20 }], ['cccc', { at: 1000, want: 'pink', first: 30 }]]);
  let s = L.seat({ pink: '', mint: '' }, pads, 2000);
  ok(s.mint === 'aaaa' && s.pink === 'bbbb', 'first come first: the one who wanted mint gets it, the next gets the other colour');
  s = L.seat(s, pads, 2000); ok(s.mint === 'aaaa' && s.pink === 'bbbb', 'and they keep them (a third phone waits)');
  pads.get('bbbb').at = 1000 - L.LOST * 1000 - 1; s = L.seat(s, pads, 2000);
  ok(s.pink === 'cccc' && s.mint === 'aaaa', 'a phone gone quiet gives up its colour to the one waiting');
  pads.delete('aaaa'); s = L.seat(s, pads, 2000); ok(s.mint === '' && s.pink === 'cccc', 'a phone that left frees its colour');
}
{ // presses and commands
  const seen = {};
  ok(Object.keys(L.newPresses(seen, { A: 5, U: 2 })).length === 0, 'the first word only sets where the counts start');
  ok(L.newPresses(seen, { A: 6, U: 2 }).A === 1 && L.newPresses(seen, { A: 6, U: 2 }).A === undefined, 'a new press counts once');
  ok(L.newPresses(seen, { A: 20 }).A === 4, 'a burst is capped');
  ok(Object.keys(L.newPresses(seen, { A: 0 })).length === 0 && L.newPresses(seen, { A: 1 }).A === 1, 'a phone that started again counts from zero');
  ok(L.newPresses(seen, { A: 1, U: 2, lo: 1 }).lo === 1, 'a button first pressed later still counts');
  const sc = {};
  ok(L.newCmd(sc, [1, 'start', 'climb', 0]) && !L.newCmd(sc, [1, 'start', 'climb', 0]) && L.newCmd(sc, [2, 'pause', '', -1]) && !L.newCmd(sc, [1, 'menu', '', -1]) && !L.newCmd(sc, null), 'a command is done once; an old one is not done again');
}
{ // the clock
  const c = L.clockFrom([1000, 20], 50000, 1100);
  ok(c && c.rtt === 80 && c.off === 50000 + 40 - 1100, 'the screen clock from an echo of the phone clock');
  ok(!L.clockFrom([1000, 200], 50000, 1100) && !L.clockFrom(null, 1, 1), 'an impossible echo is ignored');
  ok(L.label('หยิบ<br>วาง<b>!</b>') === 'หยิบ\nวาง!', "a button's words as plain lines");
}
console.log(fails ? fails + ' FAILED' : 'BIG SCREEN LINK OK');
process.exit(fails ? 1 : 0);
