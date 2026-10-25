/* Paths for the trap run. Each is built from segments laid side by side (every segment is 14 rows; row 0 and row 13
   are the jungle's edge). Map: '#' stone, 'T' tree, 'R' rock (all solid); '.' path, ',' grass; '~' water, 'o' a pit;
   'a'..'g' spikes of a group (def.spikes: per (s), up (s up in each beat), ph, stop: plates that keep them down);
   '1'..'9' pressure plates; 'H'..'K' gates (def.gates: the plates, or the lever pair, that open each); 'u'..'w' levers
   (a pair opens its door for good when both are pulled at once); '!' a checkpoint row; 'E' the temple gate (the end);
   '*' a gem; '+' a heart; 'P' and 'M' where pink and mint start. things: arrow shooters { k: 'arrow', x, y, dir, per,
   ph }, rollers { k: 'roll', x, dir, per, ph, sp, shape: 'log'|'rock' }, fire bars { k: 'fire', x, y, len, sp, ph },
   saws { k: 'saw', x0, y0, x1, y1, per, ph }; any of them may have stop (plates). bot: the plan the test bots follow
   (pair: a plate this side and one beyond column x1, held in turn; pull: a lever pair; between them they walk, dodging). time: seconds; stars: score for 1, 2, 3 stars. */
