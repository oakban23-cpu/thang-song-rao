// Static checks on every adventure map: shape, links between ids, things standing on something, hearts not buried.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'levels.js'), 'utf8');
const { LEVELS, LEVELS2, LEVELS3, LEVELS4 } = new Function(src + ';return {LEVELS,LEVELS2,LEVELS3,LEVELS4}')();
const ALL = [LEVELS, LEVELS2, LEVELS3, LEVELS4].flatMap((a, c) => a.map((l, i) => ({ ...l, tag: `${c + 1}-${i + 1}` })));
const COLS = 30, ROWS = 17;
const OK = /^[.#\-pmA-Fa-f1-6G-Lu-z^~*oOPM@qXr ]$/;
let issues = 0, notes = 0;
const bad = (lv, m) => { issues++; console.log(`BUG  ${lv.tag} ${lv.name}: ${m}`); };
const note = (lv, m) => { notes++; console.log(`note ${lv.tag} ${lv.name}: ${m}`); };
const names = new Set();
for (const lv of ALL) {
  if (names.has(lv.name)) bad(lv, 'duplicate name'); names.add(lv.name);
  const m = lv.map;
  if (m.length !== ROWS) bad(lv, `map has ${m.length} rows`);
  m.forEach((r, y) => { if (r.length !== COLS) bad(lv, `row ${y} has ${r.length} chars`); [...r].forEach((c, x) => { if (!OK.test(c)) bad(lv, `unknown char '${c}' at ${x},${y}`); }); });
  const at = (x, y) => (y < 0 || x < 0 || x >= COLS ? '#' : y >= ROWS ? ' ' : (m[y][x] || '.'));
  const solid = c => c === '#' || /[A-F]/.test(c) || c === 'r';            // doors count as solid (closed)
  const floor = c => solid(c) || c === '-' || /[a-f]/.test(c) || c === 'p' || c === 'm' || c === 'o' || c === 'O';
  const cells = c => { const out = []; m.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === c) out.push([x, y]); })); return out; };
  for (const c of 'PM@') { const n = cells(c).length; if (n !== 1) bad(lv, `${n} '${c}'`); }
  if (!lv.hint) bad(lv, 'no hint');
  if (lv.tips && lv.tips.length !== 3) bad(lv, `${lv.tips.length} tips`);
  if (!lv.tips && !/^1-/.test(lv.tag)) bad(lv, 'no tips');
  // spawns stand on something
  for (const c of 'PM') for (const [x, y] of cells(c)) if (!floor(at(x, y + 1))) bad(lv, `spawn ${c} at ${x},${y} floats (below '${at(x, y + 1)}')`);
  // exit: 2x2 room, floor under both columns
  for (const [x, y] of cells('@')) {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, -1], [1, -1]]) if (solid(at(x + dx, y + dy)) || at(x + dx, y + dy) === '^') bad(lv, `exit cell ${x + dx},${y + dy} is '${at(x + dx, y + dy)}'`);
    for (const dx of [0, 1]) if (!floor(at(x + dx, y + 1))) note(lv, `exit column ${x + dx} has no floor under it ('${at(x + dx, y + 1)}')`);
  }
  // plates / toggles / spikes / boxes sit on floor
  m.forEach((r, y) => [...r].forEach((c, x) => {
    if (/[1-6G-Lu-z^]/.test(c) && !floor(at(x, y + 1))) bad(lv, `'${c}' at ${x},${y} has nothing under it ('${at(x, y + 1)}')`);
    if (/[oO]/.test(c) && !floor(at(x, y + 1)) && at(x, y + 1) !== '.') note(lv, `box at ${x},${y} over '${at(x, y + 1)}'`);
    if (c === '*') {
      const around = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => at(x + dx, y + dy));
      if (around.every(solid)) bad(lv, `heart at ${x},${y} is walled in`);
      if (at(x, y + 1) === '^' || at(x, y + 1) === '~') note(lv, `heart at ${x},${y} sits over a hazard`);
    }
  }));
  // bottom row gaps = bottomless pits
  const pits = [...m[ROWS - 1]].map((c, x) => (solid(c) ? null : x)).filter(x => x != null);
  if (pits.length) note(lv, `bottom row open at cols ${pits.join(',')} (fall = death)`);
  // id links: sources (plates 1-6, heavy G-L, toggles u-z) vs targets (doors A-F, bridges a-f, lifts, fans, portals)
  const src = new Set(), tgt = new Set();
  m.join('').split('').forEach(c => {
    if (/[1-6]/.test(c)) src.add(+c);
    if (/[G-L]/.test(c)) src.add(c.charCodeAt(0) - 70);
    if (/[u-z]/.test(c)) src.add(c.charCodeAt(0) - 116);
    if (/[A-F]/.test(c)) tgt.add(c.charCodeAt(0) - 64);
    if (/[a-f]/.test(c)) tgt.add(c.charCodeAt(0) - 96);
  });
  for (const l of lv.lifts || []) { if (l.id) tgt.add(l.id); if (l.y2 < 0 || l.y2 >= ROWS || l.y < 0 || l.y >= ROWS) bad(lv, 'lift out of map'); }
  for (const f of lv.fans || []) {
    for (const id of f.ids || (f.id ? [f.id] : [])) tgt.add(id);
    for (let dx = 0; dx < (f.w || 1); dx++) {
      if (!floor(at(f.x + dx, f.y + 1))) bad(lv, `fan at ${f.x + dx},${f.y} has nothing under it`);
      for (let k = 0; k < f.h; k++) if (solid(at(f.x + dx, f.y - k)) && !/[A-F]/.test(at(f.x + dx, f.y - k))) note(lv, `fan column ${f.x + dx} blocked at row ${f.y - k} ('${at(f.x + dx, f.y - k)}')`);
    }
  }
  for (const s of lv.seesaws || []) for (let dx = 0; dx < s.w; dx++) {
    if (solid(at(s.x + dx, s.y))) bad(lv, `seesaw cell ${s.x + dx},${s.y} is solid`);
    if (!floor(at(s.x + dx, s.y + 1))) bad(lv, `seesaw over a hole at ${s.x + dx}`);
  }
  for (const q of lv.portals || []) {
    if (q.id) tgt.add(q.id);
    for (const [x, y] of [q.a, q.b]) {
      for (const dy of [0, -1]) if (solid(at(x, y + dy))) bad(lv, `portal at ${x},${y} overlaps solid '${at(x, y + dy)}'`);
      if (!floor(at(x, y + 1))) note(lv, `portal at ${x},${y} has no floor under it ('${at(x, y + 1)}')`);
    }
  }
  for (const id of tgt) if (!src.has(id)) bad(lv, `target id ${id} has no plate/switch`);
  for (const id of src) if (!tgt.has(id)) bad(lv, `plate/switch id ${id} controls nothing`);
  if (lv.thread && !(lv.thread > 1)) bad(lv, 'bad thread');
}
console.log(`${ALL.length} levels, ${issues} bugs, ${notes} notes`);
console.log(issues ? 'MAP LINT FAILED' : 'MAPS OK');
process.exit(issues ? 1 : 0);
