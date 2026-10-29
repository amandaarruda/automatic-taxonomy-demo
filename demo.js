/* Simulated walkthrough of the pipeline. Everything drawn here comes from window.ATLAS (computed by the product
   from the synthetic corpus) and window.DEMO (the scripted responses shown on screen). No network access. */
(() => {
'use strict';
const A = window.ATLAS, D = window.DEMO, SC = window.SyntheticScenes;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), ease = t => 1 - Math.pow(1 - t, 3), lerp = (a, b, t) => a + (b - a) * t;
const fmt = n => Number(n).toLocaleString('en-US');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

/* ------------------------------------------------------------------ data from the run */
const M = Object.values(A.models)[0], FAM = A.families, CL = A.clusters, C = A.meta.counts;
const famOf = id => FAM[id - 1];
const CAT = Object.fromEntries(A.legend.map(l => [l.cat, l.color]));
const VIZ = { 'Anomalous': '#ff2d2d', 'Predominantly Anomalous': '#ff9a9a', 'Neutral': '#7aa2ff', 'Predominantly Normal': '#9be58a', 'Normal': '#2fbf5a' };
const N = M.ev.length;
// Display coordinates: the first two principal axes of the run's 3-D projection (x, z), scaled to [0, 1].
const raw = Array.from({ length: N }, (_, i) => [M.xyz[i * 3], M.xyz[i * 3 + 2]]);
const ext = [0, 1].map(k => { const v = raw.map(p => p[k]).sort((a, b) => a - b); return [v[Math.floor(v.length * .02)], v[Math.ceil(v.length * .98) - 1]]; });
const P = raw.map(([x, y]) => [clamp((x - ext[0][0]) / (ext[0][1] - ext[0][0] || 1), -.05, 1.05), clamp((y - ext[1][0]) / (ext[1][1] - ext[1][0] || 1), -.05, 1.05)]);
const keyOf = i => M.cl[i] >= 0 ? M.keys[M.cl[i]] : null;
const members = {}; for (let i = 0; i < N; i++) { const k = keyOf(i); if (k) (members[k] ||= []).push(i); }
const clusterKeys = Object.keys(members).sort((a, b) => members[b].length - members[a].length);
const centroid = k => { const m = members[k]; return [m.reduce((s, i) => s + P[i][0], 0) / m.length, m.reduce((s, i) => s + P[i][1], 0) / m.length]; };
const CC = Object.fromEntries(clusterKeys.map(k => [k, centroid(k)]));
const famCentre = f => { const ks = f.keys.filter(k => CC[k]); return ks.length ? [ks.reduce((s, k) => s + CC[k][0], 0) / ks.length, ks.reduce((s, k) => s + CC[k][1], 0) / ks.length] : [.5, .5]; };
const FC = Object.fromEntries(FAM.map(f => [f.id, famCentre(f)]));
const hs = A.meta.hierarchy && A.meta.hierarchy.selected;

/* ------------------------------------------------------------------ canvas field */
const cv = $('#field'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, box = { x: 0, y: 0, w: 1, h: 1 };
function resize() {
  DPR = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const mobile = W < 860, top = mobile ? 120 : 110, bottom = mobile ? 250 : 190, side = mobile ? 24 : Math.max(60, W * .1);
  const w = W - side * 2, h = H - top - bottom, s = Math.min(w, h * 1.55);
  box = { x: (W - s) / 2, y: top + (h - s / 1.55) / 2, w: s, h: s / 1.55 };
  layoutWheel();
}
const scr = p => [box.x + p[0] * box.w, box.y + p[1] * box.h];
const sprites = {};
function sprite(col) { // pre-rendered glow, as in the atlas clouds
  if (sprites[col]) return sprites[col]; const s = 64, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'), [r, gg, b] = hex2rgb(col);
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); grd.addColorStop(0, `rgba(${r},${gg},${b},1)`); grd.addColorStop(.25, `rgba(${r},${gg},${b},.55)`); grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grd; g.fillRect(0, 0, s, s); return (sprites[col] = c);
}
// One particle per unique statement. Each act sets targets; the loop eases towards them.
const pts = Array.from({ length: N }, (_, i) => ({ i, x: .5, y: 1.2, a: 0, r: 3, col: '#cfc8b8', tx: P[i][0], ty: P[i][1], ta: 0, tr: 3, tcol: '#cfc8b8', delay: 0 }));
const nodes = clusterKeys.map(k => ({ k, x: CC[k][0], y: CC[k][1], a: 0, r: 4, tx: CC[k][0], ty: CC[k][1], ta: 0, tr: 4, col: CL[k].color, tcol: CL[k].color }));
let tethers = 0, tethersTarget = 0, cores = 0, coresTarget = 0, wheel = 0, wheelTarget = 0;

/* wheel layout identical in spirit to the atlas taxonomy view */
let WHEEL = {};
function layoutWheel() {
  const fams = FAM, NF = fams.length || 1, NR = Math.max(1, ...fams.map(f => f.keys.length));
  const cx = W / 2, cy = box.y + box.h / 2, R = Math.min(box.w, box.h * 1.5) * .34, r0 = R * .34, step = (R - r0) / NR;
  WHEEL = { cx, cy, R, r0, step, NF, NR, pos: {}, lab: {} };
  fams.forEach((f, i) => { const a = (i + .5) / NF * Math.PI * 2 - Math.PI / 2; WHEEL.lab[f.id] = { a, x: cx + Math.cos(a) * (R + 14), y: cy + Math.sin(a) * (R + 14) };
    f.keys.forEach((k, r) => { WHEEL.pos[k] = [cx + Math.cos(a) * (r0 + (r + .5) * step), cy + Math.sin(a) * (r0 + (r + .5) * step)]; }); });
}

function draw(dt) {
  ctx.clearRect(0, 0, W, H);
  const k = 1 - Math.exp(-dt * (reduced ? 60 : 3.2));
  ctx.globalCompositeOperation = 'lighter';
  for (const p of pts) {
    if (p.delay > 0) { p.delay -= dt; continue; }
    p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.a += (p.ta - p.a) * k * 1.4; p.r += (p.tr - p.r) * k;
    if (p.col !== p.tcol) { p.mix = (p.mix || 0) + dt * 1.6; if (p.mix >= 1) { p.col = p.tcol; p.mix = 0; } }
    if (p.a < .01) continue; const [x, y] = scr([p.x, p.y]), s = p.r * 5; ctx.globalAlpha = p.a;
    ctx.drawImage(sprite(p.mix ? p.tcol : p.col), x - s / 2, y - s / 2, s, s);
  }
  ctx.globalCompositeOperation = 'source-over';
  tethers += (tethersTarget - tethers) * k; cores += (coresTarget - cores) * k; wheel += (wheelTarget - wheel) * k;
  if (tethers > .01 || wheel > .01) {
    ctx.globalAlpha = tethers * (1 - wheel) * .55; ctx.lineWidth = 1;
    for (const n of nodes) { const f = famOf(CL[n.k].fam); if (!f || f.unassigned) continue; const [x, y] = nodeXY(n), [fx, fy] = scr(FC[f.id]); ctx.strokeStyle = f.color; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(x, y); ctx.stroke(); }
    if (wheel > .01) drawGuides(wheel);
  }
  for (const n of nodes) {
    n.x += (n.tx - n.x) * k; n.y += (n.ty - n.y) * k; n.a += (n.ta - n.a) * k; n.r += (n.tr - n.r) * k;
    if (n.a < .01) continue; const [x, y] = nodeXY(n); ctx.globalAlpha = n.a;
    const col = wheel > .5 ? CAT[CL[n.k].cat] : n.tcol; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, n.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(236,232,222,.35)'; ctx.lineWidth = 1; ctx.stroke();
  }
  if (cores > .01 && wheel < .99) { ctx.globalCompositeOperation = 'lighter'; for (const f of FAM) { if (f.unassigned) continue; const [x, y] = scr(FC[f.id]), s = 90; ctx.globalAlpha = cores * .4 * (1 - wheel); ctx.drawImage(sprite(f.color), x - s / 2, y - s / 2, s, s); } ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = 1;
}
const nodeXY = n => { const a = scr([n.x, n.y]), w = WHEEL.pos[n.k] || a; return [lerp(a[0], w[0], ease(wheel)), lerp(a[1], w[1], ease(wheel))]; };
function drawGuides(alpha) {
  const g = WHEEL; ctx.globalAlpha = alpha * .9;
  for (let r = 0; r <= g.NR; r++) { ctx.strokeStyle = r % 2 ? 'rgba(226,220,204,.08)' : 'rgba(226,220,204,.16)'; ctx.setLineDash(r % 2 ? [2, 5] : []); ctx.beginPath(); ctx.arc(g.cx, g.cy, g.r0 + r * g.step, 0, Math.PI * 2); ctx.stroke(); }
  ctx.setLineDash([]); if (g.NF > 1) for (let i = 0; i < g.NF; i++) { const a = i / g.NF * Math.PI * 2 - Math.PI / 2; ctx.strokeStyle = 'rgba(226,220,204,.1)'; ctx.beginPath(); ctx.moveTo(g.cx + Math.cos(a) * g.r0, g.cy + Math.sin(a) * g.r0); ctx.lineTo(g.cx + Math.cos(a) * (g.R + 4), g.cy + Math.sin(a) * (g.R + 4)); ctx.stroke(); }
}

/* ------------------------------------------------------------------ labels & counter */
const labelsEl = $('#labels'), labelEls = new Map();
function setLabels(list) { // list of {id, html, x, y, c, cls, rot}
  const keep = new Set(list.map(l => l.id));
  for (const [id, el] of labelEls) if (!keep.has(id)) { el.classList.remove('on'); setTimeout(() => { if (!el.classList.contains('on')) { el.remove(); labelEls.delete(id); } }, 500); }
  for (const l of list) {
    let el = labelEls.get(l.id); if (!el) { el = document.createElement('div'); labelsEl.appendChild(el); labelEls.set(l.id, el); }
    el.className = 'lab on ' + (l.cls || ''); el.style.setProperty('--c', l.c); el.innerHTML = l.html;
    el.style.transform = `translate(${l.x}px,${l.y}px) ${l.rot != null ? `rotate(${l.rot}deg)` : 'translate(-50%,-50%)'}`;
  }
}
let labelFn = null;
const counter = $('#counter');
function count(to, label, small = '', dur = 1.4) {
  counter.classList.add('on'); const b = counter.querySelector('b'), from = +(b && b.dataset.v) || 0, t0 = performance.now();
  counter.innerHTML = `<b data-v="${to}">${fmt(from)}</b><span>${esc(label)}</span>${small ? `<small>${esc(small)}</small>` : ''}`;
  const el = counter.querySelector('b'); const tick = now => { const k = reduced ? 1 : clamp((now - t0) / (dur * 1000), 0, 1); el.textContent = fmt(Math.round(lerp(from, to, ease(k)))); if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ synthetic videos */
const SHOW = D.showcase, LIB = D.library;
const sceneOf = name => (LIB.find(v => v.video === name) || {}).scene;
let liveCanvases = [];
function liveCanvas(c, scene, seed, speed = 1) { liveCanvases.push({ c, g: c.getContext('2d'), scene, seed, speed, t: seed % 7 }); }

/* ------------------------------------------------------------------ acts */
const layers = { intro: $('#intro'), library: $('#library'), sampling: $('#sampling'), vlm: $('#vlm'), taxonomy: $('#taxonomy') };
const showLayer = name => Object.entries(layers).forEach(([k, el]) => el.classList.toggle('on', k === name));
let timers = [];
const later = (ms, fn) => timers.push(setTimeout(fn, reduced ? Math.min(ms, 50) : ms));
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

function hidePoints() { pts.forEach(p => { p.ta = 0; }); nodes.forEach(n => { n.ta = 0; }); tethersTarget = coresTarget = wheelTarget = 0; }

let frames = []; // captured thumbnails of the showcase video
const sampling = { mode: 'uniform16', duration: 40, t: 0, playing: false, captured: new Set() };
function sampleTimes() { const d = sampling.duration; return sampling.mode === 'uniform16' ? Array.from({ length: 16 }, (_, i) => i * (d - .1) / 15) : Array.from({ length: Math.ceil(d) }, (_, i) => i); }
function buildTrack() {
  const track = $('#track'), times = sampleTimes(), d = sampling.duration; track.innerHTML = '';
  times.forEach((t, i) => { const tick = document.createElement('i'); tick.style.left = (t / d * 100) + '%'; tick.dataset.i = i; track.appendChild(tick); });
  if (sampling.mode === '1fps') for (let w = 0; w * 16 < times.length; w++) { const a = times[w * 16], b = times[Math.min(times.length - 1, w * 16 + 15)], el = document.createElement('b'); el.style.left = (a / d * 100) + '%'; el.style.width = ((b - a) / d * 100) + '%'; el.innerHTML = `<em>WINDOW ${w + 1}</em>`; track.appendChild(el); }
  const strip = $('#strip'); strip.innerHTML = '';
  const groups = sampling.mode === '1fps' ? Math.ceil(times.length / 16) : 1;
  for (let w = 0; w < groups; w++) { const win = document.createElement('div'); win.className = 'win'; win.dataset.label = sampling.mode === '1fps' ? `WINDOW ${w + 1} · ONE VLM CALL` : '16 FRAMES · ONE VLM CALL'; strip.appendChild(win);
    for (let j = w * 16; j < Math.min(times.length, w * 16 + 16); j++) { const th = document.createElement('div'); th.className = 'thumb'; th.dataset.i = j; th.innerHTML = '<canvas width="96" height="54"></canvas>'; win.appendChild(th); } }
  sampling.captured = new Set(); frames = [];
}
function setMode(mode) { sampling.mode = mode; $$('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode)); buildTrack(); sampling.t = 0; sampling.playing = true; }
$$('#modeSeg button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
const player = $('#player'), pg = player.getContext('2d');
function stepPlayer(dt) {
  if (!layers.sampling.classList.contains('on')) return;
  const show = SHOW[0], d = sampling.duration; if (sampling.playing) sampling.t = Math.min(d, sampling.t + dt * d / (reduced ? .2 : 4.2));
  SC.drawScene(pg, show.scene, sampling.t, player.width, player.height, 11);
  $('#playhead').style.left = (sampling.t / d * 100) + '%';
  const s = Math.floor(sampling.t), ms = Math.floor((sampling.t % 1) * 10); $('#osdTime').textContent = `00:${String(s).padStart(2, '0')}.${ms}`;
  sampleTimes().forEach((t, i) => { if (t <= sampling.t && !sampling.captured.has(i)) { sampling.captured.add(i);
    const th = $(`#strip .thumb[data-i="${i}"]`), tick = $(`#track i[data-i="${i}"]`); if (tick) tick.classList.add('hit');
    if (th) { const c = th.querySelector('canvas'), g = c.getContext('2d'); SC.drawScene(g, show.scene, t, c.width, c.height, 11); th.classList.add('in'); if (frames.length < 16) frames.push(c); } } });
}

function typeJSON(show, done) {
  const lines = ['{', `  "anomaly": ${show.anomaly},`, '  "evidence": [', ...show.evidence.map((e, j) => `    "${e.text}"${j < show.evidence.length - 1 ? ',' : ''}`), '  ]', '}'];
  const full = lines.join('\n'), pre = $('#json'); let n = 0;
  const color = s => esc(s).replace(/(&quot;(anomaly|evidence)&quot;)/g, '<span class="k">$1</span>').replace(/(&quot;[^&]+?&quot;)(?!:)/g, m => m.includes('anomaly') || m.includes('evidence') ? m : `<span class="s">${m}</span>`).replace(/: ([01]),/, ': <span class="n">$1</span>,');
  const tick = () => { n = Math.min(full.length, n + (reduced ? full.length : 3)); pre.innerHTML = color(full.slice(0, n)) + (n < full.length ? '<span class="cursor"></span>' : ''); if (n < full.length) timers.push(setTimeout(tick, 16)); else done && done(); };
  tick();
}
const CHECKS = ['valid JSON object', 'exactly anomaly + evidence', 'anomaly is 0 or 1', '1 to 3 statements', 'each ≤ 15 words', 'no recovery needed'];
function showResponse(show, fast) {
  $('#respVideo').textContent = show.video; $('#json').innerHTML = ''; const checks = $('#checks'); checks.innerHTML = CHECKS.map(c => `<li>${c}</li>`).join('');
  const chips = $('#chips'); if (!fast) chips.innerHTML = '';
  typeJSON(show, () => { $$('#checks li').forEach((li, j) => later(j * (fast ? 40 : 160), () => li.classList.add('in')));
    later(fast ? 200 : 1000, () => show.evidence.forEach((e, j) => { const el = document.createElement('div'); el.className = `chip a${show.anomaly}`; el.dataset.i = e.i ?? ''; el.innerHTML = `${esc(e.text)}<small>${show.anomaly ? 'ANOMALOUS' : 'NORMAL'}</small>`; chips.appendChild(el); later(j * 140, () => el.classList.add('in')); while (chips.children.length > 9) chips.firstChild.remove(); })); });
}

const ACTS = [
  { id: 'library', step: 'Select', ref: 'INPUT · LOCAL VIDEOS', title: 'Choose the videos', dur: 7,
    body: `Point the product at a folder or pick files. Any number, any length. In the real product the files are read from your disk and never uploaded; here, ${fmt(C.videos)} synthetic clips stand in for them.`,
    enter() { showLayer('library'); hidePoints(); const grid = $('#libGrid'); grid.innerHTML = ''; liveCanvases = [];
      const tiles = LIB.slice(0, W < 860 ? 12 : 24);
      tiles.forEach((v, i) => { const t = document.createElement('div'); t.className = 'tile'; t.innerHTML = `<canvas width="192" height="120"></canvas><span>${esc(v.video)}</span>`; grid.appendChild(t); liveCanvas(t.querySelector('canvas'), v.scene, i + 3, .6 + (i % 3) * .2); later(60 + i * 45, () => t.classList.add('in')); later(1600 + i * 70, () => t.classList.add('sel')); });
      later(1700, () => count(C.videos, 'videos selected', 'synthetic · rendered in your browser', 2.4)); } },
  { id: 'sampling', step: 'Sample', ref: '§3.2 · VISUAL INPUT', title: 'Sample the frames', dur: 10,
    body: 'Each video becomes an ordered set of frames: 16 spread uniformly from the first to the last frame, as in the paper — or one frame per second, sent to the model in consecutive windows of 16.',
    enter() { showLayer('sampling'); counter.classList.remove('on'); liveCanvases = []; $('#fileName').textContent = SHOW[0].video; $('#osdCam').textContent = 'CAM 03 · SYNTHETIC'; setMode('uniform16'); later(5600, () => setMode('1fps')); } },
  { id: 'vlm', step: 'Describe', ref: '§3.2 · EVIDENCE GENERATION', title: 'The model describes what it sees', dur: 13,
    body: 'A local vision-language model returns a decision and one to three short observable facts. The reply is checked against the contract; a reply cut off by the token limit gets one retry, anything else invalid is recorded as a failure — never silently fixed.',
    enter() { showLayer('vlm'); counter.classList.remove('on'); const mini = $('#miniStrip'); mini.innerHTML = ''; mini.classList.remove('flow');
      const src = frames.length ? frames : []; for (let j = 0; j < 16; j++) { const th = document.createElement('div'); th.className = 'thumb'; const c = document.createElement('canvas'); c.width = 96; c.height = 54; const g = c.getContext('2d'); if (src[j]) g.drawImage(src[j], 0, 0); else SC.drawScene(g, SHOW[0].scene, j * 2.6, 96, 54, 11); th.appendChild(c); th.style.animationDelay = (j * 45) + 'ms'; mini.appendChild(th); }
      const engine = $('.engine'); later(500, () => { mini.classList.add('flow'); engine.classList.add('busy'); });
      later(1900, () => showResponse(SHOW[0]));
      SHOW.slice(1).forEach((s, j) => later(6800 + j * 1150, () => showResponse(s, true)));
      later(6800, () => count(C.occurrences, 'evidence statements', `from ${fmt(C.videos)} validated responses`, 4)); },
    exit() { $('.engine').classList.remove('busy'); } },
  { id: 'embed', step: 'Embed', ref: '§3.3 · SEMANTIC DISCOVERY', title: 'Every statement becomes a vector', dur: 8,
    body: 'Statements are deduplicated by exact normalised text (every occurrence is kept for provenance) and encoded with BGE-small into 384-dimensional unit vectors. Similar descriptions land close together. The layout shown is a projection for display only.',
    enter() { showLayer(null); flyChips(); pts.forEach((p, i) => { p.tx = P[i][0]; p.ty = P[i][1]; p.tcol = '#d8d1c0'; p.ta = .8; p.tr = 3.2; if (p.a < .05) { p.x = .5 + (Math.random() - .5) * .1; p.y = 1.25; p.delay = reduced ? 0 : Math.random() * 1.6; } });
      count(C.statements, 'unique statements', `${fmt(C.occurrences)} occurrences · 384-d BGE vectors`, 2); labelFn = null; } },
  { id: 'cluster', step: 'Cluster', ref: '§3.3 · HDBSCAN PER MODEL', title: 'Dense regions become clusters', dur: 9,
    body: `HDBSCAN looks for dense regions of similar statements (min_cluster_size = ${A.meta.parameters.hdbscan.min_cluster_size}, as in the paper). ${fmt(C.clusters)} clusters emerge; ${fmt(C.noise_statements)} statements belong to none and stay visible as noise instead of being forced into a group.`,
    enter() { showLayer(null); pts.forEach((p, i) => { const k = keyOf(i); p.delay = reduced ? 0 : (Math.hypot(P[i][0] - .5, P[i][1] - .5)) * 1.4; p.tcol = k ? CL[k].color : '#7d8088'; p.ta = k ? .9 : .25; p.tr = k ? 3.8 : 2.4; });
      count(C.clusters, 'clusters', `${fmt(C.noise_statements)} statements left as noise`, 1.6);
      labelFn = () => placeApart(clusterKeys.slice(0, W < 860 ? 8 : 16).map(k => { const [x, y] = scr(CC[k]); return { id: 'c' + k, html: esc(CL[k].name), text: CL[k].name, x, y: y - 18, c: CL[k].color }; }), W < 860 ? 5 : 11); } },
  { id: 'families', step: 'Group', ref: '§3.5 · CENTROID HIERARCHY', title: 'Clusters group into families', dur: 10,
    body: `Each cluster is reduced to its normalised centroid. Agglomerative clustering (cosine, average and complete linkage) is cut automatically with the paper's composite score — silhouette, bootstrap stability, linkage agreement and cohesion.${hs ? ` Selected here: ${hs.method} linkage, k = ${hs.k}.` : ''}`,
    enter() { showLayer(null); pts.forEach(p => { p.ta = keyOf(p.i) ? .16 : .05; p.tr = 2; p.delay = 0; });
      nodes.forEach((n, j) => { n.x = n.tx = CC[n.k][0]; n.y = n.ty = CC[n.k][1]; n.ta = 1; n.tr = 3 + Math.sqrt(members[n.k].length) * 1.3; n.tcol = CL[n.k].color; });
      later(1400, () => { tethersTarget = 1; coresTarget = 1; nodes.forEach(n => { const f = famOf(CL[n.k].fam); n.tcol = f ? f.color : '#8a8f98'; }); pts.forEach(p => { const k = keyOf(p.i); if (k) p.tcol = famOf(CL[k].fam).color; }); count(C.families, 'candidate families', hs ? `${hs.method} linkage · k = ${hs.k} · ${A.meta.hierarchy.candidates_evaluated} cuts scored` : '', 1.2); });
      labelFn = () => tethersTarget ? FAM.filter(f => !f.unassigned).map(f => { const [x, y] = scr(FC[f.id]); return { id: 'f' + f.id, html: `<b>${esc(f.code)}</b>${esc(f.name)}`, x, y, c: f.color }; }) : []; } },
  { id: 'taxonomy', step: 'Name', ref: 'AUTOMATIC NAMES · NO REVIEW', title: 'A taxonomy, assembled automatically', dur: 14, last: true,
    body: 'Each name is made of the most distinctive terms of the group’s own statements, so nothing is invented. Colour shows how many supporting videos the model flagged as anomalous. Every cell still links back to its statements and source videos.',
    enter() { showLayer('taxonomy'); pts.forEach(p => { p.ta = 0; }); nodes.forEach(n => { n.ta = 1; n.tr = Math.max(4, Math.min(WHEEL.step * .36, 2 * Math.PI * WHEEL.r0 / WHEEL.NF * .3)); }); tethersTarget = 0; coresTarget = 0; wheelTarget = 1; counter.classList.remove('on');
      $('#ctaTitle').textContent = `${fmt(C.clusters)} clusters, ${fmt(C.families)} candidate families`;
      $('#ctaText').textContent = `Discovered from ${fmt(C.statements)} synthetic statements with the product's real pipeline. Open the atlas to browse families, clusters, every statement and its source video.`;
      later(1800, () => $('#cta').classList.add('in'));
      labelFn = () => FAM.map(f => { const l = WHEEL.lab[f.id]; if (!l) return null; const deg = l.a * 180 / Math.PI, flip = Math.cos(l.a) < 0;
        return { id: 'w' + f.id, html: `<b>${esc(f.code)}</b>${esc(f.name)}`, x: l.x, y: l.y, c: f.color, cls: 'wheel', rot: flip ? deg + 180 : deg, flip }; }).filter(Boolean).map(l => ({ ...l, html: l.flip ? `<span style="display:inline-block;transform:translateX(-100%)">${l.html}</span>` : l.html })); },
    exit() { $('#cta').classList.remove('in'); wheelTarget = 0; } },
];

function placeApart(list, max) { // greedy: keep the largest clusters' labels, drop any that would overlap
  const kept = [];
  for (const l of list) { const w = l.text.length * 6.4 + 18, box = [l.x - w / 2, l.y - 11, l.x + w / 2, l.y + 11];
    if (kept.every(k => box[2] < k.box[0] || box[0] > k.box[2] || box[3] < k.box[1] || box[1] > k.box[3])) kept.push({ ...l, box });
    if (kept.length >= max) break; }
  return kept;
}
function flyChips() { // evidence chips travel from the response panel to their place in the field
  $$('#chips .chip').forEach(ch => { const i = +ch.dataset.i; if (Number.isNaN(i) || ch.dataset.i === '') return; const r = ch.getBoundingClientRect(), g = ch.cloneNode(true); g.classList.add('ghost', 'in'); g.style.left = r.left + 'px'; g.style.top = r.top + 'px'; document.body.appendChild(g);
    const [x, y] = scr(P[i]); requestAnimationFrame(() => { g.style.transform = `translate(${x - r.left - r.width / 2}px,${y - r.top - r.height / 2}px) scale(.2)`; g.style.opacity = '0'; }); setTimeout(() => g.remove(), 1300); });
}

/* ------------------------------------------------------------------ steps, caption, playback */
const stepsEl = $('#steps');
stepsEl.innerHTML = ACTS.map((a, i) => `<li><button data-i="${i}"><span>0${i + 1}</span>${a.step}</button></li>`).join('');
stepsEl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) goTo(+b.dataset.i); });
let cur = -1, actT = 0, paused = false;
function goTo(i) {
  if (i < 0 || i >= ACTS.length) return; clearTimers(); if (cur >= 0 && ACTS[cur].exit) ACTS[cur].exit();
  cur = i; actT = 0; layers.intro.classList.remove('on'); $('#caption').classList.add('on');
  $$('#steps li').forEach((li, j) => { li.classList.toggle('on', j === i); li.classList.toggle('done', j < i); });
  const a = ACTS[i]; $('#capRef').textContent = `${String(i + 1).padStart(2, '0')} / ${String(ACTS.length).padStart(2, '0')} · ${a.ref}`; $('#capTitle').textContent = a.title; $('#capBody').textContent = a.body;
  labelFn = null; setLabels([]); a.enter();
}
$('#play').addEventListener('click', () => goTo(0));
$('#replay').addEventListener('click', () => goTo(0));
$('#prev').addEventListener('click', () => goTo(Math.max(0, cur - 1)));
$('#next').addEventListener('click', () => goTo(Math.min(ACTS.length - 1, cur + 1)));
$('#pause').addEventListener('click', e => { paused = !paused; e.currentTarget.textContent = paused ? '▶' : '❚❚'; e.currentTarget.setAttribute('aria-label', paused ? 'Play' : 'Pause'); });
addEventListener('keydown', e => { if (cur < 0) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(0); } return; }
  if (e.key === 'ArrowRight') goTo(Math.min(ACTS.length - 1, cur + 1)); else if (e.key === 'ArrowLeft') goTo(Math.max(0, cur - 1)); else if (e.key === ' ') { e.preventDefault(); $('#pause').click(); } });
addEventListener('resize', resize);

let last = performance.now(), libClock = 0;
function loop(now) {
  requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (cur >= 0 && !paused) { actT += dt; const a = ACTS[cur]; $('#capBar').style.width = Math.min(100, actT / a.dur * 100) + '%'; if (actT >= a.dur && !a.last) goTo(cur + 1); }
  libClock += dt; if (libClock > 1 / 12) { liveCanvases.forEach(v => { v.t += libClock * v.speed; SC.drawScene(v.g, v.scene, v.t, v.c.width, v.c.height, v.seed); }); libClock = 0; }
  stepPlayer(dt); draw(dt); if (labelFn) setLabels(labelFn());
}
resize(); requestAnimationFrame(loop);
if (new URLSearchParams(location.search).has('step')) goTo(+new URLSearchParams(location.search).get('step'));
window.__demo = { goTo, ACTS };
})();
