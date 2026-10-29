/* Observable Evidence Atlas — product viewer.
   Derived from the original Observable Evidence Atlas viewer: same rendering engine, layout and interactions,
   generalised to read any run produced by the pipeline (window.ATLAS, written by observable_atlas.atlas).
   Nothing is computed here beyond presentation: clusters, families, names and projections come from the run. */
(() => {
'use strict';
const A = window.ATLAS, T = window.THREE;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = t => 1 - Math.pow(1 - t, 3);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = n => Number(n || 0).toLocaleString('en-US');
const L = window.L || (k => k);
const plural = (n, one, many) => `${fmt(n)} ${L(n === 1 ? one : (many || one + 's'))}`;

/* ------------------------------------------------------------------ data */
const META = A.meta, SYMS = ['●', '◆', '■', '▲'];
const MODELS = Object.fromEntries(META.models.map(m => [m.key, { label: m.label, short: m.label.split(/[-\s]/)[0], sym: SYMS[m.shape], shape: m.shape }]));
const MKEYS = META.models.map(m => m.key);
const FAM = A.families, famOf = id => FAM[id - 1]; FAM.forEach(f => f.base = f.color);
const CATS = A.legend; const CAT = Object.fromEntries(CATS.map(l => [l.cat, l]));
const CAT_ORDER = ['Anomalous', 'Predominantly Anomalous', 'Neutral', 'Predominantly Normal', 'Normal'];
const CL = A.clusters; for (const k in CL) CL[k].key = k;
const NCL = Object.keys(CL).length, NFAM = FAM.filter(f => !f.unassigned).length;
const PRED = META.composition !== 'reference';
const SHARE_TXT = L(PRED ? 'share of supporting videos the VLM flagged as anomalous' : 'share of supporting videos labelled anomalous (reference labels)');
const CATN = c => L(c);
const fname = f => f.unassigned ? L(f.name) : f.name;
const diagText = d => (window.I18N && I18N.lang === 'pt' ? d.message : d.message_en) || d.message_en || d.message;
// Saturated, hue-matched variants of the legend colours, used ONLY in the glowing 3D clouds.
const VIZ_L = { 'Anomalous': '#d11f2a', 'Predominantly Anomalous': '#ec6f7a', 'Neutral': '#5b7fe6', 'Predominantly Normal': '#5fae4e', 'Normal': '#1f9a48' };
const VIZ = { 'Anomalous': '#ff2d2d', 'Predominantly Anomalous': '#ff9a9a', 'Neutral': '#7aa2ff', 'Predominantly Normal': '#9be58a', 'Normal': '#2fbf5a' };
const NOISE = [.5, .52, .56], NOISE_L = [.55, .55, .58];
const catColor = k => CAT[CL[k].cat].color;
FAM.forEach(f => {
  const ks = f.keys, cnt = {}; ks.forEach(k => cnt[CL[k].cat] = (cnt[CL[k].cat] || 0) + 1);
  f.mean = ks.length ? ks.reduce((s, k) => s + CL[k].pct, 0) / ks.length : 0; f.cats = cnt;
  f.n = Object.fromEntries(MKEYS.map(m => [m, ks.filter(k => CL[k].model === m).length]));
  f.pts = Object.fromEntries(MKEYS.map(m => [m, ks.reduce((s, k) => s + (CL[k].model === m ? CL[k].n : 0), 0)]));
});
const evByCluster = {};
for (const m in A.models) { const d = A.models[m]; d.cl.forEach((c, i) => { if (c >= 0) (evByCluster[d.keys[c]] ||= []).push(i); }); }
const VID = A.videos;
const modelMix = f => MKEYS.filter(m => f.n[m]).map(m => `${MODELS[m].sym} ${f.n[m]} ${MODELS[m].short}`).join(' · ');

/* ------------------------------------------------------------------ state */
const VIEWS = ['taxonomy', 'families', ...MKEYS];
const S = { view: null, family: 0, cluster: null, hover: null, mode: 'family', labels: true, orbit: true, noise: true, panel: true, q: '', qset: null, cat: null,
  tx: { layout: 'wheel', order: 'id', cats: new Set(CAT_ORDER), models: new Set(MKEYS) } };
const IC = d => `<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="${d}"/></svg>`, XI = IC('M4 4l8 8M12 4l-8 8');
const rgbHex = a => '#' + a.map(x => Math.round(clamp(x, 0, 1) * 255).toString(16).padStart(2, '0')).join('');
function setQuery(q) { // one search shared by every view: highlights points / cells and filters the side lists
  S.q = q.trim().toLowerCase();
  S.qset = S.q ? new Set(Object.keys(CL).filter(k => { const c = CL[k], f = famOf(c.fam); return (c.name + ' ' + c.rep + ' ' + f.name + ' ' + f.code + ' ' + k + ' ' + c.cat).toLowerCase().includes(S.q); })) : null;
}

/* ------------------------------------------------------------------ colour helpers */
const hex2rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255); };
function hsl([r, g, b]) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, l = (mx + mn) / 2, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function rgbOf(h, s, l) { const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)]; }
function toLight(c) { let [h, s, l] = hsl(c); s = Math.min(.85, Math.max(s, .5) * 1.05); l = Math.min(l, .5) * .45 + .27; return rgbOf(h, s, l); } // readable on the light canvas
function lift(hex) { let [h, s, l] = hsl(hex2rgb(hex)); l = .42 + .5 * l; s = Math.max(s, .55); return rgbOf(h, s, l); } // readable on the dark canvas

/* ------------------------------------------------------------------ 3D engine */
const glHost = $('#gl');
let renderer = null;
try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch (e) { console.warn('WebGL unavailable', e); }
if (renderer) { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x0c0d10, 1); glHost.appendChild(renderer.domElement); }
const camera = new T.PerspectiveCamera(42, 1, .05, 60);
const U = { uScale: { value: 1 }, uDist: { value: 3.4 }, uAsm: { value: 1 }, uLight: { value: 0 } };

const VS = `attribute vec3 aColor; attribute float aSize; attribute float aA; attribute float aShape;
uniform float uScale, uDist, uAsm; varying vec3 vC; varying float vA, vS;
void main(){ vec3 p = position*(1.0+(1.0-uAsm)*(1.6+fract(sin(dot(position,vec3(12.9,78.2,37.7)))*4375.5)*2.0));
  vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; float dp=-mv.z;
  gl_PointSize = clamp(aSize*uScale/dp, 1.0, 120.0); vC=aColor; vS=aShape;
  vA = aA*clamp(1.2-(dp-uDist)*.42,.28,1.0)*uAsm; }`;
const FS_GLOW = `varying vec3 vC; varying float vA, vS; void main(){ vec2 q=gl_PointCoord-.5; float d=length(q)*2.0; if(d>1.0) discard;
  float core=smoothstep(1.0,.0,d); float a=vA*(pow(core,2.2)*.9+pow(core,.9)*.14); gl_FragColor=vec4(vC*(.75+.7*pow(core,3.0)),a); }`;
// Node shapes: 0 circle, 1 diamond, 2 square, 3 triangle (one per model).
const FS_NODE = `uniform float uLight; varying vec3 vC; varying float vA, vS; void main(){ vec2 q=gl_PointCoord-.5; float d;
  if(vS<.5) d=length(q); else if(vS<1.5) d=(abs(q.x)+abs(q.y))*1.18*.5+.07; else if(vS<2.5) d=max(abs(q.x),abs(q.y))*1.12;
  else d=2.1*max(max(dot(q,vec2(.866,-.5)),dot(q,vec2(-.866,-.5))),q.y+.02);
  if(d>.5) discard;
  vec3 col=mix(vC*.86, vC*.46, smoothstep(.0,.4,d)); float rim=smoothstep(.36,.4,d); col=mix(col, mix(vec3(.74,.8,.88), vec3(.1,.14,.2), uLight), rim*(.16+.3*vA));
  gl_FragColor=vec4(col, vA*(1.0-smoothstep(.46,.5,d))); }`;
const matCloud = new T.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS_GLOW, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
const matNode = new T.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS_NODE, transparent: true, depthWrite: false });
const matHalo = new T.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS_GLOW, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
const matLine = new T.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
  vertexShader: `attribute vec3 aColor; attribute float aA; uniform float uAsm; varying vec3 vC; varying float vA; void main(){ vC=aColor; vA=aA*uAsm; gl_Position=projectionMatrix*modelViewMatrix*vec4(position*(1.0+(1.0-uAsm)),1.0);} `,
  fragmentShader: `varying vec3 vC; varying float vA; void main(){ gl_FragColor=vec4(vC,vA);} ` });

function normalise(flat, pct = .97) { // centre the cloud and scale it so ~97% of points fall inside a unit-ish sphere
  const n = flat.length / 3, out = new Float32Array(flat.length); if (!n) return out;
  const c = [0, 0, 0]; for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) c[k] += flat[i * 3 + k] / n;
  const r = []; for (let i = 0; i < n; i++) r.push(Math.hypot(flat[i * 3] - c[0], flat[i * 3 + 1] - c[1], flat[i * 3 + 2] - c[2]));
  const ref = [...r].sort((a, b) => a - b)[Math.min(n - 1, Math.floor(n * pct))], s = ref > 1e-9 ? 1.05 / ref : 1;
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) out[i * 3 + k] = (flat[i * 3 + k] - c[k]) * s;
  return out;
}
function mkAttr(geo, name, arr, size, dyn) { const a = new T.BufferAttribute(arr, size); if (dyn) a.setUsage(T.DynamicDrawUsage); geo.setAttribute(name, a); return a; }

function backdrop(scene, floorY) {
  const g = new T.Group(), pts = [], add = (a, b) => pts.push(...a, ...b);
  for (const r of [.55, 1.1, 1.65, 2.2]) for (let i = 0; i < 96; i++) { const a0 = i / 96 * 6.2832, a1 = (i + 1) / 96 * 6.2832; add([Math.cos(a0) * r, floorY, Math.sin(a0) * r], [Math.cos(a1) * r, floorY, Math.sin(a1) * r]); }
  for (let i = 0; i < 24; i++) { const a = i / 24 * 6.2832; add([Math.cos(a) * .55, floorY, Math.sin(a) * .55], [Math.cos(a) * 2.2, floorY, Math.sin(a) * 2.2]); }
  const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
  const m1 = new T.LineBasicMaterial({ color: 0xd8cfb8, transparent: true, opacity: .08, depthWrite: false }); g.add(new T.LineSegments(lg, m1));
  const m2 = new T.LineBasicMaterial({ color: 0xcfc8b8, transparent: true, opacity: .05, depthWrite: false }); g.add(new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(2.7, 2.7, 2.7)), m2));
  const dust = [], dg = new T.BufferGeometry(); let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 700; i++) { const r = 3 + rnd() * 6, a = rnd() * 6.283, b = Math.acos(2 * rnd() - 1); dust.push(r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)); }
  dg.setAttribute('position', new T.Float32BufferAttribute(dust, 3));
  const m3 = new T.PointsMaterial({ color: 0xcfcab9, size: .012, transparent: true, opacity: .35, sizeAttenuation: true, depthWrite: false }); g.add(new T.Points(dg, m3));
  scene.add(g); scene.userData.bd = [m1, m2, m3];
}

