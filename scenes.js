/* Procedural "camera" scenes for the simulated walkthrough.
   Abstract shapes only: these are illustrations, not footage, and they match the financial-sector scene types of demo/synthetic_corpus.py.
   drawScene(ctx, scene, t, w, h, seed) draws the scene at time t (seconds). */
(() => {
'use strict';
const TAU = Math.PI * 2;
const rnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const C = { ground: '#1b1f24', road: '#23272d', lane: 'rgba(230,225,210,.35)', wall: '#2a2f37', floor: '#20242a',
  shelf: '#38404b', ink: '#d9d3c4', car: ['#6f8fbf', '#c98a5a', '#8fb38a', '#b8b2a4', '#a77fb5'], person: '#e6dfcf', accent: '#e4d8b8' };

function car(ctx, x, y, w, h, col, dir = 1) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h * .3); ctx.fill();
  ctx.fillStyle = 'rgba(10,12,16,.55)'; ctx.fillRect(x - w * .12 * dir - w * .1, y - h * .34, w * .2, h * .68);
  ctx.fillStyle = 'rgba(255,240,200,.85)'; ctx.fillRect(x + dir * w / 2 - (dir > 0 ? 2 : 0), y - h * .32, 2, h * .2); ctx.fillRect(x + dir * w / 2 - (dir > 0 ? 2 : 0), y + h * .12, 2, h * .2);
}
function person(ctx, x, y, r, a = 0, col = C.person, lying = false) {
  ctx.fillStyle = col;
  if (lying) { ctx.beginPath(); ctx.roundRect(x - r * 2.2, y - r * .7, r * 4.4, r * 1.4, r * .7); ctx.fill(); return; }
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, r * .45); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 2, y + Math.sin(a) * r * 2); ctx.stroke();
}
function road(ctx, w, y, h, dashed = true, t = 0) {
  ctx.fillStyle = C.road; ctx.fillRect(0, y, w, h);
  if (dashed) { ctx.strokeStyle = C.lane; ctx.lineWidth = 2; ctx.setLineDash([w * .04, w * .03]); ctx.lineDashOffset = -t * 10; ctx.beginPath(); ctx.moveTo(0, y + h / 2); ctx.lineTo(w, y + h / 2); ctx.stroke(); ctx.setLineDash([]); }
}
function smoke(ctx, x, y, t, s, n = 26) {
  const r = rnd(s);
  for (let i = 0; i < n; i++) { const life = ((t * .35 + r()) % 1), px = x + (r() - .5) * 30 + life * 40 * (r() - .3), py = y - life * 140, rad = 8 + life * 34;
    ctx.fillStyle = `rgba(150,150,158,${.32 * (1 - life)})`; ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill(); }
}
const W = (ctx, w, h, col = C.floor) => { ctx.fillStyle = col; ctx.fillRect(0, 0, w, h); };