const PSEG = {
  start: () => ({ rows: [
    'TTTTTTTT', 'T,,,,,,,', 'T,T,,,,,', 'T,,,,*,,', 'T,,,,,,,', 'T,,P,,,,', 'T,......', 'T,......', 'T,,M,,,,', 'T,,,,,,,', 'T,,,,,,,', 'T,T,,,T,', 'T,,,,,,,', 'TTTTTTTT'] }),
  // two bands of spikes on alternating beats: wait on the grass between them
  beat: (a = 'a', b = 'b', per = 2.4) => ({ rows: [
    'TTTTTTTTTTTT', ',,,AA,,BB,,,', ',,,AA,,BB,,,', ',,,AA,,BB,*,', ',,,AA,,BB,,,', ',,,AA,,BB,,,', '...AA..BB...', '...AA..BB...', ',,,AA,,BB,,,', ',,,AA,,BB,,,', ',,,AA,,BB,,,', ',*,AA,,BB,,,', ',,,AA,,BB,,,', 'TTTTTTTTTTTT'].map(r => r.replace(/A/g, a).replace(/B/g, b)),
    spikes: { [a]: { per, up: 1.0, ph: 0 }, [b]: { per, up: 1.0, ph: per / 2 } } }),
  // a wall with a gate: one stands on the plate so the other gets through, then the other holds the plate beyond
  gate: (g = 'H', p1 = '1', p2 = '2') => ({ rows: [
    'TTTTTTTTTT', ',,,,,#,,,,', ',,,,,#,,,,', ',,X,,#,,,,', ',,,,,#,,,,', ',,,,,G,,,,', '.....G....', '.....G....', ',,,,,G,,,,', ',,,,,#,,,,', ',,,,,#,,Y,', ',,,,,#,,,,', ',,,,,#,,*,', 'TTTTTTTTTT'].map(r => r.replace(/G/g, g).replace(/X/g, p1).replace(/Y/g, p2)),
    gates: { [g]: p1 + p2 },
    bot: [{ pair: [2, 3], far: [8, 10], x1: 5 }] }),
  // a long bed of spikes that is almost never down: a plate on either side keeps it down while somebody stands there
  stop: (c = 'c', p1 = '3', p2 = '4') => ({ rows: [
    'TTTTTTTTTTTTTTTT', ',,,CCCCCCCC,,,,,', ',X,CCCCCCCC,,,,,', ',,,CCCCCCCC,,,,,', ',,,CCCCCCCC,,,,,', ',,,CCCCCCCC,,,,,', '...CCCCCCCC.....', '...CCCCCCCC.....', ',,,CCCCCCCC,,,,,', ',,,CCCCCCCC,,,,,', ',,,CCCCCCCC,,,,,', ',,,CCCCCCCC,,Y,,', ',,,CCCCCCCC,,,,,', 'TTTTTTTTTTTTTTTT'].map(r => r.replace(/C/g, c).replace(/X/g, p1).replace(/Y/g, p2)),
    spikes: { [c]: { per: 2.0, up: 1.3, ph: .5, stop: p1 + p2 } },
    bot: [{ pair: [1, 2], far: [13, 11], x1: 10 }] }),
  // logs and boulders rolling across the path out of the jungle (down a gap in the trees, drawn by the screen)
  logs: (per = [2.4, 2.0, 2.8], sp = [130, 150, 120], shapes = ['log', 'log', 'rock']) => ({ rows: [
    'TTTTTTTTTTTTTTT', ',,,,,,,,,,,,,,,', ',,,,,,,,,,,,,,,', ',,,,,,,,,,,,,,,', ',,,,,,,,,,,,,,,', ',,,,,,,,,,,,,,,', '...............', '.......*.......', ',,,,,,,,,,,,,,,', ',,,,,,,,,,,,,,,', ',,,,,,,,,,,,,,,', ',,,,,,,,,,,,,,,', ',,,,,,,,,,,,,,,', 'TTTTTTTTTTTTTTT'],
    things: [{ k: 'roll', x: 3, dir: 'd', per: per[0], ph: 0, sp: sp[0], shape: shapes[0] }, { k: 'roll', x: 7, dir: 'u', per: per[1], ph: .9, sp: sp[1], shape: shapes[1] }, { k: 'roll', x: 11, dir: 'd', per: per[2], ph: 1.6, sp: sp[2], shape: shapes[2] }] }),
  // a stream with a crooked line of stepping stones
  river: () => ({ rows: [
    'TTTTTTTTTTTTTTTT', ',,~~~~~~~~~~~~,,', ',,~~~~~~~~~~~~,,', ',,~~~~~~~~~~~~,,', ',,~~..*.~~~~~~,,', ',,~~.~~.~~~~~~,,', ',,...~~.~~....,,', ',,~~~~~.~~.~~~,,', ',,~~~~~....~~~,,', ',,~~~~~~~~~~~~,,', ',,~~~~~~~~~~~~,,', ',,~~~~~~~~~~~~,,', ',,~~~~~~~~~~~~,,', 'TTTTTTTTTTTTTTTT'] }),
  // a second stream: stones in two lines, a pit on the bank
  river2: () => ({ rows: [
    'TTTTTTTTTTTTTT', ',,~~~~~~~~~~,,', ',,~..~~~~..~,,', ',,~.~~~~~~.~,,', ',..*~~~~~~.~,,', ',,~.~~~~~~.~,,', ',,~.~~~~~~....', ',,~.~~~~~~~~,,', ',,~.......~~,,', ',,~~~~~~~.~~,,', ',o,~~~~~~.~~,,', ',,~~~~~~~...,,', ',,~~~~~~~~~~,,', 'TTTTTTTTTTTTTT'] }),
  // a hall of carved faces in the wall that shoot arrows across the path
  arrows: (per = 1.6) => ({ rows: [
    'TTT#TT#TT#TT#T', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', '..............', '.......*......', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', 'TTTTTTTTTTTTTT'],
    things: [3, 6, 9, 12].map((x, i) => ({ k: 'arrow', x, y: 0, dir: 'd', per, ph: i * per / 4 })) }),
  // arrows from both sides, the faces facing each other
  arrows2: (per = 1.8) => ({ rows: [
    'TTT#TTTT#TTTTT', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', '..............', '..............', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,*,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', 'TTTTT#TTTT#TTT'],
    things: [{ k: 'arrow', x: 3, y: 0, dir: 'd', per, ph: 0 }, { k: 'arrow', x: 8, y: 0, dir: 'd', per, ph: per / 2 }, { k: 'arrow', x: 5, y: 13, dir: 'u', per, ph: per / 4 }, { k: 'arrow', x: 10, y: 13, dir: 'u', per, ph: per * .75 }] }),
  // a door that needs both levers pulled together: they are too far apart for one person
  lever: (l = 'u', g = 'J') => ({ rows: [
    'TTTTTTTTTTTT', ',,,,,,,,#,,,', ',,,,,,L,#,,,', ',,,,,,,,#,,,', ',,,,,,,,#,,,', ',,,,,,,,G,,,', '........G...', '........G...', ',,,,,,,,G,,,', ',,,,,,,,#,,,', ',,,,,,,,#,,,', ',,,,,,L,#,,,', ',,,,,,,,#,,,', 'TTTTTTTTTTTT'].map(r => r.replace(/L/g, l).replace(/G/g, g)),
    gates: { [g]: l }, bot: [{ pull: l, at: { pink: [6, 2], mint: [6, 11] } }] }),
  // fire bars turning around two rock pillars; standing on either plate puts them out
  fire: (p1 = '5', p2 = '6', sp = 1.6) => ({ rows: [
    'TTTTTTTTTTTTTT', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,Y,', ',,,,,,,,,,,,,,', ',,,,R,,,,,,,,,', ',,,,,,,,,,,,,,', '..............', '..............', ',,,,,,,,,R,,,,', ',,,,,,,,,,,,,,', ',,,,,,,*,,,,,,', ',X,,,,,,,,,,,,', ',,,,,,,,,,,,,,', 'TTTTTTTTTTTTTT'].map(r => r.replace(/X/g, p1).replace(/Y/g, p2)),
    things: [{ k: 'fire', x: 4, y: 4, len: 3, sp, ph: 0, stop: p1 + p2 }, { k: 'fire', x: 9, y: 8, len: 3, sp: -sp * .85, ph: 1.5, stop: p1 + p2 }],
    bot: [{ pair: [1, 11], far: [12, 2], x1: 11 }] }),
  // saw blades running up and down across the path
  saws: (per = [1.9, 2.3, 1.7]) => ({ rows: [
    'TTTTTTTTTTTTTT', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', '..............', '..............', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,*,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', 'TTTTTTTTTTTTTT'],
    things: [{ k: 'saw', x0: 3, y0: 1, x1: 3, y1: 12, per: per[0], ph: 0 }, { k: 'saw', x0: 7, y0: 12, x1: 7, y1: 1, per: per[1], ph: .6 }, { k: 'saw', x0: 11, y0: 1, x1: 11, y1: 12, per: per[2], ph: 1.1 }] }),
  // the path splits in two: spikes in the top lane are stopped from the bottom lane, saws in the bottom lane from the top
  split: (d = 'd', p1 = '7', p2 = '8') => ({ rows: [
    'TTTTTTTTTTTTTT', ',,,DDDDDDDD,,,', ',,,DDDDDDDD,Y,', ',,,DDDDDDDD,,,', ',,,DDDDDDDD,,,', ',,,DDDDDDDD,,,', ',,###########,', ',,###########,', ',X,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', ',,,,,,,,,,,,,,', 'TTTTTTTTTTTTTT'].map(r => r.replace(/D/g, d).replace(/X/g, p1).replace(/Y/g, p2)),
    spikes: { [d]: { per: 2.0, up: 1.3, ph: 0, stop: p1 } },
    things: [{ k: 'saw', x0: 4, y0: 8, x1: 4, y1: 12, per: 1.1, ph: 0, stop: p2 }, { k: 'saw', x0: 7, y0: 12, x1: 7, y1: 8, per: .9, ph: .3, stop: p2 }, { k: 'saw', x0: 10, y0: 8, x1: 10, y1: 12, per: 1.2, ph: .6, stop: p2 }],
    bot: [{ pair: [1, 8], far: [12, 2], x1: 11 }] }),
  // spikes in a rolling wave, three groups a beat apart
  wave: (a = 'a', b = 'b', c = 'c', per = 2.7) => ({ rows: [
    'TTTTTTTTTTTTTTTT', ',,AA,BB,CC,AA,,,', ',,AA,BB,CC,AA,,,', ',,AA,BB,CC,AA,,,', ',,AA,BB,CC,AA,,,', ',,AA,BB,CC,AA,,,', '..AA.BB.CC.AA...', '..AA.BB.CC.AA...', ',,AA,BB,CC,AA,,,', ',,AA,BB,CC,AA,,,', ',,AA,BB,CC,AA*,,', ',,AA,BB,CC,AA,,,', ',,AA,BB,CC,AA,,,', 'TTTTTTTTTTTTTTTT'].map(r => r.replace(/A/g, a).replace(/B/g, b).replace(/C/g, c)),
    spikes: { [a]: { per, up: 1.0, ph: 0 }, [b]: { per, up: 1.0, ph: per / 3 }, [c]: { per, up: 1.0, ph: per * 2 / 3 } } }),
  // a narrow causeway between pits: a breather
  causeway: () => ({ rows: [
    'TTTTTTTTTTTTTT', ',,oooooooooo,,', ',,oooooooooo,,', ',,oooooooooo,,', ',,oooooooooo,,', ',,oooooooooo,,', ',,..........,,', ',,....*.....,,', ',,oooooooooo,,', ',,oooooooooo,,', ',,oooooooooo,,', ',,oooooooooo,,', ',,oooooooooo,,', 'TTTTTTTTTTTTTT'] }),
  check: () => ({ rows: ['TTT', ',!,', ',!,', ',!,', ',!,', ',!,', '.!.', '.!.', ',!,', ',!,', ',!,', ',!,', ',!,', 'TTT'] }),
  heart: () => ({ rows: ['TTTT', ',,,,', ',,,,', ',,,,', ',,,,', ',,,,', '....', '..+.', ',,,,', ',,,,', ',,,,', ',,,,', ',,,,', 'TTTT'] }),
  exit: () => ({ rows: [
    'TTTTTTTT', ',,,,####', ',,,,####', ',,,,,,##', ',,,,EEE#', ',,,,EEE#', '....EEE#', '....EEE#', ',,,,EEE#', ',,,,EEE#', ',,,,,,##', ',,,,####', ',,,,####', 'TTTTTTTT'] })
};
// lay the segments side by side: things and plans move with their segment
function trapLevel(name, opt, segs) {
  const map = new Array(14).fill(''), things = [], spikes = {}, gates = {}, bot = [];
  let x0 = 0;
  for (const s of segs) {
    const w = s.rows[0].length;
    s.rows.forEach((r, i) => { map[i] += r; });
    for (const t of s.things || []) { const c = Object.assign({}, t); for (const k of ['x', 'x0', 'x1']) if (k in c) c[k] += x0; things.push(c); }
    Object.assign(spikes, s.spikes || {}); Object.assign(gates, s.gates || {});
    const sh = p => [p[0] + x0, p[1]];
    for (const b of s.bot || []) {
      if (b.pair) bot.push({ pair: sh(b.pair), far: sh(b.far), x1: b.x1 + x0 });
      else if (b.pull) bot.push({ pull: b.pull, at: Object.fromEntries(Object.entries(b.at).map(([k, v]) => [k, sh(v)])) });
    }
    bot.push({ to: x0 + w });                                          // then on to the end of this segment
    x0 += w;
  }
  return Object.assign({ name, map, things, spikes, gates, bot }, opt);
}
const P = PSEG;
const PLEVELS = [
  trapLevel('ทางเข้าป่า', { hint: 'หนามโผล่เป็นจังหวะ รอให้หดก่อนค่อยเดิน ยืนบนแผ่นหินให้อีกคนผ่านประตู ใครโดนให้อีกคนเดินไปยืนข้างๆ ช่วยลุก', time: 150, stars: [900, 1350, 1480] },
    [P.start(), P.beat('a', 'b'), P.gate('H', '1', '2'), P.check(), P.logs(), P.stop('c', '3', '4'), P.check(), P.lever('u', 'J'), P.exit()]),
  trapLevel('ลำธารหินลื่น', { hint: 'เหยียบหินข้ามลำธาร ตกน้ำต้องให้อีกคนช่วย หน้ากากบนกำแพงยิงลูกธนูเป็นจังหวะ คันโยกสองอันต้องดึงพร้อมกัน', time: 220, stars: [1100, 1850, 2040] },
    [P.start(), P.river(), P.arrows(1.6), P.check(), P.gate('H', '1', '2'), P.river2(), P.check(), P.heart(), P.beat('a', 'b', 2.2), P.lever('u', 'J'), P.check(), P.causeway(), P.logs([2.2, 1.9, 2.5], [140, 160, 130], ['log', 'rock', 'log']), P.river(), P.exit()]),
  trapLevel('ถ้ำไฟ', { hint: 'คานไฟหมุนรอบเสาหิน ยืนบนแผ่นหินจะดับไฟ ทางแยกสองเลน คนข้างล่างกดหยุดหนามข้างบน คนข้างบนกดหยุดใบเลื่อยข้างล่าง', time: 250, stars: [1000, 1750, 2060] },
    [P.start(), P.fire('5', '6'), P.check(), P.logs([2.0, 2.3, 1.8], [150, 130, 160], ['rock', 'rock', 'log']), P.stop('c', '3', '4'), P.check(), P.beat('a', 'b', 2.2), P.split('d', '7', '8'), P.heart(), P.check(), P.arrows(1.5), P.fire('1', '2', 1.9), P.check(), P.wave('e', 'f', 'g', 2.6), P.arrows2(1.7), P.exit()]),
  trapLevel('วิหารใบเลื่อย', { hint: 'ใบเลื่อยวิ่งขึ้นลงตามราง ดูจังหวะให้ดี ทางยาวขึ้นแล้ว จุดเซฟอยู่เป็นระยะ หัวใจหมดต้องเริ่มใหม่ทั้งด่าน', time: 260, stars: [1100, 1900, 2150] },
    [P.start(), P.saws(), P.split('d', '7', '8'), P.check(), P.arrows(1.4), P.gate('H', '1', '2'), P.check(), P.wave('a', 'b', 'c'), P.saws([1.6, 2.0, 1.5]), P.heart(), P.check(), P.river(), P.lever('u', 'J'), P.fire('5', '6', 1.8), P.check(), P.causeway(), P.logs([2.0, 1.8, 2.2], [160, 170, 150]), P.exit()]),
  trapLevel('ทางกลับบ้าน', { hint: 'ด่านสุดท้าย ยาวที่สุด กับดักทุกแบบมารวมกัน ผลัดกันกดแผ่นหิน ช่วยกันลุก แล้วไปให้ถึงประตูวิหารพร้อมกัน', time: 330, stars: [1200, 2150, 2480] },
    [P.start(), P.beat('a', 'b', 2.2), P.logs([1.9, 1.7, 2.1], [160, 170, 150], ['log', 'rock', 'log']), P.check(), P.stop('c', '3', '4'), P.arrows2(1.5), P.check(), P.river2(), P.gate('H', '1', '2'), P.heart(), P.check(), P.split('d', '7', '8'), P.saws([1.5, 1.9, 1.4]), P.check(),
      P.fire('5', '6', 2.0), P.lever('u', 'J'), P.check(), P.wave('e', 'f', 'g', 2.4), P.causeway(), P.arrows(1.3), P.check(), P.river(), P.lever('v', 'K'), P.exit()])
];
