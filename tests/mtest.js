// Rhythm rules: the chart, hit windows, shared combo and band energy, chords, fever, and the online exchange.
const { Rhy, MLEVELS, playSong, rng, pressesFor } = require('./mbot.js');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const S1 = MLEVELS[0];

for (const def of MLEVELS) {
  const C = Rhy.compile(def);
  ok(C.notes.length > 30 && C.chords >= 5 && def.tips.length === 3 && def.hint && def.stars.length === 3 && C.end < 70, `${def.name}: ${C.notes.length} notes, ${C.chords} chords, ${C.end.toFixed(0)}s, hint and tips`);
  ok(C.notes.every((n, i) => i === 0 || n.t >= C.notes[i - 1].t) && C.notes.every(n => n.lane >= 0 && n.lane <= 3 && (n.lane < 2) === (n.who === 'pink')), `${def.name}: notes in order and in the right player's lanes`);
  ok(C.count.length === 4 && C.count[3].t < C.notes[0].t + 1e-6 && C.back.length > 20, `${def.name}: four count-in beats before the first note, ching-chap on every beat`);
}
{ const C = Rhy.compile(S1); const last = C.notes.filter(n => Math.abs(n.t - C.notes[C.notes.length - 1].t) < 1e-4);
  ok(last.length === 3 && last.every(n => n.sync >= 0), 'the last beat of song 1 is a three-note chord (both drums and a high note)'); }

// windows
{ const G = Rhy.load(S1), n = G.notes[0];
  ok(Rhy.hit(G, n.lane, n.t + 0.03).res === 'perfect', 'within 45 ms is perfect');
  const G2 = Rhy.load(S1); ok(Rhy.hit(G2, n.lane, n.t - 0.07).res === 'good', 'within 90 ms is good');
  const G3 = Rhy.load(S1); ok(Rhy.hit(G3, n.lane, n.t + 0.12).res === 'ok', 'within 135 ms is ok');
  const G4 = Rhy.load(S1); ok(Rhy.hit(G4, n.lane, n.t + 0.2) === null, 'later than that hits nothing');
  const G5 = Rhy.load(S1); Rhy.hit(G5, n.lane, n.t); ok(Rhy.hit(G5, n.lane, n.t + 0.01) === null || Rhy.hit(G5, n.lane, n.t + 0.01).id !== n.id, 'a note cannot be hit twice');
  const G6 = Rhy.load(S1); ok(Rhy.hit(G6, n.lane === 0 ? 1 : 0, n.t) === null, 'the wrong lane does not hit it');
  const G7 = Rhy.load(S1); const e7 = Rhy.hit(G7, n.lane, n.t - 0.18);
  ok(e7 && e7.id === n.id && e7.res === 'miss' && Rhy.hit(G7, n.lane, n.t) === null, 'pressing 180 ms too early spends the note as a miss');
  const G8 = Rhy.load(S1); ok(Rhy.hit(G8, n.lane, n.t - 0.3) === null && !G8.notes[n.id].res, 'a press far before any note does nothing'); }
{ // mashing every lane as fast as fingers go cannot clear a song
  for (const def of MLEVELS) { const r = playSong(def, { seed: 4, both: { mash: 16 } }); ok(r.stars === 0, `${def.name}: mashing 16 presses a second each gets no star (${(r.acc * 100).toFixed(0)}%${r.failed ? ', band fell apart' : ''})`); } }

// shared combo, multiplier, energy
{ const G = Rhy.load(S1); const first = G.notes.slice(0, 12);
  for (const n of first) Rhy.hit(G, n.lane, n.t);
  Rhy.settle(G, first[11].t + 0.01);
  ok(G.combo === 12 && G.score === 10 * 100 + 2 * 150, `combo counts up and the 11th note on scores x1.5 (score ${G.score}, combo ${G.combo})`); }
{ const G = Rhy.load(S1); const notes = G.notes;
  for (const n of notes.slice(0, 5)) Rhy.hit(G, n.lane, n.t);
  Rhy.expire(G, notes[5].t + 0.2); Rhy.settle(G, notes[5].t + 0.2);
  ok(G.combo === 0 && G.stats.miss >= 1 && G.energy < Rhy.E0 + 5 * 3, 'a miss breaks the shared combo and costs band energy'); }
{ const r = playSong(S1, { seed: 3, both: { sd: 10 }, mint: null });
  ok(r.failed && r.G.over && r.stars === 0, 'if one player stops playing, the band runs out of energy and the song fails'); }

