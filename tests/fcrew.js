/* The no-farting duo for the bots (tests) and the browser pilots. Needs Fart. fartCrew(G, opt) returns a function
   giving { gas: { hold, release }, cover: { cough, chair } } for the next step of G (presses carry the time).
   opt: react (s for the cover player to react to a release), think (s between the gas player's decisions), target
   (how much gas to let build before letting go when nothing noisy is on), miss (chance the cover player misses one),
   seed. */
function fartRng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function fartCrew(G, opt = {}) {
  const R = fartRng(opt.seed || 1), react = opt.react == null ? 0.2 : opt.react, think = opt.think == null ? 0.1 : opt.think, miss = opt.miss || 0;
  const def = G.def, quiet = !def.ambient || def.ambient.kinds.every(k => k === 'thunder');
  const target = opt.target || (quiet ? 40 : 52), handled = new Set();
  let next = 0, want = target * (0.85 + R() * 0.3);
  const pending = [];                                               // cover presses planned for later (reaction time)
  return () => {
    const t = G.t, out = { gas: { hold: false, release: null }, cover: { cough: null, chair: null } };
    if (G.st !== 'run') return out;
    // the gas player
    if (t >= next) {
      next = t + think * (0.6 + R() * 0.8);
      const amb = G.amb.find(([a, b]) => t >= a && b - t > Fart.DELAY + 0.15), smelly = def.fan > 0 && G.P >= Fart.SMELL - 5;
      const fanOk = !smelly || !Fart.fanToward(def, t + Fart.DELAY);
      const waiting = G.farts.some(f => !f.judged && f.ts > t - 0.2);
      if (!waiting && fanOk && ((amb && G.P >= 15 && amb[2] >= G.P) || G.P >= want || G.strain > 80)) { out.gas.release = t; want = target * (0.85 + R() * 0.3); }
      G._hold = G.P > 82 && G.strain < 75 && !(fanOk && G.P >= want);
    }
    out.gas.hold = !!G._hold;
    // the cover player: sees a release react seconds later and picks the noise that will cover it
    for (const f of G.farts) {
      const key = r(f.t);
      if (handled.has(key) || f.judged) continue;
      if (t < f.t + react) continue;
      handled.add(key);
      if (R() < miss) continue;
      if (Fart.ambientAt(G, f.ts) >= f.size || f.size < Fart.QUIET) continue;
      const chairReady = t - G.last.chair >= Fart.CHAIR.cd;
      const kind = f.size > Fart.COUGH.str && chairReady ? 'chair' : 'cough', K = Fart[kind.toUpperCase()];
      if (f.ts - K.from > t) pending.push({ at: Math.max(t, f.ts - K.to + 0.05), kind });
    }
    for (let i = pending.length - 1; i >= 0; i--) if (pending[i].at <= t) { out.cover[pending[i].kind] = t; pending.splice(i, 1); }
    return out;
  };
  function r(v) { return Math.round(v * 1000); }
}