const LIGHT = () => document.documentElement.dataset.theme === 'light';
const V3 = {}; // built lazily per 3D view
function buildView(key) {
  const isFam = key === 'families', scene = new T.Scene(), v = { key, scene, cam: { th: .65, ph: 1.15, d: 2.9, t: new T.Vector3(), vth: 0, vph: 0 }, fly: null, asm: { t0: 0 } };
  let n, pos, famArr, keyArr, shape, size0;
  if (!isFam) {
    const d = A.models[key]; n = d.cl.length; pos = normalise(d.xyz); keyArr = d.cl.map(c => c >= 0 ? d.keys[c] : null); famArr = keyArr.map(k => k ? CL[k].fam : 0); shape = new Float32Array(n); size0 = n > 4000 ? .022 : .027;
  } else {
    n = A.centroids.length; pos = normalise(A.centroids.flatMap(c => c.p), .985); keyArr = A.centroids.map(c => c.k); famArr = A.centroids.map(c => c.f);
    shape = Float32Array.from(keyArr, k => MODELS[CL[k].model].shape); size0 = n > 300 ? .055 : .07;
  }
  Object.assign(v, { n, pos, keyArr, famArr, shape });
  v.cols = { family: new Float32Array(n * 3), sub: new Float32Array(n * 3), anom: new Float32Array(n * 3) };
  v.fillCols = () => { const lt = LIGHT();
  for (let i = 0; i < n; i++) {
    const k = keyArr[i];
    if (!k) { const g = lt ? NOISE_L : NOISE; for (const arr of Object.values(v.cols)) arr.set(g, i * 3); continue; }
    const c = CL[k], f = hex2rgb(famOf(famArr[i]).base), s = lift(c.color), a = hex2rgb((lt ? VIZ_L : VIZ)[c.cat]);
    [[v.cols.family, f], [v.cols.sub, s], [v.cols.anom, a]].forEach(([arr, col]) => { const o = lt && arr !== v.cols.anom ? toLight(col) : col; arr[i * 3] = o[0]; arr[i * 3 + 1] = o[1]; arr[i * 3 + 2] = o[2]; });
  } }; v.fillCols();
  v.tgtC = Float32Array.from(v.cols.family); v.tgtA = new Float32Array(n).fill(.8); v.tgtS = new Float32Array(n).fill(size0); v.size0 = size0;
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  v.aC = mkAttr(geo, 'aColor', Float32Array.from(v.tgtC), 3, 1); v.aA = mkAttr(geo, 'aA', new Float32Array(n).fill(0), 1, 1);
  v.aS = mkAttr(geo, 'aSize', new Float32Array(n).fill(size0), 1, 1); mkAttr(geo, 'aShape', shape, 1);
  v.mesh = new T.Points(geo, isFam ? matNode : matCloud); v.mesh.frustumCulled = false; scene.add(v.mesh);
  // centroids (family / cluster) in screen space, used for labels and camera flights
  v.famC = {}; v.clC = {}; const fc = {}, cc = {};
  for (let i = 0; i < n; i++) { if (!keyArr[i]) continue; for (const [m, k] of [[fc, famArr[i]], [cc, keyArr[i]]]) { const o = (m[k] ||= [0, 0, 0, 0]); o[0] += pos[i * 3]; o[1] += pos[i * 3 + 1]; o[2] += pos[i * 3 + 2]; o[3]++; } }
  for (const k in fc) v.famC[k] = new T.Vector3(fc[k][0] / fc[k][3], fc[k][1] / fc[k][3], fc[k][2] / fc[k][3]);
  for (const k in cc) { v.clC[k] = new T.Vector3(cc[k][0] / cc[k][3], cc[k][1] / cc[k][3], cc[k][2] / cc[k][3]); v.clC[k].n = cc[k][3]; }
  let minY = n ? 9 : -1.2; for (let i = 0; i < n; i++) minY = Math.min(minY, pos[i * 3 + 1]);
  backdrop(scene, minY - .12);
  if (isFam) { // family cores: soft halo + tethers
    const hp = [], hc = [], ha = [], hs = [], lp = [], lc = [], la = [], lf = [];
    for (const f of FAM) { const c = v.famC[f.id]; if (!c || f.unassigned) continue; const col = hex2rgb(f.base); hp.push(c.x, c.y, c.z); hc.push(...col); ha.push(.1); hs.push(.34);
      for (let i = 0; i < n; i++) if (famArr[i] === f.id) { lp.push(c.x, c.y, c.z, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); lc.push(...col, ...col); la.push(.06, .2); lf.push(f.id, f.id); } }
    const hg = new T.BufferGeometry(); hg.setAttribute('position', new T.Float32BufferAttribute(hp, 3)); hg.setAttribute('aColor', new T.Float32BufferAttribute(hc, 3));
    v.hA = new T.BufferAttribute(Float32Array.from(ha), 1); hg.setAttribute('aA', v.hA); hg.setAttribute('aSize', new T.Float32BufferAttribute(hs, 1)); hg.setAttribute('aShape', new T.Float32BufferAttribute(ha.map(() => 0), 1));
    v.haloIds = FAM.filter(f => v.famC[f.id] && !f.unassigned).map(f => f.id); v.haloBase = ha; scene.add(Object.assign(new T.Points(hg, matHalo), { frustumCulled: false }));
    const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(lp, 3)); lg.setAttribute('aColor', new T.Float32BufferAttribute(lc, 3));
    v.lA = new T.BufferAttribute(Float32Array.from(la), 1); lg.setAttribute('aA', v.lA); v.lineFam = lf; v.lineBase = la; scene.add(Object.assign(new T.LineSegments(lg, matLine), { frustumCulled: false }));
  }
  return v;
}

function recompute(v) {
  if (!v) return;
  const isFam = v.key === 'families', { n, famArr, keyArr } = v, selK = S.cluster, selF = S.cluster ? CL[S.cluster].fam : 0;
  const hov = S.hover, mode = isFam ? 'family' : S.mode, src = v.cols[mode === 'sub' ? 'sub' : mode === 'anom' ? 'anom' : 'family'];
  v.tgtC.set(src); const lt = LIGHT();
  for (let i = 0; i < n; i++) {
    const f = famArr[i], k = keyArr[i];
    if (!k) { // noise: a faint, neutral haze that recedes whenever something is selected
      let a = S.noise ? (lt ? .32 : .2) * (NCL ? 1 : 2.6) : 0; if (S.family || selK || S.qset || S.cat) a *= .2; if (hov) a *= .5;
      v.tgtA[i] = a; v.tgtS[i] = v.size0 * .8; continue;
    }
    let a = isFam ? .86 : (lt ? .8 : .68), s = v.size0;
    if (S.family && f !== S.family) { a = isFam ? .1 : .045; s *= .75; } else if (S.family) { a = .95; s *= 1.12; }
    if (selK) {
      if (k === selK) { a = 1; s *= isFam ? 1.55 : 2.1; }
      else if (!S.family) { a = f === selF ? (isFam ? .6 : .3) : (isFam ? .16 : .04); s *= f === selF ? 1 : .75; }
    }
    if (S.qset) { if (S.qset.has(k)) { a = Math.min(1, a * 1.3 + .12); s *= 1.15; } else { a *= .1; s *= .8; } }
    if (S.cat && CL[k].cat !== S.cat) { a *= .08; s *= .8; }
    if (hov) { if (k === hov) { a = Math.max(a, 1); s *= isFam ? 1.35 : 1.7; } else a *= isFam ? .6 : .5; }
    v.tgtA[i] = a; v.tgtS[i] = s;
  }
  v.dirty = true;
  if (isFam) {
    v.haloIds.forEach((id, j) => v.haloBase[j] = (!S.family || S.family === id) ? (S.family === id ? .22 : .1) : .02);
    v.hTgt = v.haloBase.slice(); v.lTgt = v.lineFam.map((id, j) => ((!S.family || S.family === id) ? v.lineBase[j] * (S.family === id ? 1.7 : 1) : .01));
  }
}
function stepAttrs(v, dt) {
  if (!v) return; const kA = 1 - Math.exp(-dt * 9); let moving = false;
  const A_ = v.aA.array, S_ = v.aS.array, C_ = v.aC.array;
  for (let i = 0; i < v.n; i++) {
    const da = v.tgtA[i] - A_[i], ds = v.tgtS[i] - S_[i]; if (Math.abs(da) > .002) { A_[i] += da * kA; moving = true; } else A_[i] = v.tgtA[i];
    if (Math.abs(ds) > 1e-4) { S_[i] += ds * kA; moving = true; } else S_[i] = v.tgtS[i];
    for (let k = 0; k < 3; k++) { const j = i * 3 + k, dc = v.tgtC[j] - C_[j]; if (Math.abs(dc) > .004) { C_[j] += dc * kA * .7; moving = true; } else C_[j] = v.tgtC[j]; }
  }
  if (moving || v.dirty) { v.aA.needsUpdate = v.aS.needsUpdate = true; v.aC.needsUpdate = true; }
  if (v.hA) {
    for (let j = 0; j < v.hA.count; j++) { v.hA.array[j] += (v.hTgt[j] - v.hA.array[j]) * kA; } v.hA.needsUpdate = true;
    for (let j = 0; j < v.lA.count; j++) { v.lA.array[j] += (v.lTgt[j] - v.lA.array[j]) * kA; } v.lA.needsUpdate = true;
  }
  v.dirty = moving;
}

/* camera + interaction */
let W = 0, H = 0, hoverPx = null, drag = null, lastInteract = 0;
const cur = () => V3[S.view];
function camPlace(v) {
  const c = v.cam, sp = Math.sin(c.ph);
  camera.position.set(c.t.x + c.d * sp * Math.sin(c.th), c.t.y + c.d * Math.cos(c.ph), c.t.z + c.d * sp * Math.cos(c.th)); camera.lookAt(c.t); U.uDist.value = c.d;
}
function viewShift() { // centre the scene in the space left free by the side panels
  if (matchMedia('(max-width:900px)').matches) return 0; const ins = document.body.classList.contains('ins'), narrow = innerWidth < 1280;
  const l = S.panel && !(ins && narrow) ? $('#panel').offsetWidth + 20 : 0, r = ins ? $('#inspector').offsetWidth + 20 : 0; return (l - r) / 2;
}
function placeDock() {
  const d = $('#dock'); if (!d) return; const ins = document.body.classList.contains('ins'), l = S.panel ? $('#panel').offsetWidth + 40 : 20, r = innerWidth - (ins ? $('#inspector').offsetWidth + 40 : 20) - (S.view === 'families' ? $('#shapeKey').offsetWidth + 16 : 0), free = r - l;
  d.style.left = (l + r) / 2 + 'px'; d.classList.toggle('compact', free < 860);
}
function resize() {
  placeDock(); W = innerWidth; H = innerHeight; camera.aspect = W / H;
  if (renderer) { renderer.setSize(W, H); const sh = viewShift(); camera.setViewOffset(W, H, -sh, 0, W, H); U.uScale.value = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360)); }
  camera.updateProjectionMatrix(); placeInk();
}
function flyTo(v, target, dist, dur = 1100) { const c = v.cam; v.fly = { t0: performance.now(), dur, from: { t: c.t.clone(), d: c.d }, to: { t: target.clone(), d: dist } }; }
function resetCam(v) { flyTo(v, new T.Vector3(), 2.9, 1200); }
function stepCam(v, dt, now) {
  const c = v.cam;
  if (v.fly) { const k = clamp((now - v.fly.t0) / v.fly.dur, 0, 1), e = ease(k); c.t.lerpVectors(v.fly.from.t, v.fly.to.t, e); c.d = v.fly.from.d + (v.fly.to.d - v.fly.from.d) * e; if (k >= 1) v.fly = null; }
  if (!drag) { c.th += c.vth; c.ph = clamp(c.ph + c.vph, .25, Math.PI - .25); c.vth *= .93; c.vph *= .93; }
  if (S.orbit && !drag && now - lastInteract > 4500 && !S.cluster && !v.fly) c.th += dt * .045;
  camPlace(v);
}
const gl = renderer ? renderer.domElement : document.createElement('canvas'); const ptrs = new Map();
gl.addEventListener('pointerdown', e => { gl.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { x: e.clientX, y: e.clientY, moved: 0, pan: e.button === 2 || e.shiftKey, pd: 0 }; glHost.classList.add('drag'); lastInteract = performance.now(); hideTip(); });
gl.addEventListener('contextmenu', e => e.preventDefault());
gl.addEventListener('pointermove', e => {
  hoverPx = { x: e.clientX, y: e.clientY }; if (!drag) return; const v = cur(), c = v.cam, p = ptrs.get(e.pointerId); if (!p) return;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; p.x = e.clientX; p.y = e.clientY; const d1 = Math.hypot(a.x - b.x, a.y - b.y); if (drag.pd) c.d = clamp(c.d * drag.pd / d1, 1.0, 7); drag.pd = d1; drag.moved = 99; return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy); lastInteract = performance.now(); v.fly = null;
  if (drag.pan) { const k = c.d * .0016, r = new T.Vector3().setFromMatrixColumn(camera.matrix, 0), u = new T.Vector3().setFromMatrixColumn(camera.matrix, 1); c.t.addScaledVector(r, -dx * k).addScaledVector(u, dy * k); }
  else { c.vth = -dx * .0055 * .35; c.vph = -dy * .0055 * .35; c.th -= dx * .0055; c.ph = clamp(c.ph - dy * .0055, .25, Math.PI - .25); }
});
const endPtr = e => { const was = drag; ptrs.delete(e.pointerId); if (!ptrs.size) { drag = null; glHost.classList.remove('drag'); } if (was && was.moved < 6 && e.type === 'pointerup') pick(true, e); };
gl.addEventListener('pointerup', endPtr); gl.addEventListener('pointercancel', endPtr);
gl.addEventListener('pointerleave', () => { hoverPx = null; setHover(null); hideTip(); });
gl.addEventListener('wheel', e => { e.preventDefault(); const v = cur(); if (!v) return; v.fly = null; v.cam.d = clamp(v.cam.d * Math.exp(e.deltaY * .0012), 1.0, 7); lastInteract = performance.now(); }, { passive: false });
gl.addEventListener('dblclick', () => { clearSel(); resetCam(cur()); });