// chords: hit together for a bonus; four in a row light the band up
{ const def = { name: 't', bpm: 120, div: 2, stars: [.5, .7, .9], sections: [{ p: 'o.o.o.o.|o.o.o.o.|o.......', m: 'c.c.c.c.|c.c.c.c.|c.......' }] };
  const G = Rhy.load(def), N = G.notes;
  for (const n of N) Rhy.hit(G, n.lane, n.t + (n.who === 'pink' ? 0.01 : -0.01));
  Rhy.settle(G, 99);
  ok(G.stats.sync === N.length / 2, `every chord hit within 40 ms of each other is in sync (${G.stats.sync}/${N.length / 2})`);
  ok(G.stats.fevers >= 1 && G.fever > N[0].t, 'four tight chords in a row start a fever');
  const G2 = Rhy.load(def);
  for (const n of G2.notes) Rhy.hit(G2, n.lane, n.t + (n.who === 'pink' ? 0.035 : -0.035));
  Rhy.settle(G2, 99);
  ok(G2.stats.sync === 0 && G2.stats.fevers === 0 && G2.stats.good + G2.stats.perfect === G2.notes.length, 'both hit the chord but 70 ms apart: no bonus');
  ok(G.score > G2.score * 1.5, `in sync and on fire scores far more (${G.score} vs ${G2.score})`); }

// online: two phones exchange their own results; both end with the same score as one phone with both players
for (const def of MLEVELS.slice(0, 3)) {
  const ref = Rhy.load(def), H = Rhy.load(def), U = Rhy.load(def), R = rng(5);
  H.local = 'pink'; U.local = 'mint';
  const pp = pressesFor(ref, 'pink', { sd: 25, forget: 0.03 }, R), mp = pressesFor(ref, 'mint', { sd: 25, forget: 0.03 }, R);
  const all = pp.concat(mp).sort((a, b) => a.t - b.t);
  const D = 0.15, q = [];                                        // messages in flight
  let ip = 0, im = 0, ia = 0;
  for (let t = 0; t < ref.C.end + 3; t += 1 / 120) {
    while (ia < all.length && all[ia].t <= t) { Rhy.hit(ref, all[ia].lane, all[ia].t); ia++; }
    while (ip < pp.length && pp[ip].t <= t) { Rhy.hit(H, pp[ip].lane, pp[ip].t); ip++; }
    while (im < mp.length && mp[im].t <= t) { Rhy.hit(U, mp[im].lane, mp[im].t); im++; }
    Rhy.expire(ref, t); Rhy.expire(H, t, ['pink']); Rhy.expire(U, t, ['mint']);
    if (Math.round(t * 120) % 4 === 0) { q.push({ at: t + D, to: U, l: Rhy.recent(H, 'pink', t) }); q.push({ at: t + D, to: H, l: Rhy.recent(U, 'mint', t) }); }
    while (q.length && q[0].at <= t) { const m = q.shift(); Rhy.merge(m.to, m.l); }
    Rhy.settle(ref, t); Rhy.settle(H, t); Rhy.settle(U, t);
  }
  ok(H.score === ref.score && U.score === ref.score && H.stats.sync === ref.stats.sync, `${def.name}: both phones agree with one phone playing both (${ref.score}, sync ${ref.stats.sync})`);
}
{ const G = Rhy.load(S1); G.local = 'pink'; const mintNote = G.notes.find(n => n.who === 'mint');
  for (const n of G.notes) if (n.who === 'pink' && n.t < mintNote.t) Rhy.hit(G, n.lane, n.t);
  Rhy.expire(G, mintNote.t + 0.5, ['pink']); Rhy.settle(G, mintNote.t + 0.5);
  ok(!mintNote.res && G.next <= mintNote.id, 'online: the host waits for the partner’s result before scoring that beat');
  Rhy.settle(G, mintNote.t + 2);
  ok(mintNote.res === 'miss' && G.next > mintNote.id, 'and counts it as missed if it never arrives'); }

console.log(fails ? `${fails} FAILED` : 'RHYTHM OK');
process.exit(fails ? 1 : 0);