const SCENES = {
  traffic(ctx, t, w, h, s) { W(ctx, w, h, C.ground); road(ctx, w, h * .3, h * .4, true, t); const r = rnd(s);
    for (let i = 0; i < 5; i++) { const dir = i % 2 ? -1 : 1, sp = 40 + r() * 50, x = ((r() * w + dir * t * sp) % (w + 120) + w + 120) % (w + 120) - 60; car(ctx, x, h * (dir > 0 ? .4 : .6), w * .11, h * .085, C.car[i % 5], dir); } },
  parking(ctx, t, w, h, s) { W(ctx, w, h, C.ground); ctx.strokeStyle = C.lane; ctx.lineWidth = 1.5; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(w * (.08 + i * .1), h * .15); ctx.lineTo(w * (.08 + i * .1), h * .4); ctx.moveTo(w * (.08 + i * .1), h * .6); ctx.lineTo(w * (.08 + i * .1), h * .85); ctx.stroke(); }
    for (let i = 0; i < 8; i++) if (i !== 3) { car(ctx, w * (.13 + i * .1), h * .28, w * .06, h * .17, C.car[i % 5]); }
    for (let i = 0; i < 7; i++) car(ctx, w * (.13 + i * .1 + (i === 5 ? 0 : 0)), h * .72, w * .06, h * .17, C.car[(i + 2) % 5]);
    const k = Math.min(1, (t % 8) / 5); car(ctx, w * (.43), h * (.5 - .22 * k), w * .06, h * .17, '#d8c28a'); },
  sidewalk(ctx, t, w, h, s) { W(ctx, w, h, C.ground); road(ctx, w, h * .62, h * .3, true, t); ctx.fillStyle = '#2b3036'; ctx.fillRect(0, h * .3, w, h * .3); for (let i = 0; i < 6; i++) { ctx.fillStyle = '#323843'; ctx.fillRect(w * (i / 6), 0, w / 6 - 6, h * .28); }
    const r = rnd(s); for (let i = 0; i < 7; i++) { const dir = r() > .5 ? 1 : -1, x = ((r() * w + dir * t * (14 + r() * 12)) % w + w) % w; person(ctx, x, h * (.36 + r() * .2), h * .022, dir > 0 ? 0 : Math.PI); } },
  crossing(ctx, t, w, h, s) { W(ctx, w, h, C.ground); road(ctx, w, h * .3, h * .4, false); ctx.fillStyle = 'rgba(230,225,210,.5)'; for (let i = 0; i < 7; i++) ctx.fillRect(w * .44, h * (.32 + i * .055), w * .12, h * .03);
    const k = (t % 9) / 9; person(ctx, w * .5, h * (.25 + .5 * k), h * .022, Math.PI / 2); person(ctx, w * .47, h * (.22 + .5 * Math.max(0, k - .1)), h * .022, Math.PI / 2); car(ctx, w * .3, h * .4, w * .11, h * .085, C.car[0]); car(ctx, w * .72, h * .6, w * .11, h * .085, C.car[2], -1); },
  store(ctx, t, w, h, s) { W(ctx, w, h); for (let i = 0; i < 4; i++) { ctx.fillStyle = C.shelf; ctx.fillRect(w * .1, h * (.15 + i * .2), w * .8, h * .07); for (let j = 0; j < 22; j++) { ctx.fillStyle = C.car[(i + j) % 5]; ctx.globalAlpha = .55; ctx.fillRect(w * (.11 + j * .036), h * (.16 + i * .2), w * .025, h * .05); } ctx.globalAlpha = 1; }
    const r = rnd(s); for (let i = 0; i < 4; i++) { const sp = 10 + r() * 14, x = w * .12 + ((t * sp + r() * w) % (w * .76)); person(ctx, x, h * (.25 + (i % 3) * .2), h * .022, 0); } },
  counter(ctx, t, w, h, s) { W(ctx, w, h); ctx.fillStyle = '#3a414c'; ctx.fillRect(w * .62, h * .12, w * .08, h * .76); person(ctx, w * .76, h * .45, h * .024, Math.PI);
    for (let i = 0; i < 5; i++) { const step = Math.max(0, Math.sin(t * .7 + i) * 2); person(ctx, w * (.55 - i * .09) + step, h * .45, h * .022, 0); } ctx.fillStyle = C.accent; ctx.fillRect(w * .6, h * .42 + Math.sin(t * 2) * 3, 8, 6); },
  office(ctx, t, w, h, s) { W(ctx, w, h); for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { const x = w * (.14 + j * .2), y = h * (.2 + i * .27); ctx.fillStyle = '#3a414c'; ctx.fillRect(x, y, w * .13, h * .1); ctx.fillStyle = 'rgba(150,190,230,.5)'; ctx.fillRect(x + w * .04, y + h * .015, w * .05, h * .035); person(ctx, x + w * .065, y + h * .16 + Math.sin(t * 1.3 + i + j) * .8, h * .02, -Math.PI / 2); } },
  fuel(ctx, t, w, h, s) { W(ctx, w, h, C.ground); ctx.fillStyle = 'rgba(228,216,184,.08)'; ctx.fillRect(w * .15, h * .15, w * .7, h * .7); for (let i = 0; i < 3; i++) { ctx.fillStyle = '#4a5260'; ctx.fillRect(w * (.28 + i * .2), h * .45, w * .03, h * .1); }
    const k = Math.min(1, (t % 10) / 4); car(ctx, -w * .1 + k * w * .5, h * .35, w * .11, h * .085, C.car[1]); car(ctx, w * .7, h * .65, w * .11, h * .085, C.car[3], -1); person(ctx, w * .67, h * .55, h * .022, -Math.PI / 2); },
  fire(ctx, t, w, h, s) { W(ctx, w, h, C.ground); ctx.fillStyle = C.wall; ctx.fillRect(w * .2, h * .35, w * .35, h * .5); for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(255,190,90,.35)'; ctx.fillRect(w * (.23 + (i % 3) * .1), h * (.42 + Math.floor(i / 3) * .18), w * .06, h * .08); }
    const f = .6 + .4 * Math.sin(t * 9); ctx.fillStyle = `rgba(255,${120 + 60 * f},60,.75)`; ctx.beginPath(); ctx.ellipse(w * .37, h * .36, w * .05 * f + 6, h * .06, 0, 0, TAU); ctx.fill(); smoke(ctx, w * .37, h * .32, t, s, 34);
    for (let i = 0; i < 3; i++) person(ctx, w * (.68 + i * .06) + t * 6 % 40, h * (.7 - i * .05), h * .02, 0); },
  fall(ctx, t, w, h, s) { W(ctx, w, h, C.ground); ctx.fillStyle = '#2b3036'; ctx.fillRect(0, h * .4, w, h * .25); const k = (t % 10) / 10, x = w * (.1 + Math.min(k, .45) * 1.2);
    person(ctx, x, h * .52, h * .024, 0, C.person, k > .45); if (k > .45) { ctx.strokeStyle = 'rgba(228,216,184,.5)'; ctx.beginPath(); ctx.arc(x, h * .52, h * .07 + (k - .45) * 20, 0, TAU); ctx.stroke(); } person(ctx, w * .8, h * .48, h * .022, Math.PI); },
  struggle(ctx, t, w, h, s) { W(ctx, w, h); ctx.fillStyle = C.wall; ctx.fillRect(0, 0, w, h * .18); const o = Math.sin(t * 5) * h * .03, x = w * .5 + Math.sin(t * 1.7) * w * .05; person(ctx, x - h * .05 + o, h * .45, h * .026, 0); person(ctx, x + h * .05 + o, h * .45 + Math.cos(t * 5) * 2, h * .026, Math.PI); person(ctx, w * .15, h * .7, h * .022, 0); },
  crowd(ctx, t, w, h, s) { W(ctx, w, h, C.ground); const r = rnd(s), k = Math.min(1, ((t % 9) / 9) * 1.6); for (let i = 0; i < 26; i++) { const a = r() * TAU, d = (r() * .1 + k * (.15 + r() * .35)) * w; person(ctx, w * .5 + Math.cos(a) * d, h * .5 + Math.sin(a) * d * .6, h * .018, a); } },
  gathering(ctx, t, w, h, s) { W(ctx, w, h, C.ground); ctx.strokeStyle = 'rgba(228,216,184,.12)'; ctx.beginPath(); ctx.arc(w * .5, h * .5, h * .25, 0, TAU); ctx.stroke(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + Math.sin(t * .4) * .05; person(ctx, w * .5 + Math.cos(a) * h * .14, h * .5 + Math.sin(a) * h * .14, h * .022, a + Math.PI); } },
  restaurant(ctx, t, w, h, s) { W(ctx, w, h); for (let i = 0; i < 6; i++) { const x = w * (.2 + (i % 3) * .3), y = h * (.32 + Math.floor(i / 3) * .38); ctx.fillStyle = '#3a414c'; ctx.beginPath(); ctx.arc(x, y, h * .08, 0, TAU); ctx.fill(); for (let j = 0; j < 3; j++) { const a = j / 3 * TAU + i; person(ctx, x + Math.cos(a) * h * .12, y + Math.sin(a) * h * .12, h * .019, a + Math.PI); } }
    person(ctx, w * (.1 + (t * .04 % .8)), h * .52, h * .02, 0, C.accent); },
  platform(ctx, t, w, h, s) { W(ctx, w, h); ctx.fillStyle = '#2b3036'; ctx.fillRect(0, h * .55, w, h * .45); ctx.fillStyle = 'rgba(228,216,184,.6)'; ctx.fillRect(0, h * .55, w, 3); const k = Math.min(1, (t % 12) / 5);
    ctx.fillStyle = '#4d5a6c'; ctx.fillRect(-w + k * w * 1.05, h * .2, w * .95, h * .3); for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(180,210,240,.35)'; ctx.fillRect(-w + k * w * 1.05 + w * (.03 + i * .115), h * .26, w * .06, h * .1); }
    const r = rnd(s); for (let i = 0; i < 9; i++) person(ctx, w * (.08 + r() * .84), h * (.66 + r() * .22), h * .02, -Math.PI / 2); },
  warehouse(ctx, t, w, h, s) { W(ctx, w, h); for (let i = 0; i < 3; i++) { ctx.fillStyle = C.shelf; ctx.fillRect(w * .08, h * (.12 + i * .3), w * .84, h * .1); for (let j = 0; j < 10; j++) { ctx.fillStyle = '#8a7557'; ctx.fillRect(w * (.1 + j * .082), h * (.13 + i * .3), w * .06, h * .08); } }
    const x = w * (.1 + ((t * .08) % .8)); ctx.fillStyle = '#d2a640'; ctx.fillRect(x, h * .55, w * .08, h * .09); ctx.fillStyle = '#8a7557'; ctx.fillRect(x + w * .08, h * .56, w * .04, h * .07); person(ctx, w * .7, h * .28, h * .02, 0); },
  weather(ctx, t, w, h, s) { W(ctx, w, h, '#15191e'); road(ctx, w, h * .3, h * .4, true, t); const r = rnd(s); ctx.strokeStyle = 'rgba(170,190,215,.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 90; i++) { const x = r() * w, y = ((r() * h + t * 260) % h); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 10); ctx.stroke(); }
    for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,220,150,.08)'; ctx.beginPath(); ctx.ellipse(w * (.15 + i * .25), h * .5, w * .05, h * .03, 0, 0, TAU); ctx.fill(); } car(ctx, ((t * 50) % (w + 100)) - 50, h * .4, w * .11, h * .085, C.car[0]); },
  night(ctx, t, w, h, s) { W(ctx, w, h, '#0d0f13'); road(ctx, w, h * .4, h * .3, true, 0); for (let i = 0; i < 4; i++) { const g = ctx.createRadialGradient(w * (.15 + i * .24), h * .55, 0, w * (.15 + i * .24), h * .55, h * .3); g.addColorStop(0, 'rgba(255,196,120,.22)'); g.addColorStop(1, 'rgba(255,196,120,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); } },
  collision(ctx, t, w, h, s) { W(ctx, w, h, C.ground); road(ctx, w, h * .35, h * .3, false); ctx.fillStyle = C.road; ctx.fillRect(w * .42, 0, w * .16, h); const k = Math.min(1, (t % 10) / 4);
    car(ctx, w * (.05 + .4 * k), h * .5, w * .11, h * .085, C.car[0]); ctx.save(); ctx.translate(w * .5, h * (1.05 - .5 * k)); ctx.rotate(-Math.PI / 2); car(ctx, 0, 0, w * .11, h * .085, C.car[1]); ctx.restore();
    if (k >= 1) { const r = rnd(s); for (let i = 0; i < 14; i++) { const a = r() * TAU, d = 10 + ((t % 10) - 4) * 8 * r(); ctx.fillStyle = 'rgba(228,216,184,.7)'; ctx.fillRect(w * .5 + Math.cos(a) * d, h * .53 + Math.sin(a) * d, 2.5, 2.5); } } },
  object(ctx, t, w, h, s) { W(ctx, w, h); ctx.strokeStyle = 'rgba(228,216,184,.08)'; for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(w * i / 12, 0); ctx.lineTo(w * i / 12, h); ctx.stroke(); }
    ctx.fillStyle = '#c98a5a'; ctx.fillRect(w * .48, h * .5, w * .035, h * .06); ctx.strokeStyle = 'rgba(228,216,184,.35)'; ctx.setLineDash([3, 3]); ctx.strokeRect(w * .465, h * .48, w * .065, h * .1); ctx.setLineDash([]);
    const r = rnd(s); for (let i = 0; i < 5; i++) { const dir = r() > .5 ? 1 : -1, x = ((r() * w + dir * t * 18) % w + w) % w; person(ctx, x, h * (.25 + r() * .5), h * .02, dir > 0 ? 0 : Math.PI); } },
  damage(ctx, t, w, h, s) { W(ctx, w, h, '#12151a'); ctx.fillStyle = C.wall; ctx.fillRect(w * .1, h * .1, w * .8, h * .45); ctx.fillStyle = 'rgba(160,190,220,.25)'; ctx.fillRect(w * .52, h * .18, w * .2, h * .25);
    const k = (t % 6) / 6; for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(228,216,184,.6)'; ctx.beginPath(); ctx.moveTo(w * .62, h * .3); ctx.lineTo(w * .62 + Math.cos(i) * w * .08 * k, h * .3 + Math.sin(i) * h * .12 * k); ctx.stroke(); }
    person(ctx, w * .55, h * .66, h * .026, -Math.PI / 2.4); },
};

/* Cenas do corpus financeiro. Várias reaproveitam desenhos acima (fila, calçada, empurrão, objeto, dano). */
const atmBox = (ctx, x, y, w, h, glow = .5) => { ctx.fillStyle = '#3d4552'; ctx.fillRect(x, y, w, h); ctx.fillStyle = `rgba(150,200,240,${glow})`; ctx.fillRect(x + w * .15, y + h * .12, w * .7, h * .3); ctx.fillStyle = '#1e2229'; ctx.fillRect(x + w * .2, y + h * .55, w * .6, h * .1); };
Object.assign(SCENES, {
  lobby(ctx, t, w, h, s) { W(ctx, w, h); ctx.fillStyle = 'rgba(160,200,240,.18)'; ctx.fillRect(w * .35, 0, w * .3, h * .16); ctx.strokeStyle = 'rgba(228,216,184,.25)'; ctx.strokeRect(w * .35, 0, w * .3, h * .16); ctx.beginPath(); ctx.moveTo(w * .5, 0); ctx.lineTo(w * .5, h * .16); ctx.stroke();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#323843'; ctx.fillRect(w * (.12 + i * .13), h * .62, w * .08, h * .05); if (i % 2 === 0) person(ctx, w * (.16 + i * .13), h * .58, h * .02, -Math.PI / 2); }
    const k = (t % 9) / 9; person(ctx, w * (.5 + Math.sin(t * .6) * .02), h * (.2 + k * .35), h * .022, Math.PI / 2); ctx.fillStyle = '#3a414c'; ctx.fillRect(w * .78, h * .3, w * .12, h * .08); },
  teller(ctx, t, w, h, s) { W(ctx, w, h); ctx.fillStyle = '#3a414c'; ctx.fillRect(w * .1, h * .42, w * .8, h * .08); for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(160,200,240,.2)'; ctx.fillRect(w * (.14 + i * .27), h * .24, w * .2, h * .18); person(ctx, w * (.24 + i * .27), h * .3, h * .022, Math.PI / 2); }
    for (let i = 0; i < 2; i++) { const x = w * (.24 + i * .27); person(ctx, x + Math.sin(t * .8 + i) * 3, h * .62, h * .022, -Math.PI / 2); } ctx.fillStyle = C.accent; ctx.fillRect(w * .5, h * .44 + Math.sin(t * 2) * 2, 8, 5); },
  advisor(ctx, t, w, h, s) { W(ctx, w, h); ctx.fillStyle = '#3a414c'; ctx.fillRect(w * .3, h * .45, w * .4, h * .12); ctx.fillStyle = '#d9d3c4'; ctx.fillRect(w * .46 + Math.sin(t) * 3, h * .47, w * .07, h * .06); person(ctx, w * .36, h * .32, h * .026, Math.PI / 2); person(ctx, w * .64, h * .68, h * .026, -Math.PI / 2);
    ctx.strokeStyle = 'rgba(160,200,240,.25)'; ctx.strokeRect(w * .12, h * .12, w * .76, h * .76); },
  atm(ctx, t, w, h, s) { W(ctx, w, h, C.ground); ctx.fillStyle = C.wall; ctx.fillRect(w * .1, 0, w * .8, h * .75); atmBox(ctx, w * .42, h * .25, w * .16, h * .4, .35 + .2 * Math.sin(t * 3)); person(ctx, w * .5, h * .78, h * .028, -Math.PI / 2); ctx.fillStyle = C.accent; ctx.fillRect(w * .5 - 6, h * (.58 + (t % 5 > 3 ? .02 : 0)), 12, 4); },
  atmqueue(ctx, t, w, h, s) { W(ctx, w, h, C.ground); ctx.fillStyle = C.wall; ctx.fillRect(w * .05, 0, w * .9, h * .5); atmBox(ctx, w * .12, h * .12, w * .12, h * .3, .4); const step = Math.max(0, Math.sin(t * .5) * 3);
    for (let i = 0; i < 5; i++) person(ctx, w * (.2 + i * .1) + step * (i ? 1 : 0), h * .62, h * .024, Math.PI); },
  vault(ctx, t, w, h, s) { W(ctx, w, h, '#161a20'); const k = Math.min(1, (t % 12) / 4), cx = w * .5, cy = h * .5, r = h * .3; ctx.fillStyle = '#4b5361'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8d97a6'; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(k * 2.4); ctx.strokeStyle = C.accent; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * .6, 0); ctx.stroke(); } ctx.restore();
    ctx.fillStyle = `rgba(12,13,16,${.9 * k})`; ctx.beginPath(); ctx.ellipse(cx + r * .9 * k, cy, r * (1 - .6 * k), r, 0, 0, TAU); ctx.fill(); person(ctx, w * .18, h * .75, h * .024, 0); person(ctx, w * .24, h * .75, h * .024, 0); },
  meeting(ctx, t, w, h, s) { W(ctx, w, h); ctx.fillStyle = 'rgba(150,200,240,.3)'; ctx.fillRect(w * .3, h * .06, w * .4, h * .14); ctx.fillStyle = '#3a414c'; ctx.beginPath(); ctx.ellipse(w * .5, h * .55, w * .26, h * .15, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; person(ctx, w * .5 + Math.cos(a) * w * .31, h * .55 + Math.sin(a) * h * .22, h * .021 + (i === 0 ? Math.sin(t * 2) * .6 : 0), a + Math.PI); } },
  reception(ctx, t, w, h, s) { W(ctx, w, h); ctx.fillStyle = '#3a414c'; ctx.fillRect(w * .25, h * .35, w * .5, h * .09); person(ctx, w * .5, h * .24, h * .026, Math.PI / 2); const k = Math.min(1, (t % 10) / 3); person(ctx, w * .5, h * (.85 - .32 * k), h * .026, -Math.PI / 2); ctx.fillStyle = C.accent; ctx.fillRect(w * .66, h * .38, 8, 5); },
  armored(ctx, t, w, h, s) { W(ctx, w, h, C.ground); road(ctx, w, h * .5, h * .35, true, 0); ctx.fillStyle = '#2b3036'; ctx.fillRect(0, h * .3, w, h * .2); ctx.fillStyle = '#5a6678'; ctx.beginPath(); ctx.roundRect(w * .18, h * .44, w * .3, h * .15, 6); ctx.fill(); ctx.fillStyle = 'rgba(10,12,16,.6)'; ctx.fillRect(w * .42, h * .46, w * .05, h * .06);
    const k = (t % 8) / 8; person(ctx, w * (.5 + k * .3), h * .4, h * .022, 0); ctx.fillStyle = C.accent; ctx.fillRect(w * (.5 + k * .3) + 8, h * .4, 8, 6); person(ctx, w * .52, h * .52, h * .022, Math.PI); },
  atmdamage(ctx, t, w, h, s) { W(ctx, w, h, '#12151a'); ctx.fillStyle = C.wall; ctx.fillRect(w * .1, 0, w * .8, h * .75); atmBox(ctx, w * .42, h * .25, w * .16, h * .4, .3);
    const k = Math.sin(t * 7); person(ctx, w * .36, h * .62, h * .026, -.5 + k * .4); if (k > .6) { ctx.strokeStyle = 'rgba(255,220,150,.8)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(w * .42, h * .42); ctx.lineTo(w * .42 - 6 - i * 3, h * .42 - 8 + i * 4); ctx.stroke(); } } },
});
Object.assign(SCENES, { tailgating(ctx, t, w, h, s) { W(ctx, w, h, '#161a20'); ctx.fillStyle = C.wall; ctx.fillRect(w * .38, 0, w * .24, h * .7); ctx.fillStyle = 'rgba(160,200,240,.2)'; ctx.fillRect(w * .42, h * .08, w * .16, h * .6); ctx.fillStyle = '#4b5361'; ctx.fillRect(w * .66, h * .3, w * .04, h * .1); ctx.fillStyle = C.accent; ctx.fillRect(w * .675, h * .33, 5, 4);
    const k = (t % 8) / 8, y = h * (.9 - .55 * k); person(ctx, w * .5, y, h * .026, -Math.PI / 2); person(ctx, w * .5 + (k > .3 ? 4 : 18), y + h * .06, h * .026, -Math.PI / 2); },
  queue: SCENES.counter, plaza: SCENES.sidewalk, altercation: SCENES.struggle, unattended: SCENES.object });
SCENES.default = SCENES.sidewalk;

function drawScene(ctx, scene, t, w, h, seed = 3) {
  ctx.save(); (SCENES[scene] || SCENES.default)(ctx, t, w, h, seed || 3);
  ctx.fillStyle = 'rgba(8,9,12,.16)'; for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1); // scanlines
  ctx.restore();
}
window.SyntheticScenes = { drawScene, names: Object.keys(SCENES).filter(k => k !== 'default') };
})();