const tmpV = new T.Vector3();
function pick(click, e) {
  const v = cur(); if (!v || !v.mesh || S.view === 'taxonomy') return -1; const px = click ? { x: e.clientX, y: e.clientY } : hoverPx; if (!px) return -1;
  let best = -1, bd = click ? 16 : 13; const isFam = v.key === 'families'; if (isFam) bd = 20;
  const pos = v.pos, aA = v.tgtA, thr = isFam ? .09 : .1;
  for (let i = 0; i < v.n; i++) {
    if (aA[i] < (v.keyArr[i] ? thr : .15)) continue; tmpV.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).project(camera); if (tmpV.z > 1) continue;
    const sx = (tmpV.x * .5 + .5) * W, sy = (-tmpV.y * .5 + .5) * H, d = Math.hypot(sx - px.x, sy - px.y) + tmpV.z * 4 + (v.keyArr[i] ? 0 : 3); if (d < bd) { bd = d; best = i; }
  }
  if (click) { const k = best >= 0 ? v.keyArr[best] : null; if (k) selectCluster(k, { fly: true }); else if (S.cluster) selectCluster(null); return best; }
  return best;
}
let pickClock = 0;
function updateHover(now) {
  if (drag || !hoverPx || now - pickClock < 40) return; pickClock = now; const v = cur(); if (!v) return; const i = pick(false);
  if (i >= 0) { const k = v.keyArr[i]; if (S.hover !== k) setHover(k); showTip(i, v); } else { if (S.hover) setHover(null); hideTip(); }
}
function setHover(k) { if (S.hover === k) return; S.hover = k; recompute(cur()); }
const tip = $('#tip');
function srcLine(src) { // "video · window · decision" for the first source, plus how many more
  if (!src || !src.length) return ''; const [vi, w, a] = src[0], vd = VID[vi];
  return `${L('video {v}', { v: esc(vd ? vd.id : '?') })}${vd && vd.windows > 1 ? ` · ${L('window {n}', { n: w + 1 })}` : ''} · ${L(a ? 'VLM anomalous' : 'VLM normal')}${src.length > 1 ? ` · ${L('+{n} more', { n: src.length - 1 })}` : ''}`;
}
function showTip(i, v) {
  const k = v.keyArr[i];
  if (!k) { const d = A.models[v.key]; tip.style.setProperty('--c', 'var(--quiet)'); tip.innerHTML = `<div class="tf noise"><i></i>${L('Noise · not assigned to a cluster')}</div><p>“${esc(d.ev[i])}”</p><small>${srcLine(d.src[i])}</small>`; placeTip(hoverPx.x, hoverPx.y); return; }
  const c = CL[k], f = famOf(c.fam); let body;
  if (v.key === 'families') body = `<p>${MODELS[c.model].sym} ${MODELS[c.model].short} · ${L('cluster {n}', { n: c.id })} · ${plural(c.n, 'statement')}</p><small>${L('{p}% anomalous videos', { p: c.pct })} · ${esc(CATN(c.cat))}</small>`;
  else { const d = A.models[v.key]; body = `<p>“${esc(d.ev[i])}”</p><small>${srcLine(d.src[i])} · ${L('cluster {n}', { n: c.id })}</small>`; }
  tip.style.setProperty('--c', f.color); tip.innerHTML = `<div class="tf"><i></i>${f.code} · ${esc(f.name)}</div><b>${esc(c.name)}</b>${body}`;
  placeTip(hoverPx.x, hoverPx.y);
}
function hideTip() { tip.classList.remove('on'); }
function placeTip(cx, cy) { // measure the real card and keep it fully inside the viewport
  const w = tip.offsetWidth || 288, h = tip.offsetHeight || 150, m = 12; let x = cx + 18, y = cy + 18;
  if (x + w + m > innerWidth) x = cx - w - 18; if (y + h + m > innerHeight) y = cy - h - 18;
  tip.style.transform = `translate(${clamp(x, m, Math.max(m, innerWidth - w - m))}px,${clamp(y, m, Math.max(m, innerHeight - h - m))}px)`; tip.classList.add('on');
}

