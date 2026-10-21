const Net = (() => {
  'use strict';
  const { DT, approach } = Phys;
  const r1 = v => Math.round(v * 10) / 10;
  const bits = arr => arr.map(v => (v ? '1' : '0')).join('');
  const other = (W, p) => (p === W.pink ? W.mint : W.pink);

  function groundCode(W, p) {
    const g = p.ground;
    if (!g) return '';
    if (g.type === 'player') return 'p';
    if (g.type === 'box') { const i = W.L.boxes.indexOf(g.ref); return i >= 0 ? 'b' + i : 't'; }
    if (g.type === 'lift') { const i = W.L.lifts.indexOf(g.ref); return i >= 0 ? 'l' + i : 't'; }
    return 't';
  }
  function groundFrom(W, code, p) {
    if (!code) return null;
    if (code === 'p') return { type: 'player', ref: other(W, p) };
    const i = +code.slice(1);
    if (code[0] === 'b' && W.L.boxes[i]) return { type: 'box', ref: W.L.boxes[i] };
    if (code[0] === 'l' && W.L.lifts[i]) return { type: 'lift', ref: W.L.lifts[i] };
    return { type: 'tile' };
  }

  function encodePlayer(W, id, inp) {
    const p = W[id];
    return { x: r1(p.x), y: r1(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), f: p.face, g: groundCode(W, p), i: (inp.left ? 1 : 0) | (inp.right ? 2 : 0) | (inp.jump ? 4 : 0) };
  }
  function encodeWorld(W) {
    const L = W.L;
    return {
      b: L.boxes.map(b => [r1(b.x), r1(b.y)]),
      l: L.lifts.map(l => r1(l.y)),
      d: bits(L.doors.map(d => d.open)),
      br: bits(L.bridges.map(b => b.on)),
      pd: bits(L.plates.map(p => p.down)),
      pl: L.plates.map(p => Math.min(9, p.load || 0)),
      tg: Object.keys(L.tog).filter(k => L.tog[k]).map(Number),
      h: bits(L.hearts.map(h => h.got)),
      n: W.inDoor || 0
    };
  }

  function valid(m) { return m && typeof m === 'object' && Number.isFinite(m.x) && Number.isFinite(m.y) && Math.abs(m.x) < 2000 && Math.abs(m.y) < 2000; }
  function applyPlayer(W, id, m, now) {
    if (!valid(m)) return;
    const p = W[id];
    if (!p.net) { p.x = m.x; p.y = m.y; }
    p.net = { x: m.x, y: m.y, vx: +m.vx || 0, vy: +m.vy || 0, at: now };
    if (m.f === 1 || m.f === -1) p.face = m.f;
    p.ground = groundFrom(W, typeof m.g === 'string' ? m.g : '', p);
    const i = m.i | 0;
    p.netInp = { left: !!(i & 1), right: !!(i & 2), jump: !!(i & 4), jp: false };
  }
  function smoothPlayer(W, id, now) {
    const p = W[id], n = p.net, ox = p.x, oy = p.y;
    if (n) {
      const age = Math.min(0.1, Math.max(0, (now - n.at) / 1000));
      const tx = n.x + n.vx * age, ty = p.ground ? n.y : n.y + n.vy * age;
      if (Math.abs(tx - p.x) > 80 || Math.abs(ty - p.y) > 80) { p.x = tx; p.y = ty; }
      else { p.x += (tx - p.x) * 0.3; p.y += (ty - p.y) * 0.3; }
      p.vx = n.vx; p.vy = n.vy;
    }
    p.dx = p.x - ox; p.dy = p.y - oy;
    p.walk = p.ground && Math.abs(p.vx) > 20 ? p.walk + DT * Math.abs(p.vx) / 14 : 0;
    p.sq = approach(p.sq, 0, DT * 5);
  }

  function applyWorld(W, w) {
    if (!w || typeof w !== 'object') return;
    const L = W.L;
    if (Array.isArray(w.b)) w.b.forEach((v, i) => {
      const b = L.boxes[i];
      if (!b || !Array.isArray(v) || !Number.isFinite(v[0]) || !Number.isFinite(v[1])) return;
      if (b.tx == null) { b.x = v[0]; b.y = v[1]; }
      b.tx = v[0]; b.ty = v[1];
    });
    if (Array.isArray(w.l)) w.l.forEach((v, i) => { const l = L.lifts[i]; if (l && Number.isFinite(v)) l.ty = v; });
    const bit = (s, i, d) => (typeof s === 'string' && i < s.length ? s[i] === '1' : d);
    L.doors.forEach((d, i) => { d.open = bit(w.d, i, d.open); });
    L.bridges.forEach((b, i) => { b.on = bit(w.br, i, b.on); });
    L.plates.forEach((p, i) => { p.down = bit(w.pd, i, p.down); p.load = Array.isArray(w.pl) ? +w.pl[i] || 0 : p.load; });
    if (Array.isArray(w.tg)) { L.tog = {}; w.tg.forEach(id => { L.tog[id] = true; }); }
    let got = 0;
    L.hearts.forEach((h, i) => { h.got = bit(w.h, i, h.got); if (h.got) got++; });
    W.heartsGot = got;
    W.inDoor = +w.n || 0;
  }
  function smoothWorld(W) {
    const L = W.L;
    for (const b of L.boxes) {
      const ox = b.x, oy = b.y;
      if (b.tx != null) {
        const dx = b.tx - b.x, dy = b.ty - b.y;
        if (Math.abs(dx) > 64 || Math.abs(dy) > 64) { b.x = b.tx; b.y = b.ty; }
        else { b.x += Math.abs(dx) < 0.2 ? dx : dx * 0.35; b.y += Math.abs(dy) < 0.2 ? dy : dy * 0.35; }
      }
      b.dx = b.x - ox; b.dy = b.y - oy;
    }
    for (const l of L.lifts) {
      const oy = l.y;
      if (l.ty != null) { const d = l.ty - l.y; l.y += Math.abs(d) < 0.3 ? d : d * 0.35; }
      l.dy = l.y - oy;
    }
    for (const d of L.doors) d.anim = approach(d.anim, d.open ? 1 : 0, DT * 7);
    for (const b of L.bridges) b.anim = approach(b.anim, b.on ? 1 : 0, DT * 8);
    for (const p of L.plates) p.anim = approach(p.anim, p.down ? 1 : 0, DT * 12);
    for (const t of L.toggles) t.anim = approach(t.anim, L.tog[t.id] ? 1 : 0, DT * 10);
  }

  return { encodePlayer, encodeWorld, applyPlayer, smoothPlayer, applyWorld, smoothWorld };
})();
