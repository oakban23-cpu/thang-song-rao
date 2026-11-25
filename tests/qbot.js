// Bots float the krathong down every river: each must reach the moon's reflection, and the best pair should earn
// three stars; a clumsier pair should still make it (one star at least) on the early rivers.
const Loy = require('../js/loy.js'), QLEVELS = require('../js/qlevels.js'), loyCrew = require('./qcrew.js');
global.Loy = Loy;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
function play(lv, o) {
  const G = Loy.load(lv), think = loyCrew(G, o);
  let n = 0;
  while (!G.over && n < 400 * 120) { Loy.step(G, think()); n++; }
  return G;
}
const VERBOSE = process.argv.includes('-v');
QLEVELS.forEach((lv, i) => {
  const G = play(lv, { skill: 1, seed: 3 }), s = Loy.stars(G), st = G.stats;
  if (VERBOSE || !G.won) console.log(`  ${lv.name}: ${G.won ? 'moon' : G.why} t=${G.rt.toFixed(0)}/${lv.limit} score=${G.score} hull=${G.kr.hull} flame=${G.kr.flame.toFixed(0)} wishes=${st.wishes}/${lv.wish.length} blocked=${st.blocked}/${st.gusts} hits=${st.hits} sparks=${st.sparks} pushes=${st.pushes.pink}+${st.pushes.mint}`);
  ok(G.won && s === 3, `${lv.name}: the good pair floats it to the moon with three stars (${s}, ${G.score})`);
  const g2 = [0.6, 0.8].map(k => play(lv, { skill: k, seed: 7 + i }));
  if (VERBOSE) g2.forEach((g, j) => console.log(`    skill ${[0.6, 0.8][j]}: ${g.won ? 'moon' : g.why} score=${g.score} stars=${Loy.stars(g)}`));
  if (i < 3) ok(g2.some(g => g.won), `${lv.name}: a clumsier pair makes it too`);
});
console.log(fails ? fails + ' FAILED' : 'LOY BOTS OK');
process.exit(fails ? 1 : 0);