/* labels overlay */
const labelsEl = $('#labels'), flabs = {};
FAM.forEach(f => { const e = document.createElement('div'); e.className = 'flab'; e.style.setProperty('--c', f.color); e.innerHTML = `<i></i>${esc(f.code)}`; e.style.display = 'none'; labelsEl.appendChild(e); flabs[f.id] = e; });
const clab = document.createElement('div'); clab.className = 'clab'; clab.style.opacity = 0; labelsEl.appendChild(clab);
const proj = new T.Vector3();
function updateLabels(v) {
  const vis = S.view !== 'taxonomy' && S.labels;
  for (const f of FAM) {
    const e = flabs[f.id], c = v && v.famC[f.id]; if (!vis || !c || f.unassigned) { e.style.display = 'none'; continue; }
    proj.copy(c).project(camera); if (proj.z > 1) { e.style.display = 'none'; continue; }
    const sx = (proj.x * .5 + .5) * W, sy = (-proj.y * .5 + .5) * H, on = S.family === f.id, depth = clamp(1.15 - (proj.z - .9) * 22, .3, 1);
    e.style.display = 'flex'; e.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%)`;
    e.style.opacity = S.family && !on ? 0 : (S.family ? 1 : depth * .85);
    if (on !== e.classList.contains('name')) { e.classList.toggle('name', on); e.innerHTML = on ? `<i></i><b>${esc(f.code)}</b> ${esc(f.name)}` : `<i></i>${esc(f.code)}`; }
  }
  const k = S.hover || S.cluster, c = v && k && v.clC[k];
  if (vis && c) { proj.copy(c).project(camera); const sx = (proj.x * .5 + .5) * W, sy = (-proj.y * .5 + .5) * H; if (clab.dataset.k !== k) { clab.dataset.k = k; clab.textContent = CL[k].name; } clab.style.transform = `translate(${sx}px,${sy - 18}px) translate(-50%,-100%)`; clab.style.opacity = proj.z < 1 ? 1 : 0; }
  else clab.style.opacity = 0;
}

/* ------------------------------------------------------------------ shared UI: panel / inspector */
const panelBody = $('#panelBody'), insBody = $('#insBody');
const pct = x => (Math.round(x * 10) / 10).toString().replace(/\.0$/, '');
const shapeCls = m => ['', 'd', 's', 't'][MODELS[m].shape];
const catDot = k => `<i class="dot ${shapeCls(CL[k].model)}" style="background:${catColor(k)}"></i>`;
const subHex = k => rgbHex(LIGHT() ? toLight(lift(CL[k].color)) : lift(CL[k].color));
const vizHex = c => (LIGHT() ? VIZ_L : VIZ)[c];
const inScope = (k, view) => view === 'families' || CL[k].model === view;
const multi = MKEYS.length > 1;
const srowHTML = (k, view, o = {}) => { const c = CL[k], f = famOf(c.fam);
  return `<button class="srow ${o.wide ? 'wide' : ''} ${S.cluster === k ? 'on' : ''}" data-k="${esc(k)}" title="${esc(c.rep)}">${o.dot || catDot(k)}<span class="nm">${view === 'families' && multi ? MODELS[c.model].sym + ' ' : ''}${esc(c.name)}${o.wide ? `<small>${esc(f.code)} · ${esc(f.name)}</small>` : ''}</span><span class="pc">${o.right ?? pct(c.pct) + '%'}</span></button>`; };
function filtersHTML() {
  const ch = []; if (S.family) { const f = famOf(S.family); ch.push(`<button class="chip on" data-clr="family">${esc(f.code)} · ${esc(f.name.slice(0, 26))}${f.name.length > 26 ? '…' : ''} ${XI}</button>`); }
  if (S.cat) ch.push(`<button class="chip on" data-clr="cat">${esc(S.cat)} ${XI}</button>`); return ch.length ? `<div class="filters">${ch.join('')}</div>` : '';
}
function famListHTML(view) {
  const q = S.qset; let any = false;
  const html = FAM.map(f => {
    const kids = f.keys.filter(k => inScope(k, view)), mk = q ? kids.filter(k => q.has(k)) : kids, cnt = view === 'families' ? f.keys.length : (f.pts[view] || 0), off = !cnt, on = S.family === f.id;
    if (q && !mk.length) return ''; any = true;
    const open = on || (q && mk.length);
    const subs = open ? `<div class="subs">${(q ? mk : kids).map(k => srowHTML(k, view)).join('')}</div>` : '';
    return `<button class="frow ${on ? 'on' : ''} ${off ? 'off' : ''}" style="--c:${f.color}" data-f="${f.id}" title="${esc(f.code)} · ${esc(f.name)}" ${off ? 'tabindex="-1"' : ''}><span class="sw"></span><span class="cd">${esc(f.code)}</span><span class="nm">${esc(fname(f))}</span><span class="ct">${q ? mk.length : (off ? '—' : cnt)}</span></button>${subs}`;
  }).join('');
  return any ? html : `<div class="empty">${L(NCL ? 'No family or cluster matches your search.' : 'No clusters were found in this run.')}</div>`;
}
function listHTML(view) {
  const isFam = view === 'families', mode = isFam ? 'family' : S.mode, q = S.qset;
  const keys = Object.keys(CL).filter(k => inScope(k, view) && (!q || q.has(k)));
  if (mode === 'family') return `<div class="sec"><h4>${L('Candidate families')} <button id="clearFam" style="${S.family ? '' : 'display:none'}">${L('Clear')}</button></h4><div class="flist" id="flist">${famListHTML(view)}</div></div>`;
  if (mode === 'sub') {
    const rows = keys.sort((a, b) => CL[b].n - CL[a].n || CL[a].id - CL[b].id);
    return `<div class="sec"><h4>${L('Clusters · {n}', { n: rows.length })}</h4>${filtersHTML()}<p class="lsub">${L("Each dot is the cluster's own colour in the cloud. Sorted by number of statements.")}</p>
      <div class="flist">${rows.length ? rows.map(k => srowHTML(k, view, { wide: 1, dot: `<i class="sw2" style="background:${subHex(k)}"></i>`, right: CL[k].n })).join('') : `<div class="empty">${L('No cluster matches your search.')}</div>`}</div></div>`;
  }
  const inModel = Object.keys(CL).filter(k => inScope(k, view)), cnt = c => inModel.filter(k => CL[k].cat === c).length, pts = c => inModel.reduce((s, k) => s + (CL[k].cat === c ? CL[k].n : 0), 0);
  const rows = keys.filter(k => !S.cat || CL[k].cat === S.cat).sort((a, b) => CL[b].pct - CL[a].pct || CL[b].n - CL[a].n);
  return `<div class="sec"><h4>${L('Anomaly category')} <button id="clearCat" style="${S.cat ? '' : 'display:none'}">${L('Clear')}</button></h4><div class="legend">${CAT_ORDER.map(c => `<button class="lg ${S.cat === c ? 'on' : ''} ${S.cat && S.cat !== c ? 'off' : ''}" data-cat="${c}" style="--c:${vizHex(c)}"><i class="sq"></i><span><b>${CATN(c)}</b><small>${L('{n} statements', { n: pts(c) })} · ${CAT[c].rule.replace(' and ', L(' and '))}%</small></span><span class="ct">${cnt(c)}</span></button>`).join('')}</div></div>
    <div class="sec"><h4>${L('Clusters · {n}', { n: rows.length })}</h4>${filtersHTML()}<p class="lsub">${L('Sorted by {x}.', { x: esc(SHARE_TXT) })}</p><div class="flist">${rows.length ? rows.map(k => srowHTML(k, view, { dot: `<i class="dot" style="background:${vizHex(CL[k].cat)}"></i>` })).join('') : `<div class="empty">${L('No cluster matches these filters.')}</div>`}</div></div>`;
}
function renderList(keepScroll = true) {
  const host = $('#listHost'); if (!host) return; const sc = panelBody.scrollTop; host.innerHTML = listHTML(S.view); if (keepScroll) panelBody.scrollTop = sc;
}
function diagHTML(filter) {
  const ds = (META.diagnostics || []).filter(d => !filter || !d.model || d.model === filter);
  return ds.map(d => `<div class="diag"><b>${esc(d.code.replace(/_/g, ' ').toUpperCase())}</b>${esc(diagText(d))}</div>`).join('');
}
function lead(view) {
  if (view === 'families') return [L('Family field'), `${plural(NFAM, 'candidate family', 'candidate families')}`,
    `${L('Each node is a first-stage cluster, positioned by the normalised centroid of its evidence embeddings.')}${multi ? ' ' + MKEYS.map(m => `${MODELS[m].sym} ${MODELS[m].label}`).join(' · ') + '.' : ''} ${L('Tethers join the nodes the second stage grouped into one family.')}`];
  const m = A.models[view];
  return [L('Evidence space'), MODELS[view].label, L('Each point is one unique evidence statement written by {model}, placed so that similar descriptions sit together. Points sharing a colour belong to the same candidate family; grey points are noise.', { model: esc(MODELS[view].label) })];
}
function renderPanel() {
  const v = S.view; if (v === 'taxonomy') return renderTaxPanel();
  const [, h, ld] = lead(v), isFam = v === 'families', m = A.models[v];
  const fx = (n, l) => `<b>${fmt(n)}</b> ${l}`;
  const sharedBy = FAM.filter(f => !f.unassigned && MKEYS.every(k => f.n[k])).length;
  const noise = isFam ? 0 : m.cl.filter(c => c < 0).length;
  const stats = (isFam ? [fx(NCL, L('clusters')), fx(NFAM, L('families')), ...(multi ? [fx(sharedBy, L('shared by all models'))] : [])]
    : [fx(m.cl.length, L('statements')), fx(m.keys.length, L('clusters')), fx(noise, L('noise')), fx(FAM.filter(f => f.n[v] && !f.unassigned).length, L('families'))]).join(' · ');
  const seg = isFam ? '' : `<div class="sec"><h4>${L('Colour by')}</h4><div class="seg" id="modeSeg">${[['family', 'Family'], ['sub', 'Cluster'], ['anom', 'Anomaly']].map(([k, l]) => `<button data-m="${k}" class="${S.mode === k ? 'on' : ''}">${L(l)}</button>`).join('')}</div>
    <p class="lead" style="font-size:calc(11px*var(--fs));margin-top:8px" id="modeNote"></p></div>`;
  panelBody.innerHTML = `<h2>${esc(h)}</h2><p class="lead">${ld}</p><p class="facts">${stats}</p>${diagHTML(isFam ? null : MODELS[v].label)}${seg}
    <div class="sec"><h4>${L('Find')} <span style="font:400 calc(11px*var(--fs)) var(--sans);color:var(--quiet)">${L('press / · Enter selects')}</span></h4><input class="search" id="lsSearch" type="search" placeholder="${L('Search clusters, families, F01…')}" value="${esc(S.q)}" autocomplete="off"></div>
    <div id="listHost"></div>
    <div class="note">${L(isFam ? 'Each point is a normalised BGE centroid. ' : 'Axes are not interpretable — distances are qualitative. ')}${L("Families come from automatic agglomerative clustering of centroids; names are keywords taken from the cluster's own statements. Nothing here was reviewed by a person.")}</div>`;
  renderList(false); updateModeNote();
}
function updateModeNote() {
  const n = $('#modeNote'); if (!n) return;
  n.innerHTML = { family: L('Hue = candidate family, consistent across all views. Grey = noise.'), sub: L('One colour per cluster. Every cluster is listed below.'), anom: CAT_ORDER.map(c => `<span style="color:${vizHex(c)}">■</span> ${CATN(c)}`).join('<br>') + '<br>' + L('Based on the {x}.', { x: esc(SHARE_TXT) }) }[S.mode];
}
function refreshPanelSelection() {
  if (S.view === 'taxonomy') { renderTaxPanel(true); return; }
  renderList(true); const on = $('#listHost .srow.on'); if (on) { const r = on.getBoundingClientRect(), p = panelBody.getBoundingClientRect(); if (r.top < p.top || r.bottom > p.bottom) panelBody.scrollTop += r.top - p.top - p.height / 3; }
}
function applyFilters() { Object.values(V3).forEach(recompute); renderList(true); tax.apply(); }
function firstMatch() {
  if (!S.qset || !S.qset.size) return null; const scope = MKEYS.includes(S.view) ? S.view : null;
  return [...S.qset].filter(k => !scope || CL[k].model === scope).sort((a, b) => CL[b].n - CL[a].n)[0] || null;
}
panelBody.addEventListener('click', e => {
  const clr = e.target.closest('[data-clr]'); if (clr) { if (clr.dataset.clr === 'family') selectFamily(0, { fly: true }); else { S.cat = null; applyFilters(); } return; }
  const sr = e.target.closest('.srow'); if (sr) return selectCluster(sr.dataset.k, { fly: true });
  const fr = e.target.closest('.frow'); if (fr) { const id = +fr.dataset.f; if (fr.classList.contains('off')) return; return selectFamily(S.family === id && !S.cluster ? 0 : id, { fly: true }); }
  if (e.target.id === 'clearFam') return selectFamily(0, { fly: true });
  if (e.target.id === 'clearCat') { S.cat = null; return applyFilters(); }
  const lg = e.target.closest('#listHost .lg'); if (lg) { S.cat = S.cat === lg.dataset.cat ? null : lg.dataset.cat; return applyFilters(); }
  const mb = e.target.closest('#modeSeg button'); if (mb) { S.mode = mb.dataset.m; S.cat = null; $$('#modeSeg button').forEach(b => b.classList.toggle('on', b === mb)); updateModeNote(); Object.values(V3).forEach(recompute); renderList(false); panelBody.scrollTop = Math.min(panelBody.scrollTop, 340); return; }
  tax.panelClick(e);
});
panelBody.addEventListener('input', e => { if (e.target.id === 'lsSearch' || e.target.id === 'txSearch') { setQuery(e.target.value); if (S.view === 'taxonomy') tax.apply(); else applyFilters(); } });
panelBody.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList?.contains('search')) { const k = firstMatch(); if (k) selectCluster(k, { fly: true }); } });

function evAll(k) { // every statement of the cluster with its provenance, nothing sampled
  const d = A.models[CL[k].model]; return (evByCluster[k] || []).map(i => ({ t: d.ev[i], src: d.src[i] })).sort((a, b) => b.src.length - a.src.length);
}
function citeHTML(src) {
  const shown = src.slice(0, 3).map(([vi, w, a]) => { const vd = VID[vi]; return `<button class="vlink" data-vid="${vi}">${esc(vd ? vd.id : '?')}${vd && vd.windows > 1 ? `·w${w + 1}` : ''}</button><span class="pred a${a}">${L(a ? 'ANOM' : 'NORM')}</span>`; });
  return shown.join(' ') + (src.length > 3 ? ` <span>+${src.length - 3}</span>` : '');
}
function actions(model) { // cross-view jumps, never offering the view we are already in
  const v = S.view, o = [];
  if (v !== 'taxonomy' && NFAM) o.push(`<button class="btn pri" data-act="matrix">${L('Show in taxonomy')}</button>`);
  if (v !== 'families') o.push(`<button class="btn ${o.length ? '' : 'pri'}" data-act="fam3d">${L('Open in family map')}</button>`);
  (model ? [model] : MKEYS).filter(m => m !== v).forEach(m => o.push(`<button class="btn ${o.length ? '' : 'pri'}" data-act="cloud" data-m="${m}">${L('Open in {m} cloud', { m: esc(MODELS[m].short) })}</button>`));
  return o.join('');
}
const FLAG_TXT = { appearance: 'Dominated by appearance cues (colour, clothing)', image_quality: 'Dominated by image-quality or viewpoint descriptions', generic: 'Dominated by generic “nothing unusual” statements' };
function renderInspector() {
  const k = S.cluster, f = S.family; document.body.classList.toggle('ins', !!(k || f)); $('#inspector').classList.toggle('open', !!(k || f)); resize();
  if (!k && !f) return;
  insBody.scrollTop = 0;
  if (k) {
    const c = CL[k], fam = famOf(c.fam), cat = CAT[c.cat], samples = evAll(k), cap = 250;
    insBody.innerHTML = `<h3>${esc(c.name)}</h3>
      <button class="fchip" style="--c:${fam.color}" data-act="family" data-f="${fam.id}"><i></i><b>${esc(fam.code)}</b>${esc(fam.name)}</button>
      <div class="rep"><small>${L('REPRESENTATIVE STATEMENT')}</small>${esc(c.rep)}</div>
      ${c.topics.length ? `<div class="topics">${c.topics.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      ${c.flags.map(x => `<span class="flag">⚑ ${esc(L(FLAG_TXT[x] || x))}</span>`).join('')}${c.excluded ? `<span class="flag">${L('Excluded from the second stage by configuration')}</span>` : ''}
      <div class="meter" style="--c:${cat.color}"><div class="row"><div class="big">${pct(c.pct)}<sup>%</sup></div><span class="cat"><i></i>${esc(CATN(c.cat))}</span></div><div class="bar"><i style="width:0" data-w="${c.pct}%"></i></div><small>${esc(SHARE_TXT)} · ${esc(L(cat.text))}</small></div>
      <dl class="kv"><dt>${L('Model')}</dt><dd>${MODELS[c.model].sym} ${esc(MODELS[c.model].label)} · ${L('HDBSCAN cluster {n}', { n: c.id })}</dd><dt>${L('Evidence')}</dt><dd>${plural(c.n, 'unique statement')} · ${plural(c.occ, 'occurrence')}</dd><dt>${L('Videos')}</dt><dd>${plural(c.vids, 'supporting video')}</dd></dl>
      <div class="actions">${actions(c.model)}</div>
      <div class="sec"><h4>${L('Evidence statements')} <span style="font:400 calc(11px*var(--fs)) var(--sans);color:var(--quiet)">${samples.length}${samples.length > cap ? ` · ${L('first {n}', { n: cap })}` : ''} · ${L('click a video to trace it')}</span></h4><div class="ev" style="--c:${fam.color}">${samples.slice(0, cap).map(s => `<blockquote>${esc(s.t)}<cite>${citeHTML(s.src)}</cite></blockquote>`).join('')}</div></div>`;
  } else {
    const fam = famOf(f), cats = CAT_ORDER.filter(c => fam.cats[c]);
    insBody.innerHTML = `<h3>${esc(fname(fam))}</h3>
      ${fam.rep ? `<div class="rep"><small>${L(fam.unassigned ? 'NOTE' : 'REPRESENTATIVE STATEMENT')}</small>${esc(fam.unassigned ? L(fam.rep) : fam.rep)}</div>` : ''}
      ${fam.topics.length ? `<div class="topics">${fam.topics.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      <dl class="kv"><dt>${L('Family')}</dt><dd>${esc(fam.code)} · ${L(fam.unassigned ? 'clusters without a family' : 'automatic candidate grouping')}</dd><dt>${L('Clusters')}</dt><dd>${fam.keys.length}${multi ? ' · ' + modelMix(fam) : ''}</dd><dt>${L('Evidence')}</dt><dd>${plural(MKEYS.reduce((s, m) => s + fam.pts[m], 0), 'statement')}</dd></dl>
      <div class="meter" style="--c:${fam.color}"><div class="row"><div class="big">${pct(fam.mean)}<sup>%</sup></div><span class="cat" style="color:var(--muted)">${L('mean anomalous-video share')}</span></div>
      <div class="dist" style="margin-top:14px">${cats.map(c => `<i title="${c}" style="--c:${CAT[c].color};flex:${fam.cats[c]}"></i>`).join('')}</div><small>${cats.map(c => `${fam.cats[c]} ${CATN(c).toLowerCase()}`).join(' · ')}</small></div>
      <div class="sec"><h4>${L('Clusters')}</h4><div class="subs" style="margin:0;border:0;padding:0">${fam.keys.map(k => `<button class="srow" data-k="${esc(k)}">${catDot(k)}<span class="nm">${multi ? MODELS[CL[k].model].sym + ' ' : ''}${esc(CL[k].name)}</span><span class="pc">${pct(CL[k].pct)}%</span></button>`).join('')}</div></div>
      <div class="actions">${actions(null)}</div>`;
  }
  requestAnimationFrame(() => $$('.bar i', insBody).forEach(b => b.style.width = b.dataset.w));
}
insBody.addEventListener('click', e => {
  const vl = e.target.closest('.vlink'); if (vl) return sources.open(+vl.dataset.vid);
  const sr = e.target.closest('.srow'); if (sr) return selectCluster(sr.dataset.k, { fly: true });
  const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
  if (a === 'family') selectFamily(+b.dataset.f, { fly: true, keepCluster: true });
  else if (a === 'matrix') go('taxonomy');
  else if (a === 'fam3d') go('families');
  else if (a === 'cloud') go(b.dataset.m);
});
$('#insClose').addEventListener('click', () => clearSel());

/* selection */
function afterSel(opts = {}) {
  Object.values(V3).forEach(recompute); refreshPanelSelection(); renderInspector(); tax.apply(); syncHash();
  const v = cur(); if (!v || S.view === 'taxonomy' || !opts.fly) return;
  if (S.cluster && v.clC[S.cluster]) flyTo(v, v.clC[S.cluster], v.key === 'families' ? 1.7 : 1.5);
  else if (S.family && v.famC[S.family]) flyTo(v, v.famC[S.family], v.key === 'families' ? 2.0 : 2.1);
  else if (!S.family && !S.cluster) flyTo(v, new T.Vector3(), 2.9);
}
function selectFamily(id, o = {}) { S.family = id; if (!o.keepCluster || (S.cluster && CL[S.cluster].fam !== id)) S.cluster = null; afterSel(o); }
function selectCluster(k, o = {}) { S.cluster = k; if (k) S.family = CL[k].fam; afterSel(o); }
function clearSel() { S.cluster = null; S.family = 0; afterSel({ fly: true }); }

/* ------------------------------------------------------------------ Taxonomy view */
const tax = (() => {
  const host = $('#taxo'), cellsEl = $('#cells'), flEl = $('#flabels'), guides = $('#guides'), stage = $('#stage'), readout = $('#readout'), world = $('#world');
  const cells = [], flabs = [], NF = FAM.length, NR = Math.max(1, ...FAM.map(f => f.keys.length));
  let built = false, size = { w: 0, h: 0 }, firstShow = true, geom = null;
  const famOrder = () => S.tx.order === 'anom' ? [...FAM].sort((a, b) => (a.unassigned - b.unassigned) || b.mean - a.mean).map(f => f.id) : FAM.map(f => f.id);
  const shapeSVG = (m, col) => [`<circle class="sh" cx="50" cy="50" r="46" fill="${col}"/>`, `<polygon class="sh" points="50,2 98,50 50,98 2,50" fill="${col}"/>`,
    `<rect class="sh" x="8" y="8" width="84" height="84" rx="6" fill="${col}"/>`, `<polygon class="sh" points="50,4 97,90 3,90" fill="${col}"/>`][MODELS[m].shape];
  function build() {
    if (built) return; built = true;
    host.classList.toggle('empty', !NCL);
    if (!NCL) { $('#taxEmptyText').textContent = (META.diagnostics || []).map(d => diagText(d)).join(' ') || L('The run produced no clusters.'); return; }
    FAM.forEach(f => f.keys.forEach((k, r) => {
      const c = CL[k], el = document.createElement('div'); el.className = 'cell pre' + (c.cat === 'Anomalous' ? ' glow' : ''); el.dataset.k = k; el.style.setProperty('--g', CAT[c.cat].color);
      el.innerHTML = `<svg viewBox="0 0 100 100">${shapeSVG(c.model, CAT[c.cat].color)}</svg>`; el.setAttribute('role', 'button'); el.setAttribute('aria-label', `${f.code} ${c.name}, ${c.cat}`);
      cellsEl.appendChild(el); cells.push({ el, k, f: f.id, r, c });
    }));
    FAM.forEach(f => { const el = document.createElement('div'); el.className = 'fl'; el.style.setProperty('--c', f.color); el.innerHTML = `<i></i><span class="fc">${esc(f.code)}</span><span class="fn">${esc(fname(f))}</span>`; el.dataset.f = f.id; el.setAttribute('aria-label', f.code + ' ' + f.name); flEl.appendChild(el); flabs[f.id] = el; });
    cellsEl.addEventListener('mouseover', e => { const el = e.target.closest('.cell'); if (el && !panning) { hoverCell(el.dataset.k); cellTip(el.dataset.k, e); } });
    cellsEl.addEventListener('mousemove', e => { if (hovC && !panning) cellTip(hovC, e); });
    cellsEl.addEventListener('mouseleave', () => { hoverCell(null); hideTip(); });
    cellsEl.addEventListener('click', e => { const el = e.target.closest('.cell'); if (el) selectCluster(S.cluster === el.dataset.k ? null : el.dataset.k, { keepFamily: true }); else if (S.cluster || S.family) clearSel(); });
    flEl.addEventListener('click', e => { const el = e.target.closest('.fl'); if (el) { const id = +el.dataset.f; selectFamily(S.family === id && !S.cluster ? 0 : id); } });
    flEl.addEventListener('mouseover', e => { const el = e.target.closest('.fl'); if (el && !panning) { hoverFam(+el.dataset.f); famTip(+el.dataset.f, e); } });
    flEl.addEventListener('mousemove', e => { if (hovF && !panning) famTip(hovF, e); }); flEl.addEventListener('mouseleave', () => { hoverFam(0); hideTip(); });
    stage.addEventListener('click', e => { if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); } }, true);
    stage.addEventListener('click', e => { if (e.target === stage || e.target === world || e.target.id === 'guides') { if (S.cluster || S.family) clearSel(); } });
    initZoom();
    new ResizeObserver(() => { if (host.classList.contains('on')) layout(true); }).observe(stage);
  }
  function layout(instant) {
    if (!NCL) return;
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; size = { w, h }; const ord = famOrder(), wheel = S.tx.layout === 'wheel';
    host.classList.toggle('matrix', !wheel); const g = { wheel }; geom = g; if (lastLayoutKey !== S.tx.layout + S.tx.order) { lastLayoutKey = S.tx.layout + S.tx.order; fit(false); }
    const pos = {}, fpos = {};
    if (wheel) {
      const labelLen = clamp(Math.min(w, h) * .2, 80, 130), R = Math.max(60, Math.min(w, h) / 2 - 26 - 32 - labelLen), r0 = R * .36, step = (R - r0) / NR, cx = w / 2, cy = h / 2, cs = Math.min(step, 2 * Math.PI * r0 / NF) * .8; Object.assign(g, { R, r0, step, cx, cy, cs, labelLen }); host.style.setProperty('--lw', labelLen + 'px');
      ord.forEach((fid, i) => { const a = (i + .5) / NF * 2 * Math.PI - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a); g[fid] = { a, i }; for (let r = 0; r < NR; r++) pos[fid + ':' + r] = [cx + ca * (r0 + (r + .5) * step), cy + sa * (r0 + (r + .5) * step)];
        const deg = a * 180 / Math.PI, flip = Math.cos(a) < 0; fpos[fid] = [cx + ca * (R + 12), cy + sa * (R + 12), flip ? deg + 180 : deg, flip ? 'end' : 'start']; });
    } else if ((w - 40) / NF >= 30) {
      const padL = 34, padT = 52, cw = (w - padL - 6) / NF, ch = Math.min(cw * 1.5, (h - padT - 24) / NR), cs = Math.min(cw * .72, ch * .72), top = padT + Math.max(0, (h - padT - 24 - ch * NR) / 2); Object.assign(g, { cw, ch, cs, padL, top });
      ord.forEach((fid, i) => { g[fid] = { i }; for (let r = 0; r < NR; r++) pos[fid + ':' + r] = [padL + (i + .5) * cw, top + (r + .5) * ch]; fpos[fid] = [padL + (i + .5) * cw, top - 24, 0, 'center']; });
    } else { // narrow stage: transpose (families as rows) so every title stays horizontal and readable
      const labelW = clamp(w * .4, 118, 230), padT = 30, cw = (w - labelW - 10) / NR, ch = Math.min(28, (h - padT - 8) / NF), cs = Math.min(cw, ch) * .76; Object.assign(g, { trans: true, labelW, padT, cw, ch, cs });
      host.style.setProperty('--lw', (labelW - 46) + 'px');
      ord.forEach((fid, i) => { g[fid] = { i }; for (let r = 0; r < NR; r++) pos[fid + ':' + r] = [labelW + (r + .5) * cw, padT + (i + .5) * ch]; fpos[fid] = [0, padT + (i + .5) * ch, 0, 'start']; });
    }
    host.classList.toggle('trans', !!g.trans);
    const lay = (el, x, y, rot, dly, anchor) => { el.style.transitionDelay = instant ? '0ms' : dly + 'ms'; el.style.transform = `translate(${x}px,${y}px) rotate(${rot || 0}deg) translate(${anchor === 'start' ? '0' : anchor === 'end' ? '-100%' : '-50%'},-50%)`; };
    const k1 = Math.min(11, 360 / NF), k2 = Math.min(22, 220 / NR);
    cells.forEach(o => { const [x, y] = pos[o.f + ':' + o.r], i = g[o.f].i; o.el.style.width = o.el.style.height = g.cs + 'px'; lay(o.el, x, y, 0, firstShow ? i * k1 + o.r * k2 : i * 6 + o.r * 8, 'center'); o.el.classList.remove('pre'); });
    FAM.forEach(f => { const [x, y, rot, an] = fpos[f.id]; lay(flabs[f.id], x, y, rot, 0, an); flabs[f.id].classList.toggle('flip', an === 'end'); flabs[f.id].title = f.code + ' · ' + f.name; });
    readout.style.transitionDelay = '0ms'; if (wheel) { readout.style.transform = `translate(${g.cx}px,${g.cy}px) translate(-50%,-50%)`; readout.style.width = (g.r0 * 1.7) + 'px'; }
    readout.classList.toggle('compact', wheel && g.r0 < 130);
    drawGuides(g, ord); drawBand(); firstShow = false;
  }
  function drawGuides(g, ord) {
    guides.setAttribute('viewBox', `0 0 ${size.w} ${size.h}`); let s = ''; const major = NR > 12 ? 5 : NR > 4 ? 2 : 1;
    if (g.wheel) {
      for (let r = 0; r <= NR; r++) { const rad = g.r0 + r * g.step; s += `<circle cx="${g.cx}" cy="${g.cy}" r="${rad}" fill="none" style="stroke:${r % major === 0 ? 'var(--guide2)' : 'var(--guide)'}" stroke-dasharray="${r % major ? '2 5' : ''}"/>`; }
      if (NF > 1) ord.forEach((fid, i) => { const a = i / NF * 2 * Math.PI - Math.PI / 2; s += `<line x1="${g.cx + Math.cos(a) * g.r0}" y1="${g.cy + Math.sin(a) * g.r0}" x2="${g.cx + Math.cos(a) * (g.R + 4)}" y2="${g.cy + Math.sin(a) * (g.R + 4)}" style="stroke:var(--guide)"/>`; });
    } else if (g.trans) {
      for (let i = 0; i < NF; i++) { const y = g.padT + (i + .5) * g.ch; s += `<line x1="${g.labelW - 6}" x2="${size.w - 4}" y1="${y}" y2="${y}" style="stroke:var(--guide)"/>`; }
      for (let r = 0; r < NR; r++) if (NR <= 20 || r % major === 0) s += `<text x="${g.labelW + (r + .5) * g.cw}" y="12" text-anchor="middle" style="fill:var(--quiet)" font-size="8.5" font-family="IBM Plex Mono,monospace">${String(r + 1).padStart(2, '0')}</text>`;
    } else {
      for (let r = 0; r < NR; r++) { const y = g.top + (r + .5) * g.ch; s += `<line x1="${g.padL}" x2="${size.w - 6}" y1="${y}" y2="${y}" style="stroke:var(--guide)"/>${NR <= 20 || r % major === 0 ? `<text x="0" y="${y + 3}" style="fill:var(--quiet)" font-size="8.5" font-family="IBM Plex Mono,monospace">${String(r + 1).padStart(2, '0')}</text>` : ''}`; }
    }
    guides.innerHTML = s + '<g id="band"></g>';
  }
  function drawBand() {
    const b = $('#band'); if (!b || !geom) return; const f = S.family; if (!f) { b.innerHTML = ''; return; } const g = geom, col = famOf(f).color;
    if (g.wheel) { const a = g[f].a, da = Math.min(Math.PI / NF, Math.PI / 2.2), p = (r, t) => `${g.cx + Math.cos(t) * r},${g.cy + Math.sin(t) * r}`, r1 = g.r0 - 4, r2 = g.R + 4;
      b.innerHTML = `<path d="M${p(r1, a - da)} L${p(r2, a - da)} A${r2},${r2} 0 0 1 ${p(r2, a + da)} L${p(r1, a + da)} A${r1},${r1} 0 0 0 ${p(r1, a - da)}Z" fill="${col}" fill-opacity=".1" stroke="${col}" stroke-opacity=".5"/>`; }
    else if (g.trans) { const y = g.padT + g[f].i * g.ch; b.innerHTML = `<rect x="0" y="${y}" width="${size.w}" height="${g.ch}" rx="7" fill="${col}" fill-opacity=".1" stroke="${col}" stroke-opacity=".5"/>`; }
    else { const x = g.padL + g[f].i * g.cw; b.innerHTML = `<rect x="${x}" y="${g.top - 6}" width="${g.cw}" height="${g.ch * NR + 12}" rx="8" fill="${col}" fill-opacity=".1" stroke="${col}" stroke-opacity=".5"/>`; }
  }
  const matches = o => S.tx.cats.has(o.c.cat) && S.tx.models.has(o.c.model) && (!S.qset || S.qset.has(o.k));
  function apply() {
    if (!built || !NCL) return; const hasFam = !!S.family;
    cells.forEach(o => { const ok = matches(o) && (!hasFam || o.f === S.family || (S.cluster && o.k === S.cluster)); o.el.classList.toggle('dim', !ok); o.el.classList.toggle('sel', o.k === S.cluster); });
    FAM.forEach(f => { const e = flabs[f.id]; e.classList.toggle('on', S.family === f.id); const any = cells.some(o => o.f === f.id && matches(o)); e.classList.toggle('dim', (hasFam && S.family !== f.id) || !any); });
    drawBand(); setReadout();
  }
  function cellTip(k, e) {
    const c = CL[k], f = famOf(c.fam); tip.style.setProperty('--c', f.color);
    tip.innerHTML = `<div class="tf"><i></i>${esc(f.code)} · ${esc(fname(f))}</div><b>${esc(c.name)}</b><p>“${esc(c.rep)}”</p><small>${MODELS[c.model].sym} ${esc(MODELS[c.model].short)} #${c.id} · ${plural(c.n, 'statement')} · ${L('{p}% anomalous videos', { p: pct(c.pct) })} · ${esc(CATN(c.cat))}</small>`;
    placeTip(e.clientX, e.clientY);
  }
  function famTip(id, e) {
    const f = famOf(id); tip.style.setProperty('--c', f.color);
    tip.innerHTML = `<div class="tf"><i></i>${esc(f.code)} · ${L(f.unassigned ? 'not grouped' : 'candidate family')}</div><b>${esc(fname(f))}</b><p>${plural(f.keys.length, 'cluster')}${multi ? ' · ' + modelMix(f) : ''}</p><small>${pct(f.mean)}% · ${L('mean anomalous-video share')}</small>`; placeTip(e.clientX, e.clientY);
  }
  let hovC = null, hovF = 0;
  function hoverCell(k) { hovC = k; hovF = 0; setReadout(); }
  function hoverFam(f) { hovF = f; hovC = null; setReadout(); }
  function setReadout() {
    const k = hovC || S.cluster, f = hovF || (k ? 0 : S.family);
    if (k) { const c = CL[k], fam = famOf(c.fam); readout.innerHTML = `<div class="ring" style="--c:${CAT[c.cat].color};--p:${c.pct}"><span>${pct(c.pct)}%</span></div><div class="cap" style="color:${fam.color}">${esc(fam.code)} · ${MODELS[c.model].sym} ${esc(MODELS[c.model].short)} #${c.id}</div><div class="nm" style="margin-top:6px">${esc(c.name)}</div><div class="sub">${esc(CATN(c.cat))} · ${plural(c.n, 'statement')}</div>`; }
    else if (f) { const fam = famOf(f); readout.innerHTML = `<div class="big" style="color:${fam.color}">${esc(fam.code)}</div><div class="cap">${plural(fam.keys.length, 'cluster')} · ${L('{p}% mean anomalous', { p: pct(fam.mean) })}</div><div class="nm" style="margin-top:8px">${esc(fname(fam))}</div><div class="sub">${multi ? modelMix(fam) : esc(fam.rep)}</div>`; }
    else { const vis = cells.filter(o => !o.el.classList.contains('dim')).length; readout.innerHTML = `<div class="big">${vis}</div><div class="cap">${vis === NCL ? `${L('clusters')} · ${plural(NFAM, 'candidate family', 'candidate families')}` : L('clusters match filters')}</div><div class="sub">${L(geom && geom.wheel ? 'Hover a cell to read it, click to inspect. Ring = rank inside its family, largest first.' : 'Hover a cell to read it, click to inspect. Rows = rank inside the family.')}</div>`; }
  }
  /* zoom + pan (wheel / pinch / buttons / drag) */
  let view = { k: 1, x: 0, y: 0 }, panning = false, suppressClick = false, lastLayoutKey = '';
  const setView = (smooth) => { world.classList.toggle('smooth', !!smooth); world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.k})`; };
  function fit(smooth = true) { view = { k: 1, x: 0, y: 0 }; setView(smooth); }
  function zoomAt(f, cx, cy, smooth) { const k = clamp(view.k * f, .6, 6), r = k / view.k; view.x = cx - (cx - view.x) * r; view.y = cy - (cy - view.y) * r; view.k = k; setView(smooth); }
  function initZoom() {
    const rect = () => stage.getBoundingClientRect(), pts = new Map(); let start = null, pinch = 0;
    stage.addEventListener('wheel', e => { e.preventDefault(); const r = rect(); zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0016)), e.clientX - r.left, e.clientY - r.top, false); hideTip(); }, { passive: false });
    stage.addEventListener('pointerdown', e => { if (e.target.closest('#zoomCtl') || e.button > 0) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); start = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: 0 }; pinch = 0; });
    stage.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; const p = pts.get(e.pointerId); p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = rect(); if (pinch) zoomAt(d / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, false); pinch = d; panning = true; suppressClick = true; return; }
      if (!start) return; const dx = e.clientX - start.x, dy = e.clientY - start.y; start.moved = Math.max(start.moved, Math.hypot(dx, dy));
      if (!panning && start.moved > 5) { panning = true; stage.classList.add('panning'); hideTip(); try { stage.setPointerCapture(e.pointerId); } catch (_) { } }
      if (panning) { view.x = start.vx + dx; view.y = start.vy + dy; setView(false); }
    });
    const up = e => { pts.delete(e.pointerId); if (!pts.size) { if (panning) suppressClick = true; panning = false; stage.classList.remove('panning'); start = null; pinch = 0; setTimeout(() => { suppressClick = false; }, 60); } };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    const c = () => ({ x: stage.clientWidth / 2, y: stage.clientHeight / 2 });
    $('#zIn').addEventListener('click', () => zoomAt(1.35, c().x, c().y, true)); $('#zOut').addEventListener('click', () => zoomAt(1 / 1.35, c().x, c().y, true)); $('#zFit').addEventListener('click', () => fit(true));
    stage.addEventListener('dblclick', e => { if (e.target.closest('.cell,.fl')) return; fit(true); });
  }
  function show() { build(); host.classList.add('on'); requestAnimationFrame(() => { layout(false); apply(); }); }
  function hide() { host.classList.remove('on'); }
  /* left panel for this view */
  function panelHTML() {
    const t = S.tx, cnt = Object.fromEntries(CAT_ORDER.map(c => [c, Object.values(CL).filter(x => x.cat === c).length]));
    if (!NCL) return `<h2>${L('No clusters found')}</h2><p class="lead">${L('The first grouping stage did not find any dense region of similar statements in this run, so no taxonomy was built. The statements are still available in the evidence view.')}</p>${diagHTML()}<div class="note">${L('Clusters need at least min_cluster_size near-identical descriptions. Larger video sets produce more recurrent evidence.')}</div>`;
    return `<h2>${plural(NCL, 'cluster')}, ${plural(NFAM, 'candidate family', 'candidate families')}</h2>
      <p class="lead">${L('The automatic taxonomy as an instrument. Each cell is a first-stage cluster on the spoke of its family; its colour is the {x}.', { x: esc(SHARE_TXT) })}</p>
      ${diagHTML()}
      <div class="sec"><h4>${L('Layout')}</h4><div class="seg" id="txLayout">${[['wheel', 'Radial wheel'], ['matrix', 'Matrix grid']].map(([k, l]) => `<button data-l="${k}" class="${t.layout === k ? 'on' : ''}">${L(l)}</button>`).join('')}</div>
        <div class="seg" id="txOrder" style="margin-top:6px">${[['id', 'Order by size'], ['anom', 'By anomaly share']].map(([k, l]) => `<button data-o="${k}" class="${t.order === k ? 'on' : ''}">${L(l)}</button>`).join('')}</div></div>
      <div class="sec"><h4>${L('Anomaly category')} <button data-act="allcats">${L('All')}</button></h4><div class="legend">${CAT_ORDER.map(c => `<button class="lg ${t.cats.has(c) ? '' : 'off'} ${t.cats.size < 5 && t.cats.has(c) ? 'on' : ''}" data-c="${c}" style="--c:${CAT[c].color}"><i class="sq"></i><span><b>${CATN(c)}</b><small>${esc(L(CAT[c].text))} · ${CAT[c].rule.replace(' and ', L(' and '))}%</small></span><span class="ct">${cnt[c]}</span></button>`).join('')}</div></div>
      ${multi ? `<div class="sec"><h4>${L('Model')}</h4><div class="chips">${Object.entries(MODELS).map(([k, m]) => `<button class="chip ${t.models.has(k) ? 'on' : 'off'}" data-model="${k}">${m.sym} ${esc(m.label)}</button>`).join('')}</div></div>` : ''}
      <div class="sec"><h4>${L('Find')} <span style="font:400 calc(11px*var(--fs)) var(--sans);color:var(--quiet)">${L('press / · Enter selects')}</span></h4><input class="search" id="txSearch" type="search" placeholder="${L('Search names, statements, F01…')}" value="${esc(S.q)}" autocomplete="off"></div>
      <div class="note">${L("Families are an automatic computational grouping of cluster centroids, not a validated taxonomy. Names are the most distinctive terms of each cluster's own statements.")}${multi ? ' ' + MKEYS.map(m => `${MODELS[m].sym} ${esc(MODELS[m].label)}`).join(' · ') + '.' : ''}</div>`;
  }
  function panelClick(e) {
    if (S.view !== 'taxonomy') return; const t = S.tx;
    const l = e.target.closest('[data-l]'); if (l) { t.layout = l.dataset.l; renderTaxPanel(true); layout(false); return; }
    const o = e.target.closest('[data-o]'); if (o) { t.order = o.dataset.o; renderTaxPanel(true); layout(false); return; }
    const c = e.target.closest('[data-c]'); if (c) { const k = c.dataset.c; if (t.cats.size === 5) { t.cats = new Set([k]); } else if (t.cats.has(k) && t.cats.size === 1) { t.cats = new Set(CAT_ORDER); } else if (t.cats.has(k)) t.cats.delete(k); else t.cats.add(k); renderTaxPanel(true); apply(); return; }
    if (e.target.dataset.act === 'allcats') { t.cats = new Set(CAT_ORDER); renderTaxPanel(true); apply(); return; }
    const m = e.target.closest('[data-model]'); if (m) { const k = m.dataset.model; if (t.models.has(k) && t.models.size === 1) t.models = new Set(MKEYS); else if (t.models.has(k)) t.models.delete(k); else t.models.add(k); renderTaxPanel(true); apply(); }
  }
  return { fit, show, hide, apply, panelHTML, panelClick, layout, recolor: () => { if (built) FAM.forEach(f => flabs[f.id] && flabs[f.id].style.setProperty('--c', f.color)); } };
})();
function renderTaxPanel(keepScroll) { const sc = panelBody.scrollTop, hadFocus = document.activeElement?.id === 'txSearch'; panelBody.innerHTML = tax.panelHTML(); if (keepScroll) panelBody.scrollTop = sc; if (hadFocus) { const i = $('#txSearch'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }

/* ------------------------------------------------------------------ sources & run sheets */
const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
const csvCell = v => /[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? '');
const statementsCSV = () => { const rows = [['model', 'statement', 'cluster', 'cluster_name', 'family', 'family_name', 'videos']];
  for (const m of MKEYS) { const d = A.models[m]; d.ev.forEach((t, i) => { const k = d.cl[i] >= 0 ? d.keys[d.cl[i]] : ''; const f = k ? famOf(CL[k].fam) : null; rows.push([MODELS[m].label, t, k, k ? CL[k].name : '', f ? f.code : '', f ? f.name : '', d.src[i].map(s => VID[s[0]].id).join(';')]); }); }
  return rows.map(r => r.map(csvCell).join(',')).join('\n'); };
const sheet = id => { const el = $(id); el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) el.classList.remove('on'); }); return el; };
const sources = (() => {
  const el = sheet('#srcSheet'), body = $('#srcBody'); let q = '', selected = null;
  const perVideo = VID.map(() => ({ st: [], cl: new Set() }));
  for (const m of MKEYS) { const d = A.models[m]; d.src.forEach((src, i) => src.forEach(([vi, w, a]) => { perVideo[vi].st.push({ i, m, w, a }); if (d.cl[i] >= 0) perVideo[vi].cl.add(d.keys[d.cl[i]]); })); }
  const dec = a => a === 1 ? `<span class="pred a1">${L('ANOMALOUS')}</span>` : a === 0 ? `<span class="pred a0">${L('NORMAL')}</span>` : `<span class="st">${L('UNDETERMINED')}</span>`;
  function render() {
    const rows = VID.map((v, i) => ({ v, i })).filter(({ v }) => !q || (v.id + ' ' + v.name).toLowerCase().includes(q));
    const detail = selected === null ? `<div class="empty">${L('Select a video to read its evidence.')}</div>` : (() => { const v = VID[selected], pv = perVideo[selected];
      return `<div class="sec" style="margin-top:0"><h4>${esc(v.name)} · ${esc(MODELS[v.model].label)}</h4>${v.error ? `<div class="diag"><b>${L('PROCESSING ISSUE')}</b>${esc(v.error)}</div>` : ''}<div class="ev">${pv.st.length ? pv.st.map(s => { const d = A.models[s.m], k = d.cl[s.i] >= 0 ? d.keys[d.cl[s.i]] : null;
        return `<blockquote>${esc(d.ev[s.i])}<cite>${v.windows > 1 ? `${L('window {n}', { n: s.w + 1 })} · ` : ''}<span class="pred a${s.a}">${L(s.a ? 'ANOM' : 'NORM')}</span> · ${k ? `<button class="vlink" data-k="${esc(k)}">${esc(famOf(CL[k].fam).code)} · ${esc(CL[k].name)}</button>` : L('noise')}</cite></blockquote>`; }).join('') : `<div class="empty">${L('No valid evidence for this video.')}</div>`}</div></div>`; })();
    body.innerHTML = `<h2>${L('Sources')}</h2><p class="lead">${L('Every video of the run with the decision returned by the VLM.')} ${L(PRED ? 'These are model predictions, not ground truth.' : 'Composition uses the reference labels supplied with the run; the VLM never saw them.')} ${L('Click a row to read its evidence and jump to its clusters.')}</p>
      <div class="sheet-tools"><input class="search" id="srcSearch" type="search" placeholder="${L('Search videos…')}" value="${esc(q)}" autocomplete="off"><span class="lsub" style="margin:0">${plural(rows.length, 'video')}</span></div>
      <div class="src-grid"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${L('Video')}</th>${multi ? `<th>${L('Model')}</th>` : ''}<th>${L('Status')}</th><th>${L('VLM decision')}</th><th>${L('Duration')}</th><th>${L('Windows')}</th><th>${L('Statements')}</th><th>${L('Clusters')}</th></tr></thead><tbody>${rows.map(({ v, i }) => `<tr class="click ${i === selected ? 'on' : ''}" data-i="${i}"><td class="mono">${esc(v.name)}</td>${multi ? `<td>${MODELS[v.model].sym} ${esc(MODELS[v.model].short)}</td>` : ''}<td><span class="st ${v.status}">${L(v.status.toUpperCase())}</span></td><td>${dec(v.anomaly)}</td><td>${v.dur != null ? v.dur.toFixed(1) + ' s' : '—'}</td><td>${v.windows ?? '—'}</td><td>${perVideo[i].st.length}</td><td>${perVideo[i].cl.size}</td></tr>`).join('')}</tbody></table></div><div class="src-detail">${detail}</div></div>`;
  }
  body.addEventListener('input', e => { if (e.target.id === 'srcSearch') { q = e.target.value.trim().toLowerCase(); const pos = e.target.selectionStart; render(); const s = $('#srcSearch'); s.focus(); s.setSelectionRange(pos, pos); } });
  body.addEventListener('click', e => { const k = e.target.closest('.vlink'); if (k) { el.classList.remove('on'); return selectCluster(k.dataset.k, { fly: true }); }
    const tr = e.target.closest('tr.click'); if (tr) { const wrap = body.querySelector('.tbl-wrap'), top = wrap.scrollTop; selected = +tr.dataset.i; render(); body.querySelector('.tbl-wrap').scrollTop = top; } });
  // Never use scrollIntoView here: it would also scroll the clipped #app container.
  const reveal = () => { const wrap = body.querySelector('.tbl-wrap'), row = body.querySelector('tr.on'); if (wrap && row) wrap.scrollTop = row.offsetTop - wrap.clientHeight / 3; };
  return { open(i = null) { selected = i; if (i !== null) q = ''; render(); el.classList.add('on'); requestAnimationFrame(reveal); } };
})();
const runReport = (() => {
  const el = sheet('#runSheet'), body = $('#runBody'), c = META.counts, q = META.quality || {}, hs = (META.hierarchy || {}).selected, p = META.parameters || {}, b = META.backend || {};
  const kv = obj => `<dl class="kv">${Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
  function render() {
    const vs = q.videos_by_status || {};
    body.innerHTML = `<h2>${L('Run report')}</h2><p class="lead">${esc(META.title)} · ${L('generated {d} UTC', { d: esc((META.created || '').replace('T', ' ').slice(0, 16)) })}${META.simulated ? ` · <b>${L('simulated demonstration data')}</b>` : ''}. ${L('All stages ran automatically; nothing was reviewed by a person.')}</p>
      <div class="kgrid">${[[c.videos, 'videos'], [vs.complete, 'complete'], [vs.partial, 'partial'], [vs.failed, 'failed'], [c.occurrences, 'evidence occurrences'], [c.statements, 'unique statements'], [c.clusters, 'clusters'], [c.noise_statements, 'noise statements'], [c.families, 'families']].map(([n, l]) => `<div><b>${fmt(n)}</b><span>${L(l)}</span></div>`).join('')}</div>
      ${diagHTML()}
      <div class="cols2"><div class="sec"><h4>${L('Extraction')}</h4>${kv({ 'VLM': b.model_name || b.model, [L('Checkpoint')]: b.model, [L('Revision')]: b.revision, [L('Backend')]: b.backend, [L('Precision')]: b.precision, [L('Device')]: b.gpu || b.device, [L('Sampling')]: META.sampling === '1fps' ? L('1 frame per second (windows)') : META.sampling === 'uniform16' ? L('16 frames, uniformly spaced') : META.sampling, [L('Frame size')]: b.frame_size ? b.frame_size.join('×') : null, [L('Valid windows')]: q.windows_valid, [L('Invalid / failed windows')]: q.windows_invalid_or_failed, [L('JSON parsed strictly')]: (q.parse_status || {}).strict, [L('JSON embedded in text')]: (q.parse_status || {}).embedded })}</div>
      <div class="sec"><h4>${L('Discovery')}</h4>${kv({ [L('Embeddings')]: p.embedding_model, 'HDBSCAN': p.hdbscan ? `min_cluster_size=${p.hdbscan.min_cluster_size} · min_samples=${p.hdbscan.min_samples} · ${p.hdbscan.metric}` : null, [L('Deduplication')]: p.deduplication, [L('Second stage')]: hs ? `${L(hs.method + ' linkage')} · k=${hs.k} · score ${hs.score.toFixed(3)}` : (META.hierarchy || {}).reason, [L('Candidate cuts')]: (META.hierarchy || {}).candidates_evaluated, [L('Composition')]: L(PRED ? 'VLM decisions (no reference labels)' : 'reference labels'), [L('Projection')]: p.projection ? Object.values(p.projection)[0] : null })}</div></div>
      ${META.timings ? `<div class="sec"><h4>${L('Timings')}</h4>${kv(Object.fromEntries(Object.entries(META.timings).map(([k, v]) => [k, v + ' s'])))}</div>` : ''}
      <div class="sec"><h4>${L('Export')}</h4><div class="actions" style="margin-top:0"><button class="btn pri" data-dl="statements">${L('Statements (CSV)')}</button><button class="btn" data-dl="clusters">${L('Clusters (CSV)')}</button><button class="btn" data-dl="json">${L('Atlas data (JSON)')}</button></div></div>
      <p class="sheet-foot">${L('The VLM decision and evidence are model outputs, not verified annotations. Format validation checks the JSON contract, not visual correctness. Projections are qualitative.')}</p>`;
  }
  body.addEventListener('click', e => { const d = e.target.closest('[data-dl]'); if (!d) return; const kind = d.dataset.dl;
    if (kind === 'statements') download('statements.csv', statementsCSV(), 'text/csv');
    else if (kind === 'clusters') download('clusters.csv', [['cluster', 'model', 'family', 'name', 'representative', 'statements', 'videos', 'anomalous_share', 'category', 'flags'], ...Object.entries(CL).map(([k, c]) => [k, MODELS[c.model].label, famOf(c.fam).code, c.name, c.rep, c.n, c.vids, c.pct, c.cat, c.flags.join(';')])].map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv');
    else download('atlas-data.json', JSON.stringify(A, null, 1), 'application/json'); });
  return { open() { render(); el.classList.add('on'); } };
})();
$('#srcBtn').addEventListener('click', () => sources.open());
$('#runBtn').addEventListener('click', () => runReport.open());

/* ------------------------------------------------------------------ theme */
function applyTheme(t, persist) {
  document.documentElement.dataset.theme = t; const light = t === 'light';
  if (persist) try { localStorage.setItem('atlas-theme', t); } catch (e) { }
  FAM.forEach(f => { f.color = light ? rgbHex(toLight(hex2rgb(f.base))) : f.base; if (flabs[f.id]) flabs[f.id].style.setProperty('--c', f.color); });
  tax.recolor(); if (S.view) { renderPanel(); renderInspector(); }
  U.uLight.value = light ? 1 : 0; if (renderer) renderer.setClearColor(light ? 0xf3f0e9 : 0x0c0d10, 1);
  const bl = light ? T.NormalBlending : T.AdditiveBlending; [matCloud, matHalo, matLine].forEach(m => { m.blending = bl; m.needsUpdate = true; });
  document.querySelector('meta[name=theme-color]').content = light ? '#f3f0e9' : '#0c0d10';
  for (const v of Object.values(V3)) { const [m1, m2, m3] = v.scene.userData.bd;
    m1.color.set(light ? 0x3a4a68 : 0xd8cfb8); m1.opacity = light ? .16 : .08; m2.color.set(light ? 0x4a5568 : 0xcfc8b8); m2.opacity = light ? .12 : .05; m3.color.set(light ? 0x6a7080 : 0xcfcab9); m3.opacity = light ? .5 : .35;
    v.fillCols(); recompute(v); }
  if (S.view === 'taxonomy') tax.layout(true);
}
$('#themeBtn').addEventListener('click', () => applyTheme(LIGHT() ? 'dark' : 'light', true));

/* ------------------------------------------------------------------ navigation */
const nav = $('#nav'), ink = $('#ink');
const tabDefs = [['taxonomy', L('Taxonomy'), L('Candidate family wheel')], ['families', plural(NFAM, 'family', 'families'), L('Cluster centroids · 3D')], ...MKEYS.map(m => [m, MODELS[m].label, L('Evidence · 3D')])];
tabDefs.forEach(([v, l, s]) => nav.insertAdjacentHTML('beforeend', `<button class="tab" data-view="${v}"><span class="l">${esc(l)}</span><span class="s">${esc(s)}</span></button>`));
const tabs = $$('.tab');
$('#shapeKey').innerHTML = META.models.map(m => `<span><svg viewBox="0 0 14 14">${['<circle cx="7" cy="7" r="6"/>', '<polygon points="7,0.5 13.5,7 7,13.5 0.5,7"/>', '<rect x="1.5" y="1.5" width="11" height="11" rx="1"/>', '<polygon points="7,1 13.5,12.5 0.5,12.5"/>'][m.shape]}</svg>${esc(m.label)}</span>`).join('');
function placeInk() { const t = $('.tab.on'); if (!t) return; ink.style.width = t.offsetWidth + 'px'; ink.style.transform = `translateX(${t.offsetLeft}px)`; }
let pendingTax = false;
function go(view) {
  if (!view || !VIEWS.includes(view)) return; const first = !S.view;
  if (view === S.view) { afterSel({ fly: true }); return; }
  if (view !== 'taxonomy' && !renderer) view = 'taxonomy';
  const prev = S.view; S.view = view; document.body.dataset.v = view; document.body.classList.toggle('cloud', MKEYS.includes(view)); S.hover = null; hideTip();
  tabs.forEach(t => { const on = t.dataset.view === view; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); }); placeInk();
  const sw = $('#sweep'); sw.classList.remove('go'); void sw.offsetWidth; sw.classList.add('go');
  const is3d = view !== 'taxonomy';
  if (is3d) {
    tax.hide(); if (!V3[view]) V3[view] = buildView(view); const v = V3[view]; v.asm.t0 = performance.now() + (first ? 400 : 0); U.uAsm.value = 0;
    glHost.classList.add('on'); recompute(v); lastInteract = performance.now();
  } else { glHost.classList.remove('on'); setTimeout(() => { if (S.view === 'taxonomy') { if (introDone) tax.show(); else pendingTax = true; } }, prev ? 180 : 0); }
  S.panel = true; $('#panel').classList.remove('hide'); $('#panelToggle').classList.remove('on');
  renderPanel(); renderInspector(); tax.apply();
  if (is3d && (S.cluster || S.family)) setTimeout(() => afterSel({ fly: true }), 60);
  syncHash(); resize();
}
tabs.forEach(t => t.addEventListener('click', () => go(t.dataset.view)));
function syncHash() { try { const h = '#' + S.view + (S.cluster ? '/c=' + encodeURIComponent(S.cluster) : S.family ? '/' + famOf(S.family).code : ''); if (location.hash !== h) history.replaceState(null, '', h); } catch (e) { } }
function parseHash() {
  const [v, x] = decodeURIComponent(location.hash.slice(1)).split('/'); const view = VIEWS.includes(v) ? v : (NCL ? 'taxonomy' : (MKEYS[0] || 'taxonomy'));
  if (x?.startsWith('c=') && CL[x.slice(2)]) { S.cluster = x.slice(2); S.family = CL[S.cluster].fam; } else if (/^F\d+$/.test(x || '') && FAM.find(f => f.code === x)) S.family = FAM.find(f => f.code === x).id;
  return view;
}
$('#panelClose').addEventListener('click', () => { S.panel = false; $('#panel').classList.add('hide'); $('#panelToggle').classList.add('on'); document.body.classList.add('nopanel'); resize(); tax.layout(false); });
$('#panelToggle').addEventListener('click', () => { S.panel = true; $('#panel').classList.remove('hide'); $('#panelToggle').classList.remove('on'); document.body.classList.remove('nopanel'); resize(); });
$('#orbitBtn').addEventListener('click', e => { S.orbit = !S.orbit; e.currentTarget.classList.toggle('on', S.orbit); });
$('#labelBtn').addEventListener('click', e => { S.labels = !S.labels; e.currentTarget.classList.toggle('on', S.labels); });
$('#noiseBtn').addEventListener('click', e => { S.noise = !S.noise; e.currentTarget.classList.toggle('on', S.noise); Object.values(V3).forEach(recompute); });
$('#resetBtn').addEventListener('click', () => { const v = cur(); if (v) { v.cam.th = .65; v.cam.ph = 1.15; resetCam(v); } });
$('#fsBtn').addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
const help = $('#help'); $('#helpBtn').addEventListener('click', () => help.classList.add('on')); $('#helpClose').addEventListener('click', () => help.classList.remove('on')); help.addEventListener('click', e => { if (e.target === help) help.classList.remove('on'); });
const overlays = () => [help, $('#srcSheet'), $('#runSheet')].filter(o => o.classList.contains('on'));
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return; const typing = e.target.matches('input,textarea');
  if (e.key === 'Escape') { const o = overlays(); if (o.length) o.forEach(x => x.classList.remove('on')); else if (typing) e.target.blur(); else clearSel(); return; }
  if (typing || overlays().length) return; const i = VIEWS.indexOf(S.view), n = VIEWS.length;
  if (/^[1-9]$/.test(e.key) && +e.key <= n) go(VIEWS[+e.key - 1]); else if (e.key === 'ArrowRight') go(VIEWS[(i + 1) % n]); else if (e.key === 'ArrowLeft') go(VIEWS[(i + n - 1) % n]);
  else if (e.key === '/') { e.preventDefault(); if (!S.panel) $('#panelToggle').click(); setTimeout(() => $('#panelBody .search')?.focus(), 30); } else if (e.key === '?') help.classList.add('on');
});
addEventListener('resize', () => { resize(); });

