/* Duo rhythm (ดนตรีจังหวะคู่): notes fall down four lanes, two for each player. The band shares one combo and one
   energy bar: a miss by either player breaks the combo and drains the band. Notes of both players on the same beat
   are a "chord": hit together (within 40 ms of each other) for a bonus; four tight chords in a row light the band up
   (fever, double points for a while). The clock is song seconds; nothing here touches audio or the DOM. */
const Rhy = (() => {
  'use strict';
  const WIN = { perfect: 0.045, good: 0.09, ok: 0.135, early: 0.22 };   // a press this early uses the note up as a miss
  const BASE = { perfect: 100, good: 60, ok: 30 };
  const SYNC_WIN = 0.04, SYNC_BONUS = 50, FEVER_STREAK = 4, FEVER_BEATS = 16;
  const E0 = 60, E_HIT = 2, E_PERFECT = 3, E_MISS = 8;
  const LATE = 1.2;                                     // online: a partner's note still unknown this long after is a miss
  // pentatonic, roughly how Thai melodies sit on a western keyboard: c d e g a (and an octave up in capitals)
  const SCALE = { c: 60, d: 62, e: 64, g: 67, a: 69, C: 72, D: 74, E: 76, G: 79, A: 81 };
  const LANE_OF = { pink: [0, 1], mint: [2, 3] };
  const whoOf = lane => (lane < 2 ? 'pink' : 'mint');

  /* ---------- chart ----------
     A song is sections of patterns, one character per step (div steps per beat; '|' and spaces are ignored).
     pink:  o = low drum (lane 0), x = high drum (lane 1), b = both at once
     mint:  c d e g a = low notes (lane 2), C D E G A = high notes (lane 3)
     '.' is a rest. Any step where both players have a note is a chord. */
  function compile(def) {
    const spb = 60 / def.bpm, div = def.div || 2, step = spb / div;
    const lead = Math.max(2, 4 * spb);                  // a bar of count-in before the first beat
    const notes = [], back = [], secs = [];
    let t = lead, beat = 0;
    for (const sec of def.sections) {
      for (let r = 0; r < (sec.rep || 1); r++) {
        const p = (sec.p || '').replace(/[|\s]/g, ''), m = (sec.m || '').replace(/[|\s]/g, '');
        const len = Math.max(p.length, m.length, (sec.bars || 0) * 4 * div);
        secs.push({ t, label: sec.label || '', lead: sec.lead || null });
        for (let i = 0; i < len; i++) {
          const tt = Math.round((t + i * step) * 10000) / 10000, pc = p[i] || '.', mc = m[i] || '.';
          if (pc === 'o' || pc === 'b') notes.push({ t: tt, lane: 0, who: 'pink', pitch: 0 });
          if (pc === 'x' || pc === 'b') notes.push({ t: tt, lane: 1, who: 'pink', pitch: 1 });
          if (SCALE[mc] != null) notes.push({ t: tt, lane: mc === mc.toLowerCase() ? 2 : 3, who: 'mint', pitch: SCALE[mc] });
        }
        const beats = Math.ceil(len / div);
        for (let k = 0; k < beats; k++) back.push({ t: Math.round((t + k * spb) * 10000) / 10000, k: (beat + k) % 2 ? 'chap' : 'ching', down: (beat + k) % 4 === 0, bar: Math.floor((beat + k) / 4) });
        beat += beats; t += len * step;
      }
    }
    notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
    notes.forEach((n, i) => { n.id = i; n.sync = -1; });
    // chords: the same instant for both players
    let g = 0;
    for (let i = 0; i < notes.length;) {
      let j = i; while (j < notes.length && Math.abs(notes[j].t - notes[i].t) < 1e-4) j++;
      const grp = notes.slice(i, j);
      if (grp.some(n => n.who === 'pink') && grp.some(n => n.who === 'mint')) { for (const n of grp) n.sync = g; g++; }
      i = j;
    }
    const count = []; for (let k = 4; k >= 1; k--) count.push({ t: Math.round((lead - k * spb) * 10000) / 10000, n: k });
    return { notes, back, secs, count, spb, step, lead, end: t + 1.6, chords: g };
  }

  /* ---------- state ---------- */
  function load(def) {
    const C = compile(def);
    return { def, C, t: 0, notes: C.notes.map(n => Object.assign({}, n, { res: null, off: 0 })), next: 0,
      score: 0, combo: 0, maxCombo: 0, energy: E0, fever: -1, streak: 0, base: 0,
      stats: { perfect: 0, good: 0, ok: 0, miss: 0, sync: 0, fevers: 0 }, over: false, failed: false, net: null, local: null };
  }
  const judgeOf = d => (d <= WIN.perfect ? 'perfect' : d <= WIN.good ? 'good' : 'ok');
  // a key press for one lane at song time t: the nearest open note of that lane inside the window (or an early miss)
  function hit(G, lane, t) {
    let best = null, bd = WIN.ok + 1e-9;
    for (let i = G.next; i < G.notes.length; i++) {
      const n = G.notes[i];
      if (n.t > t + WIN.ok) break;
      if (n.lane !== lane || n.res) continue;
      const d = Math.abs(t - n.t);
      if (d < bd) { bd = d; best = n; }
    }
    if (!best) {
      // too early: the next open note of this lane, coming within 'early', is spent as a miss (so mashing cannot win)
      for (let i = G.next; i < G.notes.length; i++) {
        const n = G.notes[i];
        if (n.t > t + WIN.early) break;
        if (n.lane !== lane || n.res || n.t <= t) continue;
        n.off = Math.round((t - n.t) * 1000) / 1000; n.res = 'miss'; return n;
      }
      return null;
    }
    best.off = Math.round((t - best.t) * 1000) / 1000;             // whole ms, exactly what goes over the network
    best.res = judgeOf(Math.abs(best.off));
    return best;
  }
  // notes of the players this device judges that slid past the window are misses
  function expire(G, t, who) {
    const out = [];
    for (let i = G.next; i < G.notes.length; i++) {
      const n = G.notes[i];
      if (n.t > t - WIN.ok) break;
      if (!n.res && (!who || who.includes(n.who))) { n.res = 'miss'; out.push(n); }
    }
    return out;
  }
  // score notes strictly in order, once every note of a beat is decided; returns events for effects
  function settle(G, t) {
    const ev = [], N = G.notes;
    while (G.next < N.length && !G.over) {
      const n0 = N[G.next];
      let j = G.next; while (j < N.length && Math.abs(N[j].t - n0.t) < 1e-4) j++;
      const grp = N.slice(G.next, j);
      if (grp.some(n => !n.res)) {
        if (t > n0.t + WIN.ok + LATE) { for (const n of grp) if (!n.res) n.res = 'miss'; }  // never heard back: missed
        else break;
      }
      for (const n of grp) {
        const mult = (G.combo >= 25 ? 2 : G.combo >= 10 ? 1.5 : 1) * (n.t < G.fever ? 2 : 1);
        if (n.res === 'miss') {
          if (G.combo >= 10) ev.push('break');
          G.combo = 0; G.energy -= E_MISS; G.stats.miss++;
        } else {
          G.score += Math.round(BASE[n.res] * mult); G.base += BASE[n.res]; G.stats[n.res]++;
          G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
          G.energy = Math.min(100, G.energy + (n.res === 'perfect' ? E_PERFECT : E_HIT));
        }
      }
      if (n0.sync >= 0) {
        const hitAll = grp.every(n => n.res !== 'miss');
        const offs = grp.map(n => n.off), tight = hitAll && Math.max(...offs) - Math.min(...offs) <= SYNC_WIN;
        if (tight) {
          const mult = (G.combo >= 25 ? 2 : G.combo >= 10 ? 1.5 : 1) * (n0.t < G.fever ? 2 : 1);
          G.score += Math.round(SYNC_BONUS * mult); G.stats.sync++; G.streak++;
          ev.push('sync:' + n0.id);
          if (G.streak >= FEVER_STREAK && n0.t >= G.fever) { G.fever = n0.t + FEVER_BEATS * G.C.spb; G.streak = 0; G.stats.fevers++; ev.push('fever'); }
        } else G.streak = 0;
      }
      G.next = j;
      if (G.energy <= 0) { G.energy = 0; G.failed = true; G.over = true; ev.push('fail'); }
    }
    if (!G.over && G.next >= N.length && t >= G.C.end) { G.over = true; ev.push('end'); }
    return ev;
  }
  const accuracy = G => (G.notes.length ? G.base / (100 * G.notes.length) : 0);
  function stars(G) {
    if (G.failed) return 0;
    const a = accuracy(G), s = G.def.stars;
    return a >= s[2] ? 3 : a >= s[1] ? 2 : a >= s[0] ? 1 : 0;
  }

  /* ---------- online: each phone judges its own player and sends its recent results ---------- */
  const CODE = { perfect: 1, good: 2, ok: 3, miss: 4 }, RES = ['', 'perfect', 'good', 'ok', 'miss'];
  function recent(G, who, t, span = 2.5) {
    const out = [];
    for (let i = Math.max(0, G.next - 40); i < G.notes.length; i++) {
      const n = G.notes[i];
      if (n.t > t) break;
      if (n.who === who && n.res && n.t > t - span) out.push([n.id, CODE[n.res], Math.round(n.off * 1000)]);
    }
    return out;
  }
  function merge(G, list) {
    if (!Array.isArray(list)) return 0;
    let k = 0;
    for (const e of list) {
      if (!Array.isArray(e)) continue;
      const n = G.notes[e[0] | 0];
      if (!n || n.res || n.who === G.local || !RES[e[1]]) continue;
      n.res = RES[e[1]]; n.off = (+e[2] || 0) / 1000; k++;
    }
    return k;
  }
  function summary(G) { return { sc: G.score, cb: G.combo, mc: G.maxCombo, en: Math.round(G.energy), fv: Math.round(G.fever * 1000) / 1000, nx: G.next, b: G.base, st: G.stats, ov: G.over ? 1 : 0, fl: G.failed ? 1 : 0 }; }
  function applySummary(G, m) {
    if (!m) return;
    for (const [k, f] of [['sc', 'score'], ['cb', 'combo'], ['mc', 'maxCombo'], ['en', 'energy'], ['fv', 'fever'], ['b', 'base']]) if (Number.isFinite(m[k])) G[f] = m[k];
    if (m.st && typeof m.st === 'object') for (const k of Object.keys(G.stats)) if (Number.isFinite(m.st[k])) G.stats[k] = m.st[k];
    if (m.ov) G.over = true;
    if (m.fl) G.failed = true;
  }

  return { WIN, BASE, SYNC_WIN, SYNC_BONUS, FEVER_STREAK, FEVER_BEATS, E0, E_MISS, LANE_OF, SCALE, whoOf, compile, load, hit, expire, settle, accuracy, stars, recent, merge, summary, applySummary };
})();
