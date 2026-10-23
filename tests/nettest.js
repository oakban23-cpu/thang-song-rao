// Two simulated phones (host = pink, guest = mint) over a delayed link, running the bot solutions.
const vm = require('vm'), fs = require('fs'), path = require('path');
const B = require('./bot.js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'physics.js'), 'utf8') + ';this.Phys=Phys;', ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'net.js'), 'utf8') + ';this.Net=Net;', ctx);
const { Phys, Net } = ctx;
const { LEVELS2, LEVELS3, LEVELS4, T, idle } = B;
const P3 = require('./bot3.js').plans;
const P4 = require('./bot4.js').plans;
const DELAY = +(process.argv.find(a => a.startsWith('--ms=')) || '--ms=100').slice(5);
const src = fs.readFileSync(path.join(__dirname, 'bot.js'), 'utf8');
let plansSrc = src.slice(src.indexOf('const plans = {'), src.indexOf('};\n\nlet fails') + 2);
plansSrc = plansSrc.replace(/ground\.ref === W\.pink/g, "ground.type === 'player'").replace(/ground\.ref === W\.mint/g, "ground.type === 'player'").replace(/ground\.ref === box\(W\)/g, "ground.type === 'box'");
const plans = new Function('go', 'hold', 'jump', 'wait', 'until', 'par', 'box', 'stone', 'T', 'hopTo', 'cx', plansSrc + '; return plans;')(B.go, B.hold, B.jump, B.wait, B.until, B.par, B.box, B.stone, T, B.hopTo, B.cx);

function playNet(def, plan) {
  const A = Phys.load(def), G = Phys.load(def);
  A.net = { role: 'host', local: 'pink' };
  G.net = { role: 'guest', local: 'mint' };
  const view = { get pink() { return A.pink; }, get mint() { return G.mint; }, get L() { return A.L; }, get swapN() { return A.swapN; }, get taut() { return A.taut; } };
  const qA = [], qG = []; // messages in flight to A / to G
  const D = Math.round(DELAY / 1000 / Phys.DT);
  let i = 0, k = 0;
  for (let t = 0; t < 60000; t++) {
    const now = t * Phys.DT * 1000;
    if (i >= plan.length) { if (++k > 1200) return { ok: false, why: 'plan done, no win' }; }
    const a = plan[Math.min(i, plan.length - 1)], inp = { pink: idle(), mint: idle() };
    if (i < plan.length && a.fn(view, inp, k)) { if (process.argv.includes('-v')) console.log('  done', a.name, 't', t, 'mintG', (G.mint.x / T).toFixed(2), ((G.mint.y + G.mint.h) / T).toFixed(2), G.mint.ground && G.mint.ground.type, 'Gbridge', G.L.bridges.map(b => b.on ? 1 : 0).join('')); i++; k = 0; continue; }
    while (qA.length && qA[0].at <= t) { const m = qA.shift().m; Net.applyPlayer(A, 'mint', m.p, now); }
    while (qG.length && qG[0].at <= t) { const m = qG.shift().m; Net.applyPlayer(G, 'pink', m.p, now); Net.applyWorld(G, m.w); }
    Net.smoothPlayer(A, 'mint', now);
    const evA = Phys.step(A, { pink: inp.pink, mint: A.mint.netInp || idle() });
    Net.smoothPlayer(G, 'pink', now); Net.smoothWorld(G);
    Phys.step(G, { pink: idle(), mint: inp.mint });
    if (t % 4 === 0) {
      qG.push({ at: t + D, m: JSON.parse(JSON.stringify({ p: Net.encodePlayer(A, 'pink', inp.pink), w: Net.encodeWorld(A) })) });
      qA.push({ at: t + D, m: JSON.parse(JSON.stringify({ p: Net.encodePlayer(G, 'mint', inp.mint) })) });
    }
    if (process.argv.includes('-vv') && t >= 900 && t <= 1060 && t % 8 === 0) console.log('   t', t, 'Abr', A.L.bridges.map(b => b.on ? 1 : 0).join(''), 'Gbr', G.L.bridges.map(b => b.on ? 1 : 0).join(''), 'Atog', JSON.stringify(A.L.tog), 'Amint', (A.mint.x / T).toFixed(2), 'qG', qG.length);
    if (i < plan.length) k++;
    if (A.dead) return { ok: false, why: `pink died during "${a.name}"` };
    if (G.dead) return { ok: false, why: `mint died during "${a.name}"` };
    if (evA.includes('win')) return { ok: true, secs: t * Phys.DT };
    if (process.argv.includes('-v') && k % 60 === 1) console.log('   ', a.name, 'stone', A.L.boxes.find(b=>b.heavy) ? (A.L.boxes.find(b=>b.heavy).x/T).toFixed(2) : '-', 'box', A.L.boxes.filter(b=>!b.heavy).map(b=>(b.x/T).toFixed(2)).join(','), 'lift', A.L.lifts.map(l=>(l.y/T).toFixed(2)).join(','), 'pink', (A.pink.x/T).toFixed(2), ((A.pink.y+A.pink.h)/T).toFixed(2), 'mintA', (A.mint.x/T).toFixed(2), ((A.mint.y+A.mint.h)/T).toFixed(2), 'g', A.mint.ground && A.mint.ground.type, 'tog', JSON.stringify(A.L.tog), 'B', A.L.bridges.map(b=>b.on?1:0).join(''), 'mintG', (G.mint.x/T).toFixed(2), ((G.mint.y+G.mint.h)/T).toFixed(2));
    if (k > (a.timeout || 900) * 2) return { ok: false, why: `timeout in "${a.name}" pink=(${(A.pink.x / T).toFixed(2)},${((A.pink.y + A.pink.h) / T).toFixed(2)}) mintG=(${(G.mint.x / T).toFixed(2)},${((G.mint.y + G.mint.h) / T).toFixed(2)}) mintA=(${(A.mint.x / T).toFixed(2)},${((A.mint.y + A.mint.h) / T).toFixed(2)})` };
  }
  return { ok: false, why: 'too long' };
}
let fails = 0;
const only = (process.argv.find(a => a.startsWith('--lvl=')) || '').slice(6);
const suites = [[LEVELS2, plans], [LEVELS3, P3], [LEVELS4, P4]];
for (const [defs, pl] of suites) for (const def of defs.filter(d => !only || d.name === only)) {
  const r = playNet(def, pl[def.name]);
  console.log((r.ok ? 'PASS ' : 'FAIL ') + def.name + (r.ok ? ` (${r.secs.toFixed(1)}s @${DELAY}ms)` : ' — ' + r.why));
  if (!r.ok) fails++;
}
console.log(fails ? fails + ' FAILED' : 'ONLINE OK');
process.exit(fails ? 1 : 0);
