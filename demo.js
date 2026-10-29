/* Walkthrough of the pipeline with a live discovery run.
   The visitor picks synthetic videos; their cached (scripted) model responses are sent to worker.js, which runs the
   product's Python code (observable_atlas) with Pyodide. Results are cached per selection in this browser. */
(() => {
'use strict';
const SC = window.SyntheticScenes, I = window.I18N, L = window.L;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), ease = t => 1 - Math.pow(1 - t, 3), lerp = (a, b, t) => a + (b - a) * t;
const fmt = n => Number(n).toLocaleString(I.lang === 'pt' ? 'pt-BR' : 'en-US');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const LIGHT = () => document.documentElement.dataset.theme === 'light';

I.add({ pt: {
  'SIMULATED VLM': 'VLM SIMULADA', 'Light / dark': 'Claro / escuro', 'Skip to atlas': 'Ir para o atlas', 'AUTOMATIC TAXONOMY DISCOVERY': 'DESCOBERTA AUTOMÁTICA DE TAXONOMIA',
  'From video<br>to taxonomy': 'Do vídeo<br>à taxonomia', 'Choose the videos': 'Escolha os vídeos', 'Open the atlas': 'Abrir o atlas',
  'Pick the videos, then watch them become evidence, clusters and candidate families — with no manual step between them.': 'Escolha os vídeos e veja-os virar evidências, grupos e famílias candidatas — sem nenhuma etapa manual no meio.',
  'intro-fine': 'Só o modelo de visão e linguagem é simulado: os vídeos são animações sintéticas e as respostas do modelo são roteirizadas e ficam em cache. Todo o resto — validação do contrato, embeddings, as duas etapas de agrupamento, nomes e projeções — executa o código Python do próprio produto no seu navegador. Nada é enviado a servidor algum.',
  '01 · INPUT': '01 · ENTRADA', 'sel-lead': 'Clique nos vídeos ou em cenas inteiras para incluí-los ou excluí-los. O código de descoberta roda exatamente sobre esta seleção.',
  '8 = paper': '8 = artigo', 'FRAME SAMPLING': 'AMOSTRAGEM', '16 frames · uniform': '16 frames · uniformes', '1 frame per second': '1 frame por segundo',
  'Vision-language model': 'Modelo de visão e linguagem', 'InternVL3.5 · local GPU': 'InternVL3.5 · GPU local', 'SIMULATED · CACHED': 'SIMULADO · EM CACHE', 'RESPONSE': 'RESPOSTA',
  'Explore the atlas': 'Explorar o atlas', 'Choose other videos': 'Escolher outros vídeos', 'LIVE · PYTHON IN YOUR BROWSER': 'AO VIVO · PYTHON NO SEU NAVEGADOR',
  'All': 'Todos', 'Branches & ATMs': 'Agências e ATMs', 'Offices & outdoors': 'Escritórios e áreas externas', 'Incidents': 'Incidentes', 'Every third video': 'Um a cada três', 'Two per scene': 'Dois por cena', 'Clear': 'Limpar',
  'Run discovery on {n} videos': 'Rodar a descoberta em {n} vídeos', 'Select at least one video': 'Selecione ao menos um vídeo', 'Previous step (←)': 'Passo anterior (←)', 'Pause (space)': 'Pausar (espaço)', 'Play (space)': 'Continuar (espaço)', 'Next step (→)': 'Próximo passo (→)', 'Show or hide the log': 'Mostrar ou ocultar o registro', '{n} of {t} selected': '{n} de {t} selecionados', 'cached': 'em cache',
  'Downloading the Python runtime (Pyodide)…': 'Baixando o Python do navegador (Pyodide)…', 'Loading numpy, scipy and scikit-learn…': 'Carregando numpy, scipy e scikit-learn…',
  'Loading the product code…': 'Carregando o código do produto…', 'Python ready · Pyodide {v}': 'Python pronto · Pyodide {v}',
  'Live runs need the page served over http(s); cached selections still work.': 'A execução ao vivo exige a página servida por http(s); as seleções em cache funcionam.',
  'Python runtime failed: {e}': 'Falha no Python do navegador: {e}', 'running…': 'rodando…', 'done': 'concluído', 'error': 'erro', 'from cache': 'do cache',
  'Validated {n} responses against the contract · {i} invalid': '{n} respostas validadas pelo contrato · {i} inválidas',
  'Embedding {n} statements (cached BGE vectors) · HDBSCAN': 'Embeddings de {n} frases (vetores BGE em cache) · HDBSCAN',
  'Agglomerative clustering of {n} centroids · scoring every cut': 'Agrupamento aglomerativo de {n} centroides · avaliando cada corte',
  'Naming clusters and families from their statements': 'Nomeando grupos e famílias a partir das frases', 'Projecting for display': 'Projetando para exibição',
  '{c} clusters · {f} families · {x} noise': '{c} grupos · {f} famílias · {x} sem grupo', 'Same selection already computed in this browser — reused.': 'Esta seleção já foi calculada neste navegador — resultado reaproveitado.',
  'Precomputed selection (same code, run at build time) — reused.': 'Seleção pré-calculada (mesmo código, rodado na publicação) — reaproveitada.',
  'Running the discovery code…': 'Rodando o código de descoberta…', 'The first run downloads the Python runtime (~40 MB, cached afterwards).': 'A primeira execução baixa o Python do navegador (~40 MB, depois fica em cache).',
  'Select': 'Selecionar', 'Sample': 'Amostrar', 'Describe': 'Descrever', 'Embed': 'Vetorizar', 'Cluster': 'Agrupar', 'Group': 'Famílias', 'Name': 'Nomear',
  'Sample the frames': 'Amostragem dos frames', 'The model describes what it sees': 'O modelo descreve o que vê', 'Every statement becomes a vector': 'Cada frase vira um vetor',
  'Dense regions become clusters': 'Regiões densas viram grupos', 'Clusters group into families': 'Grupos se reúnem em famílias', 'A taxonomy, assembled automatically': 'Uma taxonomia, montada automaticamente',
  'cap-sample': 'Cada vídeo vira uma sequência ordenada de frames: 16 distribuídos do primeiro ao último frame, como no artigo — ou um por segundo, enviados ao modelo em janelas consecutivas de 16.',
  'cap-vlm': 'Uma VLM local devolve uma decisão e de uma a três observações visuais curtas. Aqui as respostas são roteirizadas e vêm do cache; o contrato que as valida é o do produto, executado agora no seu navegador.',
  'cap-embed': 'As frases são deduplicadas pelo texto normalizado (cada ocorrência é mantida) e representadas por vetores BGE-small de 384 dimensões, pré-calculados em cache. Frases parecidas ficam próximas.',
  'cap-cluster': 'O HDBSCAN procura regiões densas de frases parecidas (min_cluster_size = {m}). {c} grupos surgiram desta seleção; {x} frases ficaram fora de qualquer grupo e continuam visíveis como ruído.',
  'cap-families': 'Cada grupo vira um centroide normalizado. O agrupamento aglomerativo (cosseno, ligações média e completa) é cortado pelo critério composto do artigo — silhueta, estabilidade bootstrap, concordância entre ligações e coesão.{s}',
  'cap-name': 'Cada nome reúne os termos mais característicos das frases do próprio grupo; nada é inventado. A cor indica quantos vídeos de suporte o modelo marcou como anômalos. Tudo continua ligado às frases e aos vídeos de origem.',
  ' Selected here: {m} linkage, k = {k}.': ' Escolhido aqui: ligação {m}, k = {k}.', 'complete': 'completa', 'average': 'média',
  'videos selected': 'vídeos selecionados', 'synthetic · 21 scene types': 'sintéticos · 22 tipos de cena', 'evidence statements': 'frases de evidência', 'from {n} validated responses': 'de {n} respostas validadas',
  'unique statements': 'frases únicas', '{n} occurrences · 384-d BGE vectors': '{n} ocorrências · vetores BGE de 384 dimensões', 'clusters': 'grupos', '{n} statements left as noise': '{n} frases sem grupo',
  'candidate families': 'famílias candidatas', '{m} linkage · k = {k} · {n} cuts scored': 'ligação {m} · k = {k} · {n} cortes avaliados', 'second stage not estimated': 'segunda etapa não estimada',
  'RESULT · COMPUTED IN YOUR BROWSER': 'RESULTADO · CALCULADO NO SEU NAVEGADOR', 'RESULT · PRECOMPUTED': 'RESULTADO · PRÉ-CALCULADO',
  '{c} clusters, {f} candidate families': '{c} grupos, {f} famílias candidatas', 'No taxonomy for this selection': 'Nenhuma taxonomia para esta seleção',
  'From {s} statements of {v} synthetic videos. Open the atlas to browse families, clusters, every statement and its source video.': 'A partir de {s} frases de {v} vídeos sintéticos. Abra o atlas para navegar pelas famílias, pelos grupos, por cada frase e pelo vídeo de origem.',
  'Too few recurrent statements: HDBSCAN found no dense region. Select more videos or lower min_cluster_size.': 'Poucas frases recorrentes: o HDBSCAN não encontrou regiões densas. Selecione mais vídeos ou reduza o min_cluster_size.',
  'INPUT · LOCAL VIDEOS': 'ENTRADA · VÍDEOS LOCAIS', 'VISUAL INPUT': 'ENTRADA VISUAL', 'EVIDENCE GENERATION · SIMULATED': 'GERAÇÃO DE EVIDÊNCIAS · SIMULADA', 'SEMANTIC DISCOVERY · LIVE': 'DESCOBERTA SEMÂNTICA · AO VIVO',
  'HDBSCAN · LIVE': 'HDBSCAN · AO VIVO', 'CENTROID HIERARCHY · LIVE': 'HIERARQUIA DE CENTROIDES · AO VIVO', 'AUTOMATIC NAMES · NO REVIEW': 'NOMES AUTOMÁTICOS · SEM REVISÃO',
  'valid JSON object': 'objeto JSON válido', 'exactly anomaly + evidence': 'só anomaly + evidence', 'anomaly is 0 or 1': 'anomaly é 0 ou 1', '1 to 3 statements': 'de 1 a 3 frases',
  'each ≤ 15 words': 'cada uma ≤ 15 palavras', 'no recovery needed': 'sem recuperação', 'ANOMALOUS': 'ANÔMALO', 'NORMAL': 'NORMAL', 'WINDOW {n}': 'JANELA {n}',
  'WINDOW {n} · ONE VLM CALL': 'JANELA {n} · UMA CHAMADA', '16 FRAMES · ONE VLM CALL': '16 FRAMES · UMA CHAMADA',
},
en: { 'intro-fine': 'Only the vision-language model is simulated: the videos are synthetic animations and their model responses are scripted and cached. Everything after that — contract validation, embeddings, both clustering stages, names and projections — runs the product\'s own Python code in your browser. Nothing is sent to any server.',
  'sel-lead': 'Click videos or whole scenes to include or exclude them. The discovery code then runs on exactly this selection.',
  'cap-sample': 'Each video becomes an ordered set of frames: 16 spread uniformly from the first to the last frame, as in the paper — or one frame per second, sent to the model in consecutive windows of 16.',
  'cap-vlm': 'A local vision-language model returns a decision and one to three short observable facts. Here the replies are scripted and come from the cache; the contract that validates them is the product\'s own, running now in your browser.',
  'cap-embed': 'Statements are deduplicated by exact normalised text (every occurrence is kept) and represented by 384-dimensional BGE-small vectors, precomputed in the cache. Similar descriptions land close together.',
  'cap-cluster': 'HDBSCAN looks for dense regions of similar statements (min_cluster_size = {m}). {c} clusters emerged from this selection; {x} statements belong to none and stay visible as noise.',
  'cap-families': 'Each cluster is reduced to its normalised centroid. Agglomerative clustering (cosine, average and complete linkage) is cut with the paper\'s composite score — silhouette, bootstrap stability, linkage agreement and cohesion.{s}',
  'cap-name': 'Each name is made of the most distinctive terms of the group\'s own statements; nothing is invented. Colour shows how many supporting videos the model flagged as anomalous. Everything still links back to statements and source videos.' } });

const SCENE_NAMES = { lobby: ['Branch lobby', 'Saguão da agência'], teller: ['Teller window', 'Guichê de caixa'], queue: ['Teller queue', 'Fila do caixa'],
  advisor: ['Advisor desk', 'Mesa do gerente'], atm: ['ATM use', 'Uso de ATM'], atmqueue: ['ATM queue', 'Fila do ATM'], vault: ['Vault', 'Cofre'],
  office: ['Back office', 'Escritório'], meeting: ['Meeting room', 'Sala de reunião'], reception: ['HQ reception', 'Recepção da sede'],
  plaza: ['Outdoor plaza', 'Área externa'], parking: ['Parking lot', 'Estacionamento'], armored: ['Armored truck', 'Carro-forte'],
  night: ['Night exterior', 'Exterior à noite'], fire: ['Fire & smoke', 'Fogo e fumaça'], fall: ['Falls', 'Quedas'], altercation: ['Pushing', 'Empurrões'],
  crowd: ['Crowd running', 'Multidão correndo'], unattended: ['Unattended bag', 'Bolsa abandonada'], atmdamage: ['ATM tampering', 'Dano ao ATM'],
  collision: ['Collision', 'Colisão'], tailgating: ['Door tailgating', 'Entrada colada'] };
const sceneName = s => (SCENE_NAMES[s] || [s, s])[I.lang === 'pt' ? 1 : 0];
const PRESET_NAMES = { all: 'All', branch: 'Branches & ATMs', site: 'Offices & outdoors', incidents: 'Incidents', third: 'Every third video', small: 'Two per scene' };

/* ------------------------------------------------------------------ corpus, selection, cache */
let CORPUS = null, PRESETS = {}, selected = new Set(), RESULT = window.ATLAS, resultSource = 'precomputed';
const DEFAULT = window.ATLAS;
const fnv = text => { let h = 0x811c9dc5; for (const b of new TextEncoder().encode(text)) h = Math.imul(h ^ b, 0x01000193) >>> 0; return h.toString(16).padStart(8, '0'); };
const keyOf = (names, m) => `${m}:${fnv([...names].sort().join('\n'))}`;
const STORE = 'atlas-demo-runs-v1';
const local = { all() { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { return {}; } },
  get(k) { return this.all()[k]?.payload || null; },
  put(k, payload) { const all = this.all(); all[k] = { t: Date.now(), payload }; const keys = Object.keys(all).sort((a, b) => all[b].t - all[a].t);
    for (let n = keys.length; n > 0; n--) { const keep = Object.fromEntries(keys.slice(0, n).map(x => [x, all[x]])); try { localStorage.setItem(STORE, JSON.stringify(keep)); return; } catch (e) { } } } };
const cached = k => PRESETS[k] ? ['preset', PRESETS[k]] : local.get(k) ? ['local', local.get(k)] : null;
const mcs = () => clamp(parseInt($('#mcs').value, 10) || 8, 2, 30);

/* ------------------------------------------------------------------ worker */
let worker = null, runId = 0, runtimeState = 'idle';
const rt = $('#runtime');
function setRuntime(state, text) { runtimeState = state; rt.className = 'rt ' + state; rt.querySelector('span').textContent = text; }
function startWorker() {
  if (worker || runtimeState === 'err') return;
  try { worker = new Worker('worker.js'); } catch (e) { setRuntime('err', L('Live runs need the page served over http(s); cached selections still work.')); return; }
  worker.onmessage = ({ data }) => {
    if (data.type === 'status') setRuntime(data.key === 'ready' ? 'ok' : 'busy', { runtime: L('Downloading the Python runtime (Pyodide)…'), packages: L('Loading numpy, scipy and scikit-learn…'), code: L('Loading the product code…'), ready: L('Python ready · Pyodide {v}', { v: data.version }) }[data.key]);
    else if (data.id !== runId) return;
    else if (data.type === 'progress') logEvent(data.event);
    else if (data.type === 'result') { const payload = JSON.parse(data.payload); local.put(currentKey, payload); setResult(payload, 'live'); state('ok', `${L('done')} · ${data.seconds.toFixed(1)} s`); }
    else if (data.type === 'error') { state('err', L('error')); logLine(`<b>${esc(data.message)}</b>`); setRuntime('err', L('Python runtime failed: {e}', { e: data.message.slice(0, 80) })); }
  };
  worker.onerror = e => { setRuntime('err', L('Live runs need the page served over http(s); cached selections still work.')); e.preventDefault(); };
  worker.postMessage({ id: 0, request: null });
}

/* ------------------------------------------------------------------ run log */
const rlLines = $('#rlLines'), rlState = $('#rlState');
const state = (cls, text) => { rlState.className = cls; rlState.textContent = text; };
function logLine(html) { const li = document.createElement('li'); li.innerHTML = html; rlLines.appendChild(li); $('#runlog').scrollTop = 1e9; }
function logEvent(e) {
  const t = `<em>${e.t.toFixed(1)} s</em>`;
  const text = { validated: L('Validated {n} responses against the contract · {i} invalid', { n: fmt(e.videos), i: e.invalid }), embedding: L('Embedding {n} statements (cached BGE vectors) · HDBSCAN', { n: fmt(e.statements) }),
    hierarchy: L('Agglomerative clustering of {n} centroids · scoring every cut', { n: e.clusters }), naming: L('Naming clusters and families from their statements'), projection: L('Projecting for display'),
    done: L('{c} clusters · {f} families · {x} noise', { c: e.clusters, f: e.families, x: e.noise_statements }) }[e.step];
  if (text) logLine(`${e.step === 'done' ? '✓' : '▸'} <b>${esc(text)}</b>${t}`);
}

/* ------------------------------------------------------------------ data of the current result (steps 4–7) */
let M, FAM, CL, C, N, P, members, clusterKeys, CC, FC, hs, pts = [], nodes = [];
const CAT = { 'Anomalous': '#C00000', 'Predominantly Anomalous': '#F4CCCC', 'Neutral': '#D9E1F2', 'Predominantly Normal': '#D9EAD3', 'Normal': '#70AD47' };
const famOf = id => FAM[id - 1];
function setData(A) {
  M = Object.values(A.models)[0] || { ev: [], xyz: [], cl: [], keys: [] }; FAM = A.families; CL = A.clusters; C = A.meta.counts; N = M.ev.length; hs = A.meta.hierarchy && A.meta.hierarchy.selected;
  const raw = Array.from({ length: N }, (_, i) => [M.xyz[i * 3], M.xyz[i * 3 + 2]]);
  const ext = [0, 1].map(k => { const v = raw.map(p => p[k]).sort((a, b) => a - b); return v.length ? [v[Math.floor(v.length * .02)], v[Math.ceil(v.length * .98) - 1]] : [0, 1]; });
  P = raw.map(([x, y]) => [clamp((x - ext[0][0]) / (ext[0][1] - ext[0][0] || 1), -.05, 1.05), clamp((y - ext[1][0]) / (ext[1][1] - ext[1][0] || 1), -.05, 1.05)]);
  members = {}; for (let i = 0; i < N; i++) { const k = keyAt(i); if (k) (members[k] ||= []).push(i); }
  clusterKeys = Object.keys(members).sort((a, b) => members[b].length - members[a].length);
  CC = Object.fromEntries(clusterKeys.map(k => { const m = members[k]; return [k, [m.reduce((s, i) => s + P[i][0], 0) / m.length, m.reduce((s, i) => s + P[i][1], 0) / m.length]]; }));
  FC = Object.fromEntries(FAM.map(f => { const ks = f.keys.filter(k => CC[k]); return [f.id, ks.length ? [ks.reduce((s, k) => s + CC[k][0], 0) / ks.length, ks.reduce((s, k) => s + CC[k][1], 0) / ks.length] : [.5, .5]]; }));
  pts = Array.from({ length: N }, (_, i) => ({ i, x: .5, y: 1.2, a: 0, r: 3, col: '#cfc8b8', tx: P[i][0], ty: P[i][1], ta: 0, tr: 3, tcol: '#cfc8b8', delay: 0 }));
  nodes = clusterKeys.map(k => ({ k, x: CC[k][0], y: CC[k][1], a: 0, r: 4, tx: CC[k][0], ty: CC[k][1], ta: 0, tr: 4, tcol: CL[k].color }));
  layoutWheel();
}
const keyAt = i => M.cl[i] >= 0 ? M.keys[M.cl[i]] : null;
function setResult(payload, source) {
  RESULT = payload; resultSource = source; setData(payload);
  if (cur >= 0 && ACTS[cur].needs) ACTS[cur].enter(); // a step that was waiting can now draw
}

/* ------------------------------------------------------------------ canvas field */
const cv = $('#field'), ctx = cv.getContext('2d');
let W = 0, H = 0, box = { x: 0, y: 0, w: 1, h: 1 };
function resize() {
  const DPR = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const mobile = W < 860, top = mobile ? 120 : 110, bottom = mobile ? 250 : 190, side = mobile ? 24 : Math.max(60, W * .1);
  const w = W - side * 2, h = H - top - bottom, s = Math.min(w, h * 1.55);
  box = { x: (W - s) / 2, y: top + (h - s / 1.55) / 2, w: s, h: s / 1.55 };
  if (FAM) layoutWheel();
}
const scr = p => [box.x + p[0] * box.w, box.y + p[1] * box.h];
const sprites = {};
function sprite(col) {
  const key = col + (LIGHT() ? 'L' : 'D'); if (sprites[key]) return sprites[key];
  const s = 64, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'), [r, gg, b] = hex2rgb(col), k = LIGHT() ? .78 : 1;
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); grd.addColorStop(0, `rgba(${r * k | 0},${gg * k | 0},${b * k | 0},1)`); grd.addColorStop(LIGHT() ? .38 : .25, `rgba(${r * k | 0},${gg * k | 0},${b * k | 0},.55)`); grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grd; g.fillRect(0, 0, s, s); return (sprites[key] = c);
}
let tethers = 0, tethersTarget = 0, cores = 0, coresTarget = 0, wheel = 0, wheelTarget = 0, WHEEL = {};
function layoutWheel() {
  const NF = FAM.length || 1, NR = Math.max(1, ...FAM.map(f => f.keys.length));
  const cx = W / 2, cy = box.y + box.h / 2, R = Math.min(box.w, box.h * 1.5) * .34, r0 = R * .34, step = (R - r0) / NR;
  WHEEL = { cx, cy, R, r0, step, NF, NR, pos: {}, lab: {} };
  FAM.forEach((f, i) => { const a = (i + .5) / NF * Math.PI * 2 - Math.PI / 2; WHEEL.lab[f.id] = { a, x: cx + Math.cos(a) * (R + 14), y: cy + Math.sin(a) * (R + 14) };
    f.keys.forEach((k, r) => { WHEEL.pos[k] = [cx + Math.cos(a) * (r0 + (r + .5) * step), cy + Math.sin(a) * (r0 + (r + .5) * step)]; }); });
}
const nodeXY = n => { const a = scr([n.x, n.y]), w = WHEEL.pos[n.k] || a; return [lerp(a[0], w[0], ease(wheel)), lerp(a[1], w[1], ease(wheel))]; };
function draw(dt) {
  ctx.clearRect(0, 0, W, H); const k = 1 - Math.exp(-dt * (reduced ? 60 : 2.2)), lt = LIGHT();
  ctx.globalCompositeOperation = lt ? 'source-over' : 'lighter';
  for (const p of pts) {
    if (p.delay > 0) { p.delay -= dt; continue; }
    p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.a += (p.ta - p.a) * k * 1.4; p.r += (p.tr - p.r) * k; p.col = p.tcol;
    if (p.a < .01) continue; const [x, y] = scr([p.x, p.y]), s = p.r * 5; ctx.globalAlpha = p.a; ctx.drawImage(sprite(p.col), x - s / 2, y - s / 2, s, s);
  }
  ctx.globalCompositeOperation = 'source-over';
  tethers += (tethersTarget - tethers) * k; cores += (coresTarget - cores) * k; wheel += (wheelTarget - wheel) * k;
  if (tethers > .01) { ctx.globalAlpha = tethers * (1 - wheel) * .55; ctx.lineWidth = 1;
    for (const n of nodes) { const f = famOf(CL[n.k].fam); if (!f || f.unassigned) continue; const [x, y] = nodeXY(n), [fx, fy] = scr(FC[f.id]); ctx.strokeStyle = f.color; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(x, y); ctx.stroke(); } }
  if (wheel > .01) drawGuides(wheel);
  for (const n of nodes) {
    n.x += (n.tx - n.x) * k; n.y += (n.ty - n.y) * k; n.a += (n.ta - n.a) * k; n.r += (n.tr - n.r) * k;
    if (n.a < .01) continue; const [x, y] = nodeXY(n); ctx.globalAlpha = n.a;
    ctx.fillStyle = wheel > .5 ? CAT[CL[n.k].cat] : n.tcol; ctx.beginPath(); ctx.arc(x, y, n.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = lt ? 'rgba(26,25,22,.45)' : 'rgba(236,232,222,.35)'; ctx.lineWidth = 1; ctx.stroke();
  }
  if (cores > .01 && wheel < .99) { ctx.globalCompositeOperation = lt ? 'source-over' : 'lighter'; for (const f of FAM) { if (f.unassigned) continue; const [x, y] = scr(FC[f.id]); ctx.globalAlpha = cores * .4 * (1 - wheel); ctx.drawImage(sprite(f.color), x - 45, y - 45, 90, 90); } ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = 1;
}
function drawGuides(alpha) {
  const g = WHEEL, ink = LIGHT() ? '30,26,18' : '226,220,204'; ctx.globalAlpha = alpha * .9;
  for (let r = 0; r <= g.NR; r++) { ctx.strokeStyle = `rgba(${ink},${r % 2 ? .08 : .16})`; ctx.setLineDash(r % 2 ? [2, 5] : []); ctx.beginPath(); ctx.arc(g.cx, g.cy, g.r0 + r * g.step, 0, Math.PI * 2); ctx.stroke(); }
  ctx.setLineDash([]); if (g.NF > 1) for (let i = 0; i < g.NF; i++) { const a = i / g.NF * Math.PI * 2 - Math.PI / 2; ctx.strokeStyle = `rgba(${ink},.1)`; ctx.beginPath(); ctx.moveTo(g.cx + Math.cos(a) * g.r0, g.cy + Math.sin(a) * g.r0); ctx.lineTo(g.cx + Math.cos(a) * (g.R + 4), g.cy + Math.sin(a) * (g.R + 4)); ctx.stroke(); }
}

/* ------------------------------------------------------------------ labels & counter */
const labelsEl = $('#labels'), labelEls = new Map();
let labelFn = null;
function setLabels(list) {
  const keep = new Set(list.map(l => l.id));
  for (const [id, el] of labelEls) if (!keep.has(id)) { el.remove(); labelEls.delete(id); }
  for (const l of list) {
    let el = labelEls.get(l.id); if (!el) { el = document.createElement('div'); labelsEl.appendChild(el); labelEls.set(l.id, el); }
    const cls = 'lab on ' + (l.cls || ''), tf = `translate(${l.x.toFixed(1)}px,${l.y.toFixed(1)}px) ${l.rot != null ? `rotate(${l.rot}deg)` : 'translate(-50%,-50%)'}`;
    if (el.className !== cls) el.className = cls;
    if (el._html !== l.html) { el.innerHTML = l.html; el._html = l.html; el.style.setProperty('--c', l.c); }
    if (el._tf !== tf) { el.style.transform = tf; el._tf = tf; }
  }
}
function placeApart(list, max) {
  const kept = [];
  for (const l of list) { const w = l.text.length * 6.4 + 18, b = [l.x - w / 2, l.y - 11, l.x + w / 2, l.y + 11];
    if (kept.every(k => b[2] < k.b[0] || b[0] > k.b[2] || b[3] < k.b[1] || b[1] > k.b[3])) kept.push({ ...l, b });
    if (kept.length >= max) break; }
  return kept;
}
const counter = $('#counter');
function count(to, label, small = '', dur = 1.4) {
  counter.classList.add('on'); const prev = counter.querySelector('b'), from = +(prev && prev.dataset.v) || 0, t0 = performance.now();
  counter.innerHTML = `<b data-v="${to}">${fmt(from)}</b><span>${esc(label)}</span>${small ? `<small>${esc(small)}</small>` : ''}`;
  const el = counter.querySelector('b'); const tick = now => { const k = reduced ? 1 : clamp((now - t0) / (dur * 1000), 0, 1); el.textContent = fmt(Math.round(lerp(from, to, ease(k)))); if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ step 1 · selection */
const grid = $('#selGrid');
const byScene = () => { const m = {}; CORPUS.videos.forEach(v => (m[v.s] ||= []).push(v)); return m; };
function buildSelection() {
  if (grid.childElementCount) return;
  const groups = byScene(), io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { const c = e.target, g = c.getContext('2d'); SC.drawScene(g, c.dataset.s, 2 + (+c.dataset.n % 7) * 1.3, c.width, c.height, +c.dataset.n + 3); io.unobserve(c); } }), { root: grid });
  Object.entries(groups).forEach(([scene, vids]) => {
    const sec = document.createElement('div'); sec.className = 'scene'; sec.dataset.s = scene;
    sec.innerHTML = `<div class="sh"><button data-scene="${scene}"><i class="box"></i><span class="sn">${esc(sceneName(scene))}</span>${CORPUS.scenes[scene] ? '<i class="flagdot" title="anomalous scene"></i>' : ''}</button><span class="n"></span></div><div class="tiles"></div>`;
    const tiles = sec.querySelector('.tiles');
    vids.forEach((v, n) => { const b = document.createElement('button'); b.className = 'vt'; b.dataset.v = v.v; b.title = v.v; b.setAttribute('aria-label', v.v); b.innerHTML = `<canvas width="64" height="40" data-s="${scene}" data-n="${n}"></canvas>`; tiles.appendChild(b); io.observe(b.firstChild); });
    grid.appendChild(sec);
  });
  grid.addEventListener('click', e => {
    const t = e.target.closest('.vt'); if (t) { selected.has(t.dataset.v) ? selected.delete(t.dataset.v) : selected.add(t.dataset.v); return syncSelection(); }
    const h = e.target.closest('[data-scene]'); if (h) { const vids = byScene()[h.dataset.scene].map(v => v.v), all = vids.every(v => selected.has(v)); vids.forEach(v => all ? selected.delete(v) : selected.add(v)); syncSelection(); }
  });
  $('#presets').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; const p = CORPUS.presets.find(x => x.id === b.dataset.p); selected = new Set(p ? p.videos : []); syncSelection(); });
  $('#mcs').addEventListener('input', syncSelection);
  $('#runBtn').addEventListener('click', run);
}
function renderPresets() {
  $('#presets').innerHTML = [...CORPUS.presets.map(p => `<button class="preset" data-p="${p.id}">${esc(L(PRESET_NAMES[p.id]))}<small>${p.videos.length}</small></button>`), `<button class="preset" data-p="none">${esc(L('Clear'))}</button>`].join('');
}
let currentKey = '';
function syncSelection() {
  $$('.vt').forEach(t => { const on = selected.has(t.dataset.v); t.classList.toggle('on', on); t.setAttribute('aria-pressed', on); });
  $$('.scene').forEach(sec => { const vids = [...sec.querySelectorAll('.vt')], n = vids.filter(t => t.classList.contains('on')).length; sec.classList.toggle('full', n === vids.length); sec.classList.toggle('some', n > 0 && n < vids.length); sec.querySelector('.n').textContent = `${n}/${vids.length}`; sec.querySelector('.sh button').setAttribute('aria-pressed', n === vids.length); sec.querySelector('.sn').textContent = sceneName(sec.dataset.s); });
  const key = keyOf(selected, mcs()), hit = cached(key);
  $$('.preset').forEach(b => { const p = CORPUS.presets.find(x => x.id === b.dataset.p); b.classList.toggle('on', !!p && p.videos.length === selected.size && p.videos.every(v => selected.has(v))); });
  const btn = $('#runBtn'); btn.disabled = !selected.size;
  btn.innerHTML = selected.size ? `${esc(L('Run discovery on {n} videos', { n: fmt(selected.size) }))}${hit ? ` <small style="opacity:.75">· ${esc(L('cached'))}</small>` : ''} <span aria-hidden="true">→</span>` : esc(L('Select at least one video'));
}
function run() {
  if (!selected.size) return;
  currentKey = keyOf(selected, mcs()); const hit = cached(currentKey);
  rlLines.innerHTML = ''; $('#runlog').hidden = false; $('#runlog').classList.toggle('min', W < 860); $('#rlToggle').setAttribute('aria-expanded', W >= 860); runId++;
  if (hit) { setResult(hit[1], hit[0]); state('ok', L('from cache')); logLine(`✓ <b>${esc(L(hit[0] === 'preset' ? 'Precomputed selection (same code, run at build time) — reused.' : 'Same selection already computed in this browser — reused.'))}</b>`); logEvent({ step: 'done', t: 0, ...hit[1].meta.counts }); }
  else { RESULT = null; state('', L('running…')); startWorker(); const names = CORPUS.videos.map(v => v.v).filter(v => selected.has(v)); worker && worker.postMessage({ id: runId, request: { videos: names, min_cluster_size: mcs() } }); }
  goTo(1);
}