/* text size (remembered) */
const FS = { min: .9, max: 1.7, step: .1, def: 1.15 };
function setFs(v, persist) {
  const fs = Math.round(clamp(v, FS.min, FS.max) * 100) / 100; document.documentElement.style.setProperty('--fs', fs);
  $('#fsDown').disabled = fs <= FS.min; $('#fsUp').disabled = fs >= FS.max;
  if (persist) try { localStorage.setItem('atlas-fs', fs); } catch (e) { }
  return fs;
}
let fsNow = FS.def; try { const s = parseFloat(localStorage.getItem('atlas-fs')); if (s >= FS.min && s <= FS.max) fsNow = s; } catch (e) { }
fsNow = setFs(fsNow, false);
$('#fsDown').addEventListener('click', () => { fsNow = setFs(fsNow - FS.step, true); });
$('#fsUp').addEventListener('click', () => { fsNow = setFs(fsNow + FS.step, true); });

/* resizable side panels (width remembered) */
function initResizer(el, varName, panel, dir, min, max) {
  let sx = null, sw = 0; const root = document.documentElement, key = 'atlas' + varName;
  try { const s = +localStorage.getItem(key); if (s >= min && s <= Math.min(max, innerWidth * .46)) root.style.setProperty(varName, s + 'px'); } catch (e) { }
  el.addEventListener('pointerdown', e => { sx = e.clientX; sw = panel.offsetWidth; el.setPointerCapture(e.pointerId); document.body.classList.add('rs'); e.preventDefault(); });
  el.addEventListener('pointermove', e => { if (sx === null) return; root.style.setProperty(varName, clamp(sw + dir * (e.clientX - sx), min, Math.max(min, Math.min(max, innerWidth * .46))) + 'px'); resize(); });
  const end = () => { if (sx === null) return; sx = null; document.body.classList.remove('rs'); try { localStorage.setItem(key, panel.offsetWidth); } catch (e) { } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('dblclick', () => { root.style.removeProperty(varName); try { localStorage.removeItem(key); } catch (e) { } resize(); });
}
initResizer($('#panelRs'), '--pw', $('#panel'), 1, 260, 560); initResizer($('#insRs'), '--iw', $('#inspector'), -1, 280, 600);

/* intro */
const c0 = META.counts, intro = $('#intro'); let introDone = false;
document.title = `${META.title} · Observable Evidence Atlas`;
document.body.classList.toggle('sim', !!META.simulated);
const nVid = new Set(VID.map(v => v.id)).size;
$('#introText').textContent = NCL ? L('{s}, {c} and {f} discovered automatically from {v} described by {m}.', { s: plural(c0.statements, 'evidence statement'), c: plural(c0.clusters, 'cluster'), f: plural(c0.families, 'candidate family', 'candidate families'), v: plural(nVid, 'video'), m: META.models.map(m => m.label).join(L(' and ')) })
  : L('{s} from {v}. No recurrent cluster was found in this run.', { s: plural(c0.statements, 'evidence statement'), v: plural(nVid, 'video') });
$('#introKicker').textContent = (META.simulated ? L('SIMULATED DEMONSTRATION DATA · ') : '') + `${META.title} · ${(META.created || '').slice(0, 10)}`;
$('#helpFoot').innerHTML = L('help-foot', { x: esc(SHARE_TXT), p: PRED ? L(' — model predictions, not ground truth') : '', n: VIEWS.length });
if (window.I18N) { I18N.applyStatic(); $('#langBtn').addEventListener('click', () => { I18N.setLang(I18N.lang === 'pt' ? 'en' : 'pt'); location.reload(); }); }
function endIntro() { if (introDone) return; introDone = true; intro.classList.add('gone'); const v = cur(); if (v && S.view !== 'taxonomy') v.asm.t0 = performance.now(); if (pendingTax && S.view === 'taxonomy') { pendingTax = false; setTimeout(() => tax.show(), 250); } }
intro.addEventListener('click', endIntro); addEventListener('keydown', () => endIntro(), { once: true }); setTimeout(endIntro, new URLSearchParams(location.search).has('nointro') ? 0 : 4800);

/* main loop */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; const v = cur();
  if (!v || S.view === 'taxonomy' || !renderer) { if (!frame.cleared) { updateLabels(null); frame.cleared = true; } return; }
  frame.cleared = false;
  const k = introDone ? clamp((now - v.asm.t0) / (reduced ? 1 : 1700), 0, 1) : 0; U.uAsm.value = reduced ? 1 : ease(k) * .999 + .001 * k;
  updateHover(now); stepAttrs(v, dt); stepCam(v, dt, now); updateLabels(v); renderer.render(v.scene, camera);
}
const start = parseHash(); applyTheme(LIGHT() ? 'light' : 'dark'); resize(); go(start); requestAnimationFrame(frame);
window.__atlas = { S, go, selectCluster, selectFamily, V3, CL, sources, runReport };
})();
