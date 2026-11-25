// A pair of bot players for the Loy Krathong river: they pick a lane ahead (clear of rocks, logs, pillars, whirlpools,
// the ferry and sparks; through the wishes), the one on the side the krathong must move away from scoops, standing a
// little upstream so the wave meets it; whoever's bank the wind comes from goes level with the krathong and shields.
// skill: 0..1 (how often they notice in time), seed for their mistakes.
function loyCrew(G, o = {}) {
  const L = typeof Loy !== 'undefined' ? Loy : require('../js/loy.js');
  const skill = o.skill == null ? 1 : o.skill;
  let s = (o.seed || 1) >>> 0 || 1;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const lag = { pink: 0, mint: 0 };
  let prev = null;                                                     // the lane they agreed on (they stick to it)
  return function think() {
    const k = G.kr, out = { pink: { mx: 0, my: 0, act: false, use: false }, mint: { mx: 0, my: 0, act: false, use: false } };
    if (G.over) return out;
    const sp = Math.max(20, -k.vy), look = 360;
    // the lane: cheapest x over the stretch just ahead
    let best = k.x, bestC = Infinity;
    for (let x = G.RL + L.KR + 6; x <= G.RR - L.KR - 6; x += 12) {
      let c = Math.abs(x - k.x) * 0.5 + (prev == null ? 0 : Math.abs(x - prev) * 0.35);
      const near = (hx, hy, r, w) => { const dy = k.y - hy; if (dy < -40 || dy > look) return; if (Math.abs(x - hx) < r + L.KR + 14) c += w * (1.4 - dy / look); };
      for (const r of G.rocks) near(r.x, r.y, r.r, 900);
      for (const p of G.pillars) near(p.x, p.y, p.w / 2 + 4, 1200);
      for (const w of G.whirls) near(w.x, w.y, w.r * 0.9, 700);
      for (const l of G.lotus) near(l.x, l.y, l.r * 0.8, 250);
      for (const l of G.logs) if (l.on || l.y > k.y - look) { const eta = Math.max(0, (k.y - l.y) / Math.max(6, sp + l.vy)); near(l.x + l.vx * eta, l.y + l.vy * eta, l.len / 2 + 6, 800); }
      for (const sp2 of G.sparks) if (sp2.t > 0) near(sp2.x, sp2.y, L.SPARK_R, 1500);
      for (const f of G.ferries) { const eta = Math.max(0, (k.y - f.y) / sp); near(L.ferryX(G, f, G.rt + eta), f.y, f.w / 2 + 8, 1000); }
      for (const w of G.wishes) if (!w.got) { const dy = k.y - w.y; if (dy > -10 && dy < look && Math.abs(x - w.x) < 16) c -= 260 * (1.2 - dy / look); }
      c += (x < G.RL + 40 || x > G.RR - 40) ? 80 : 0;
      if (c < bestC) { bestC = c; best = x; }
    }
    prev = best;
    const inWhirl = G.whirls.some(w => Math.hypot(k.x - w.x, k.y - w.y) < w.r), want = best - (k.x + k.vx * (inWhirl ? 0 : 0.7)), g = L.gustNow(G);
    for (const id of ['pink', 'mint']) {
      const p = G.p[id], q = out[id], bx = id === 'pink' ? G.RL : G.RR, travel = Math.abs(k.x - bx) / L.WAVE_V;
      let ty = k.y - sp * travel - 6;
      const myGust = g && g.side === id;
      if (myGust) ty = k.y - 10;
      const dy = ty - p.y; q.my = Math.max(-1, Math.min(1, dy / 22));
      const tx = id === 'pink' ? G.RL - 22 : G.RR + 22; q.mx = Math.max(-1, Math.min(1, (tx - p.x) / 20));
      if (myGust && g.ph === 'on') q.use = Math.abs(p.y - k.y) < L.SHIELD_DY;
      if (myGust && g.ph === 'warn' && Math.abs(p.y - k.y) < L.SHIELD_DY * 0.8) q.use = true;
      const pending = G.waves.some(w => w.s === id && !w.hit && w.r < Math.hypot(k.x - w.ox, k.y - w.oy));
      const need = id === 'pink' ? want > 16 : want < -16;
      if (lag[id] > 0) lag[id]--;
      if (need && (!pending || inWhirl) && p.cd <= 0 && lag[id] <= 0 && Math.abs(dy) < 50 && !(myGust && q.use)) {
        if (rnd() < skill) q.act = true; else lag[id] = 60;
      }
    }
    return out;
  };
}
if (typeof module !== 'undefined') module.exports = loyCrew;