/* ------------------------------------------------------------------ steps 2–3 · sampling and simulated responses */
const chosenVideos = () => CORPUS.videos.filter(v => selected.has(v.v));
let frames = [];
const sampling = { mode: 'uniform16', duration: 40, t: 0, playing: false, captured: new Set(), scene: 'lobby' };
function sampleTimes() { const d = sampling.duration; return sampling.mode === 'uniform16' ? Array.from({ length: 16 }, (_, i) => i * (d - .1) / 15) : Array.from({ length: Math.ceil(d) }, (_, i) => i); }
function buildTrack() {
  const track = $('#track'), times = sampleTimes(), d = sampling.duration; track.innerHTML = '';
  times.forEach((t, i) => { const tick = document.createElement('i'); tick.style.left = (t / d * 100) + '%'; tick.dataset.i = i; track.appendChild(tick); });
  if (sampling.mode === '1fps') for (let w = 0; w * 16 < times.length; w++) { const a = times[w * 16], b = times[Math.min(times.length - 1, w * 16 + 15)], el = document.createElement('b'); el.style.left = (a / d * 100) + '%'; el.style.width = ((b - a) / d * 100) + '%'; el.innerHTML = `<em>${L('WINDOW {n}', { n: w + 1 })}</em>`; track.appendChild(el); }
  const strip = $('#strip'); strip.innerHTML = ''; const groups = sampling.mode === '1fps' ? Math.ceil(times.length / 16) : 1;
  for (let w = 0; w < groups; w++) { const win = document.createElement('div'); win.className = 'win'; win.dataset.label = sampling.mode === '1fps' ? L('WINDOW {n} · ONE VLM CALL', { n: w + 1 }) : L('16 FRAMES · ONE VLM CALL'); strip.appendChild(win);
    for (let j = w * 16; j < Math.min(times.length, w * 16 + 16); j++) { const th = document.createElement('div'); th.className = 'thumb'; th.dataset.i = j; th.innerHTML = '<canvas width="96" height="54"></canvas>'; win.appendChild(th); } }
  sampling.captured = new Set(); frames = [];
}
function setMode(mode) { sampling.mode = mode; $$('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode)); buildTrack(); sampling.t = 0; sampling.playing = true; }
$$('#modeSeg button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
const player = $('#player'), pg = player.getContext('2d');
function stepPlayer(dt) {
  if (!layers.sampling.classList.contains('on')) return;
  const d = sampling.duration; if (sampling.playing) sampling.t = Math.min(d, sampling.t + dt * d / (reduced ? .2 : 7));
  SC.drawScene(pg, sampling.scene, sampling.t, player.width, player.height, 11);
  $('#playhead').style.left = (sampling.t / d * 100) + '%'; const s = Math.floor(sampling.t); $('#osdTime').textContent = `00:${String(s).padStart(2, '0')}.${Math.floor((sampling.t % 1) * 10)}`;
  sampleTimes().forEach((t, i) => { if (t <= sampling.t && !sampling.captured.has(i)) { sampling.captured.add(i); const th = $(`#strip .thumb[data-i="${i}"]`), tick = $(`#track i[data-i="${i}"]`); if (tick) tick.classList.add('hit');
    if (th) { const c = th.querySelector('canvas'); SC.drawScene(c.getContext('2d'), sampling.scene, t, c.width, c.height, 11); th.classList.add('in'); if (frames.length < 16) frames.push(c); } } });
}
const CHECKS = ['valid JSON object', 'exactly anomaly + evidence', 'anomaly is 0 or 1', '1 to 3 statements', 'each ≤ 15 words', 'no recovery needed'];
function typeJSON(resp, done) {
  const lines = ['{', `  "anomaly": ${resp.anomaly},`, '  "evidence": [', ...resp.evidence.map((e, j) => `    "${e}"${j < resp.evidence.length - 1 ? ',' : ''}`), '  ]', '}'], full = lines.join('\n'), pre = $('#json'); let n = 0;
  const color = s => esc(s).replace(/(&quot;(anomaly|evidence)&quot;)/g, '<span class="k">$1</span>').replace(/(&quot;[^&]+?&quot;)(?!:)/g, m => /anomaly|evidence/.test(m) ? m : `<span class="s">${m}</span>`).replace(/: ([01]),/, ': <span class="n">$1</span>,');
  const tick = () => { n = Math.min(full.length, n + (reduced ? full.length : 3)); pre.innerHTML = color(full.slice(0, n)) + (n < full.length ? '<span class="cursor"></span>' : ''); if (n < full.length) timers.push(setTimeout(tick, 16)); else done && done(); };
  tick();
}
function showResponse(video, fast) {
  const resp = JSON.parse(video.r); $('#respVideo').textContent = video.v; $('#json').innerHTML = ''; $('#checks').innerHTML = CHECKS.map(c => `<li>${esc(L(c))}</li>`).join('');
  const chips = $('#chips'); if (!fast) chips.innerHTML = '';
  typeJSON(resp, () => { $$('#checks li').forEach((li, j) => later(j * (fast ? 40 : 160), () => li.classList.add('in')));
    later(fast ? 200 : 1000, () => resp.evidence.forEach((e, j) => { const el = document.createElement('div'); el.className = `chip a${resp.anomaly}`; el.dataset.t = e; el.innerHTML = `${esc(e)}<small>${L(resp.anomaly ? 'ANOMALOUS' : 'NORMAL')}</small>`; chips.appendChild(el); later(j * 140, () => el.classList.add('in')); while (chips.children.length > 9) chips.firstChild.remove(); })); });
}
function flyChips() {
  const index = new Map(M.ev.map((t, i) => [t, i]));
  $$('#chips .chip').forEach(ch => { const i = index.get(ch.dataset.t); if (i === undefined) return; const r = ch.getBoundingClientRect(), g = ch.cloneNode(true); g.classList.add('ghost', 'in'); g.style.left = r.left + 'px'; g.style.top = r.top + 'px'; document.body.appendChild(g);
    const [x, y] = scr(P[i]); requestAnimationFrame(() => { g.style.transform = `translate(${x - r.left - r.width / 2}px,${y - r.top - r.height / 2}px) scale(.2)`; g.style.opacity = '0'; }); setTimeout(() => g.remove(), 1300); });
}

/* ------------------------------------------------------------------ acts */
const layers = { intro: $('#intro'), library: $('#library'), sampling: $('#sampling'), vlm: $('#vlm'), taxonomy: $('#taxonomy') };
const showLayer = name => Object.entries(layers).forEach(([k, el]) => el.classList.toggle('on', k === name));
let timers = [];
const later = (ms, fn) => timers.push(setTimeout(fn, reduced ? Math.min(ms, 50) : ms));
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const hidePoints = () => { pts.forEach(p => { p.ta = 0; }); nodes.forEach(n => { n.ta = 0; }); tethersTarget = coresTarget = wheelTarget = 0; };
const wait = document.createElement('div'); wait.className = 'wait'; document.querySelector('#app').appendChild(wait);
const linkName = m => L(m);

const ACTS = [
  { step: 'Select', ref: 'INPUT · LOCAL VIDEOS', title: 'Choose the videos', manual: true,
    enter() { showLayer('library'); hidePoints(); counter.classList.remove('on'); $('#caption').classList.remove('on'); if (!CORPUS) return; buildSelection(); renderPresets(); syncSelection(); startWorker(); } },
  { step: 'Sample', ref: 'VISUAL INPUT', title: 'Sample the frames', body: 'cap-sample', dur: 17,
    enter() { showLayer('sampling'); hidePoints(); counter.classList.remove('on'); const v = chosenVideos()[0]; sampling.scene = v ? v.s : 'lobby'; $('#fileName').textContent = v ? v.v : ''; $('#osdCam').textContent = 'CAM 03 · SYNTHETIC'; setMode('uniform16'); later(9500, () => setMode('1fps')); } },
  { step: 'Describe', ref: 'EVIDENCE GENERATION · SIMULATED', title: 'The model describes what it sees', body: 'cap-vlm', dur: 22,
    enter() { showLayer('vlm'); counter.classList.remove('on'); const vids = chosenVideos(); const mini = $('#miniStrip'); mini.innerHTML = ''; mini.classList.remove('flow');
      for (let j = 0; j < 16; j++) { const th = document.createElement('div'); th.className = 'thumb'; const c = document.createElement('canvas'); c.width = 96; c.height = 54; const g = c.getContext('2d'); if (frames[j]) g.drawImage(frames[j], 0, 0); else SC.drawScene(g, sampling.scene, j * 2.6, 96, 54, 11); th.appendChild(c); th.style.animationDelay = (j * 45) + 'ms'; mini.appendChild(th); }
      later(500, () => { mini.classList.add('flow'); $('.engine').classList.add('busy'); });
      if (vids[0]) later(1900, () => showResponse(vids[0]));
      vids.slice(1, 6).forEach((v, j) => later(9500 + j * 1700, () => showResponse(v, true)));
      const occ = vids.reduce((s, v) => s + JSON.parse(v.r).evidence.length, 0);
      later(9500, () => count(occ, L('evidence statements'), L('from {n} validated responses', { n: fmt(vids.length) }), 3.5)); },
    exit() { $('.engine').classList.remove('busy'); } },
  { step: 'Embed', ref: 'SEMANTIC DISCOVERY · LIVE', title: 'Every statement becomes a vector', body: 'cap-embed', dur: 14, needs: true,
    enter() { showLayer(null); if (!RESULT) return waiting(); wait.classList.remove('on'); flyChips();
      pts.forEach((p, i) => { p.tx = P[i][0]; p.ty = P[i][1]; p.tcol = LIGHT() ? '#6f6a5e' : '#d8d1c0'; p.ta = .8; p.tr = 3.2; if (p.a < .05) { p.x = .5 + (Math.random() - .5) * .1; p.y = 1.25; p.delay = reduced ? 0 : Math.random() * 1.6; } });
      count(C.statements, L('unique statements'), L('{n} occurrences · 384-d BGE vectors', { n: fmt(C.occurrences) }), 2); labelFn = null; } },
  { step: 'Cluster', ref: 'HDBSCAN · LIVE', title: 'Dense regions become clusters', body: 'cap-cluster', dur: 16, needs: true,
    enter() { showLayer(null); if (!RESULT) return waiting(); wait.classList.remove('on');
      pts.forEach((p, i) => { const k = keyAt(i); p.delay = reduced ? 0 : Math.hypot(P[i][0] - .5, P[i][1] - .5) * 1.4; p.tcol = k ? CL[k].color : (LIGHT() ? '#9a958a' : '#7d8088'); p.ta = k ? .9 : .25; p.tr = k ? 3.8 : 2.4; });
      count(C.clusters, L('clusters'), L('{n} statements left as noise', { n: fmt(C.noise_statements) }), 1.6); setCaption(this);
      labelFn = () => placeApart(clusterKeys.slice(0, W < 860 ? 8 : 16).map(k => { const [x, y] = scr(CC[k]); return { id: 'c' + k, html: esc(CL[k].name), text: CL[k].name, x, y: y - 18, c: CL[k].color }; }), W < 860 ? 5 : 11); } },
  { step: 'Group', ref: 'CENTROID HIERARCHY · LIVE', title: 'Clusters group into families', body: 'cap-families', dur: 18, needs: true,
    enter() { showLayer(null); if (!RESULT) return waiting(); wait.classList.remove('on'); pts.forEach(p => { p.ta = keyAt(p.i) ? .16 : .05; p.tr = 2; p.delay = 0; }); setCaption(this);
      nodes.forEach(n => { n.x = n.tx = CC[n.k][0]; n.y = n.ty = CC[n.k][1]; n.ta = 1; n.tr = 3 + Math.sqrt(members[n.k].length) * 1.3; n.tcol = CL[n.k].color; });
      later(2600, () => { tethersTarget = 1; coresTarget = 1; nodes.forEach(n => { const f = famOf(CL[n.k].fam); n.tcol = f ? f.color : '#8a8f98'; }); pts.forEach(p => { const k = keyAt(p.i); if (k) p.tcol = famOf(CL[k].fam).color; });
        count(C.families, L('candidate families'), hs ? L('{m} linkage · k = {k} · {n} cuts scored', { m: linkName(hs.method), k: hs.k, n: RESULT.meta.hierarchy.candidates_evaluated }) : L('second stage not estimated'), 1.2); });
      labelFn = () => tethersTarget ? FAM.filter(f => !f.unassigned).map(f => { const [x, y] = scr(FC[f.id]); return { id: 'f' + f.id, html: `<b>${esc(f.code)}</b>${esc(f.name)}`, x, y, c: f.color }; }) : []; } },
  { step: 'Name', ref: 'AUTOMATIC NAMES · NO REVIEW', title: 'A taxonomy, assembled automatically', body: 'cap-name', dur: 14, last: true, needs: true,
    enter() { showLayer('taxonomy'); if (!RESULT) return waiting(); wait.classList.remove('on'); pts.forEach(p => { p.ta = 0; }); counter.classList.remove('on');
      nodes.forEach(n => { n.ta = 1; n.tr = Math.max(4, Math.min(WHEEL.step * .36, 2 * Math.PI * WHEEL.r0 / WHEEL.NF * .3)); }); tethersTarget = 0; coresTarget = 0; wheelTarget = 1;
      renderCTA(); later(2800, () => $('#cta').classList.add('in'));
      labelFn = () => FAM.map(f => { const l = WHEEL.lab[f.id]; if (!l) return null; const deg = l.a * 180 / Math.PI, flip = Math.cos(l.a) < 0, html = `<b>${esc(f.code)}</b>${esc(f.unassigned ? L(f.name) : f.name)}`;
        return { id: 'w' + f.id, html: flip ? `<span style="display:inline-block;transform:translateX(-100%)">${html}</span>` : html, x: l.x, y: l.y, c: f.color, cls: 'wheel', rot: flip ? deg + 180 : deg }; }).filter(Boolean); },
    exit() { $('#cta').classList.remove('in'); wheelTarget = 0; } },
];
function waiting() { wait.innerHTML = `<b>${esc(L('Running the discovery code…'))}</b><span>${esc(L('The first run downloads the Python runtime (~40 MB, cached afterwards).'))}</span>`; wait.classList.add('on'); hidePoints(); labelFn = null; setLabels([]); }
function renderCTA() {
  const live = resultSource === 'live';
  $('#ctaEyebrow').textContent = L(live ? 'RESULT · COMPUTED IN YOUR BROWSER' : 'RESULT · PRECOMPUTED');
  $('#ctaTitle').textContent = C.clusters ? L('{c} clusters, {f} candidate families', { c: fmt(C.clusters), f: fmt(C.families) }) : L('No taxonomy for this selection');
  $('#ctaText').textContent = C.clusters ? L('From {s} statements of {v} synthetic videos. Open the atlas to browse families, clusters, every statement and its source video.', { s: fmt(C.statements), v: fmt(RESULT.videos.length) })
    : L('Too few recurrent statements: HDBSCAN found no dense region. Select more videos or lower min_cluster_size.');
  const a = $('#ctaAtlas'); if (RESULT === DEFAULT) a.href = 'atlas/index.html'; else { try { localStorage.setItem('atlas-demo-live', JSON.stringify(RESULT)); a.href = 'atlas/index.html?live=1'; } catch (e) { a.href = 'atlas/index.html'; } }
}

/* ------------------------------------------------------------------ steps, caption, playback */
const stepsEl = $('#steps');
function renderSteps() { stepsEl.innerHTML = ACTS.map((a, i) => `<li class="${i === cur ? 'on' : i < cur ? 'done' : ''}"><button data-i="${i}"><span>0${i + 1}</span>${esc(L(a.step))}</button></li>`).join(''); }
stepsEl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const i = +b.dataset.i; if (i > 0 && cur < 1 && !selected.size) return; goTo(i); });
function setCaption(a) {
  if (a.manual) return; $('#caption').classList.add('on');
  const i = ACTS.indexOf(a); $('#capRef').textContent = `${String(i + 1).padStart(2, '0')} / ${String(ACTS.length).padStart(2, '0')} · ${L(a.ref)}`; $('#capTitle').textContent = L(a.title);
  const vars = { m: RESULT ? RESULT.meta.parameters.hdbscan.min_cluster_size : 8, c: C ? fmt(C.clusters) : '—', x: C ? fmt(C.noise_statements) : '—', s: hs ? L(' Selected here: {m} linkage, k = {k}.', { m: linkName(hs.method), k: hs.k }) : '' };
  $('#capBody').textContent = L(a.body, vars);
}
let cur = -1, actT = 0, paused = false;
function goTo(i) {
  if (i < 0 || i >= ACTS.length) return; clearTimers(); if (cur >= 0 && ACTS[cur].exit) ACTS[cur].exit();
  cur = i; actT = 0; layers.intro.classList.remove('on'); renderSteps(); labelFn = null; setLabels([]); wait.classList.remove('on');
  const a = ACTS[i]; setCaption(a); a.enter();
}
$('#play').addEventListener('click', () => goTo(0));
$('#replay').addEventListener('click', () => goTo(0));
$('#prev').addEventListener('click', () => goTo(Math.max(0, cur - 1)));
$('#next').addEventListener('click', () => goTo(Math.min(ACTS.length - 1, cur + 1)));
$('#pause').addEventListener('click', e => { paused = !paused; const b = e.currentTarget; b.textContent = paused ? '▶' : '❚❚'; b.dataset.i18nTitle = paused ? 'Play (space)' : 'Pause (space)'; b.title = L(b.dataset.i18nTitle); b.setAttribute('aria-label', b.title); });
$('#rlToggle').addEventListener('click', () => { const m = $('#runlog').classList.toggle('min'); $('#rlToggle').setAttribute('aria-expanded', !m); });
addEventListener('keydown', e => { if (e.target.matches('input')) return; if (cur < 0) { if (e.key === 'Enter') goTo(0); return; } if (ACTS[cur].manual) return;
  if (e.key === 'ArrowRight') goTo(Math.min(ACTS.length - 1, cur + 1)); else if (e.key === 'ArrowLeft') goTo(Math.max(0, cur - 1)); else if (e.key === ' ') { e.preventDefault(); $('#pause').click(); } });
addEventListener('resize', resize);

/* language & theme */
$('#langBtn').addEventListener('click', () => I.setLang(I.lang === 'pt' ? 'en' : 'pt'));
addEventListener('langchange', () => { renderSteps(); if (cur >= 0) setCaption(ACTS[cur]); if (CORPUS) { renderPresets(); syncSelection(); } if (cur === ACTS.length - 1 && RESULT) renderCTA(); });
$('#themeBtn').addEventListener('click', () => { const t = LIGHT() ? 'dark' : 'light'; document.documentElement.dataset.theme = t; try { localStorage.setItem('atlas-theme', t); } catch (e) { } document.querySelector('meta[name=theme-color]').content = t === 'light' ? '#f3f0e9' : '#0c0d10'; if (cur >= 0 && ACTS[cur].needs && RESULT) ACTS[cur].enter(); });

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now;
  const a = ACTS[cur];
  if (a && !a.manual && !paused && !(a.needs && !RESULT)) { actT += dt; $('#capBar').style.width = Math.min(100, actT / a.dur * 100) + '%'; if (actT >= a.dur && !a.last) goTo(cur + 1); }
  stepPlayer(dt); draw(dt); if (labelFn) setLabels(labelFn());
}

/* boot */
I.applyStatic(); renderSteps(); setData(DEFAULT); resize(); requestAnimationFrame(loop);
fetch('data/corpus.json').then(r => r.json()).then(c => { CORPUS = c; selected = new Set(c.presets.find(p => p.id === 'all').videos); if (cur === 0) ACTS[0].enter(); })
  .catch(() => setRuntime('err', L('Live runs need the page served over http(s); cached selections still work.')));
fetch('data/presets.json').then(r => r.json()).then(p => { PRESETS = p; if (CORPUS) syncSelection(); }).catch(() => { });
window.__demo = { goTo, ACTS, get selected() { return selected; }, run };
})();
