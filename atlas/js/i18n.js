/* English / Brazilian Portuguese for the atlas, the walkthrough and the local app.
   Strings are written in English in the code and looked up here (gettext style); {name} placeholders are filled by L().
   Evidence statements and automatic names stay in the language the model wrote them in. */
(() => {
'use strict';
const PT = {
  // generic nouns used by plural()
  'statement': 'frase', 'statements': 'frases', 'cluster': 'grupo', 'clusters': 'grupos', 'family': 'família', 'families': 'famílias',
  'candidate family': 'família candidata', 'candidate families': 'famílias candidatas', 'video': 'vídeo', 'videos': 'vídeos',
  'evidence statement': 'frase de evidência', 'evidence statements': 'frases de evidência', 'unique statement': 'frase única',
  'unique statements': 'frases únicas', 'occurrence': 'ocorrência', 'occurrences': 'ocorrências',
  'supporting video': 'vídeo de suporte', 'supporting videos': 'vídeos de suporte', 'noise': 'ruído',
  // categories (paper) and legend
  'Anomalous': 'Anômalo', 'Predominantly Anomalous': 'Predominantemente anômalo', 'Neutral': 'Neutro',
  'Predominantly Normal': 'Predominantemente normal', 'Normal': 'Normal',
  'all supporting videos are anomalous': 'todos os vídeos de suporte são anômalos',
  'more than half of the supporting videos are anomalous': 'mais da metade dos vídeos de suporte é anômala',
  'equal shares of anomalous and normal videos': 'proporções iguais de vídeos anômalos e normais',
  'less than half, but not zero, of the supporting videos are anomalous': 'menos da metade, mas não zero, dos vídeos de suporte é anômala',
  'no anomalous video among the supporting videos': 'nenhum vídeo anômalo entre os vídeos de suporte',
  'share of supporting videos the VLM flagged as anomalous': 'proporção de vídeos de suporte que a VLM marcou como anômalos',
  'share of supporting videos labelled anomalous (reference labels)': 'proporção de vídeos de suporte rotulados como anômalos (rótulos de referência)',
  // header, dock, tabs
  'Sources': 'Fontes', 'Run': 'Execução', 'Theme': 'Tema', 'How to read': 'Como ler', 'Fullscreen': 'Tela cheia', 'Language': 'Idioma',
  'Taxonomy': 'Taxonomia', 'Candidate family wheel': 'Roda de famílias candidatas', 'Cluster centroids · 3D': 'Centroides dos grupos · 3D',
  'Evidence · 3D': 'Evidências · 3D', 'drag': 'arrastar', 'orbit': 'girar', 'scroll': 'rolar', 'zoom': 'zoom', 'click': 'clicar',
  'inspect': 'inspecionar', 'search': 'buscar', 'esc': 'esc', 'clear': 'limpar', 'Auto-orbit': 'Rotação', 'Labels': 'Rótulos',
  'Noise': 'Ruído', 'Reset view': 'Reiniciar vista', 'Index': 'Índice', 'Enter the atlas': 'Entrar no atlas',
  'SIMULATED DATA · NOT A MODEL RESULT': 'DADOS SIMULADOS · NÃO É RESULTADO DE MODELO',
  'No taxonomy for this run': 'Nenhuma taxonomia nesta execução',
  // help sheet
  'How to read this atlas': 'Como ler este atlas',
  'Candidate family wheel': 'Roda de famílias candidatas',
  'Every cell is a first-stage cluster (HDBSCAN over the evidence embeddings of one model). Cells sit on the spoke of their candidate family, largest first from the centre. Colour shows the share of anomalous videos among the videos that support the cluster.':
    'Cada célula é um grupo da primeira etapa (HDBSCAN sobre os embeddings das evidências de um modelo). As células ficam no raio da sua família candidata, as maiores mais perto do centro. A cor mostra a proporção de vídeos anômalos entre os vídeos que sustentam o grupo.',
  'Families': 'Famílias', 'Evidence clouds': 'Nuvens de evidências', 'One point per statement': 'Um ponto por frase', 'Linked': 'Conectado', 'Selections travel': 'A seleção acompanha',
  'Each node is a cluster centroid; its shape identifies the model. Tethers join the clusters that the second stage (agglomerative clustering of centroids) placed in the same family.':
    'Cada nó é o centroide de um grupo; a forma indica o modelo. As linhas ligam os grupos que a segunda etapa (agrupamento aglomerativo dos centroides) colocou na mesma família.',
  'Each point is one unique evidence statement written by a model, projected to 3D. Grey points are noise: statements HDBSCAN did not assign to any cluster. Hover to read, click to inspect the cluster and trace it to its source videos.':
    'Cada ponto é uma frase de evidência única escrita por um modelo, projetada em 3D. Pontos cinza são ruído: frases que o HDBSCAN não atribuiu a nenhum grupo. Passe o mouse para ler e clique para inspecionar o grupo e chegar aos vídeos de origem.',
  'A family or cluster you pick stays selected across views. Use “Sources” to browse every video and the model decision, and “Run” for parameters, counts and warnings of this run.':
    'A família ou o grupo escolhido continua selecionado em todas as vistas. Use “Fontes” para ver cada vídeo e a decisão do modelo, e “Execução” para parâmetros, totais e avisos.',
  // panels
  'Family field': 'Campo de famílias', 'Evidence space': 'Espaço de evidências',
  'Each node is a first-stage cluster, positioned by the normalised centroid of its evidence embeddings.': 'Cada nó é um grupo da primeira etapa, posicionado pelo centroide normalizado dos embeddings das suas evidências.',
  'Tethers join the nodes the second stage grouped into one family.': 'As linhas ligam os nós que a segunda etapa reuniu numa mesma família.',
  'Each point is one unique evidence statement written by {model}, placed so that similar descriptions sit together. Points sharing a colour belong to the same candidate family; grey points are noise.':
    'Cada ponto é uma frase de evidência única escrita por {model}, posicionada para que descrições parecidas fiquem próximas. Pontos da mesma cor pertencem à mesma família candidata; pontos cinza são ruído.',
  'shared by all models': 'compartilhadas por todos os modelos', 'Colour by': 'Colorir por', 'Family': 'Família', 'Cluster': 'Grupo', 'Anomaly': 'Anomalia',
  'Find': 'Buscar', 'press / · Enter selects': 'tecle / · Enter seleciona', 'Search clusters, families, F01…': 'Buscar grupos, famílias, F01…',
  'Each point is a normalised BGE centroid. ': 'Cada ponto é um centroide BGE normalizado. ', 'Axes are not interpretable — distances are qualitative. ': 'Os eixos não têm interpretação; as distâncias são qualitativas. ',
  "Families come from automatic agglomerative clustering of centroids; names are keywords taken from the cluster's own statements. Nothing here was reviewed by a person.":
    'As famílias vêm do agrupamento aglomerativo automático dos centroides; os nomes são palavras-chave das próprias frases do grupo. Nada aqui foi revisado por uma pessoa.',
  'Hue = candidate family, consistent across all views. Grey = noise.': 'Cor = família candidata, igual em todas as vistas. Cinza = ruído.',
  'One colour per cluster. Every cluster is listed below.': 'Uma cor por grupo. Todos os grupos estão listados abaixo.', 'Based on the {x}.': 'Com base na {x}.',
  'Candidate families': 'Famílias candidatas', 'Clear': 'Limpar', 'Clusters · {n}': 'Grupos · {n}',
  "Each dot is the cluster's own colour in the cloud. Sorted by number of statements.": 'Cada ponto tem a cor do grupo na nuvem. Ordenado pelo número de frases.',
  'No cluster matches your search.': 'Nenhum grupo corresponde à busca.', 'No family or cluster matches your search.': 'Nenhuma família ou grupo corresponde à busca.',
  'No clusters were found in this run.': 'Nenhum grupo foi encontrado nesta execução.', 'Anomaly category': 'Categoria de anomalia',
  '{n} statements': '{n} frases', 'Sorted by {x}.': 'Ordenado pela {x}.', 'No cluster matches these filters.': 'Nenhum grupo corresponde a estes filtros.',
  // tooltips, inspector
  'Noise · not assigned to a cluster': 'Ruído · fora de qualquer grupo', 'video {v}': 'vídeo {v}', 'window {n}': 'janela {n}',
  'VLM anomalous': 'VLM: anômalo', 'VLM normal': 'VLM: normal', '+{n} more': '+{n}', 'cluster {n}': 'grupo {n}',
  '{p}% anomalous videos': '{p}% de vídeos anômalos', 'HDBSCAN cluster {n}': 'grupo HDBSCAN {n}', 'ANOM': 'ANÔM', 'NORM': 'NORM',
  'Show in taxonomy': 'Ver na taxonomia', 'Open in family map': 'Abrir no mapa de famílias', 'Open in {m} cloud': 'Abrir na nuvem {m}',
  'Dominated by appearance cues (colour, clothing)': 'Dominado por aparência (cor, roupa)', 'Dominated by image-quality or viewpoint descriptions': 'Dominado por qualidade de imagem ou ponto de vista',
  'Dominated by generic “nothing unusual” statements': 'Dominado por frases genéricas (“nada incomum”)', 'Excluded from the second stage by configuration': 'Excluído da segunda etapa pela configuração',
  'REPRESENTATIVE STATEMENT': 'FRASE REPRESENTATIVA', 'NOTE': 'NOTA', 'Model': 'Modelo', 'Evidence': 'Evidências', 'Videos': 'Vídeos',
  'Evidence statements': 'Frases de evidência', 'first {n}': 'primeiras {n}', 'click a video to trace it': 'clique num vídeo para rastreá-lo',
  'clusters without a family': 'grupos sem família', 'automatic candidate grouping': 'agrupamento candidato automático', 'Clusters': 'Grupos',
  'mean anomalous-video share': 'proporção média de vídeos anômalos', 'Not grouped': 'Sem família',
  'Clusters that did not enter the second grouping stage.': 'Grupos que não entraram na segunda etapa de agrupamento.',
  // taxonomy view
  'not grouped': 'sem família', 'clusters match filters': 'grupos atendem aos filtros', '{p}% mean anomalous': '{p}% de anomalia média',
  'Hover a cell to read it, click to inspect. Ring = rank inside its family, largest first.': 'Passe o mouse para ler, clique para inspecionar. Anel = posição dentro da família, do maior para o menor.',
  'Hover a cell to read it, click to inspect. Rows = rank inside the family.': 'Passe o mouse para ler, clique para inspecionar. Linhas = posição dentro da família.',
  'No clusters found': 'Nenhum grupo encontrado',
  'The first grouping stage did not find any dense region of similar statements in this run, so no taxonomy was built. The statements are still available in the evidence view.':
    'A primeira etapa não encontrou nenhuma região densa de frases parecidas nesta execução, então nenhuma taxonomia foi montada. As frases continuam disponíveis na vista de evidências.',
  'Clusters need at least min_cluster_size near-identical descriptions. Larger video sets produce more recurrent evidence.': 'Um grupo precisa de pelo menos min_cluster_size descrições muito parecidas. Conjuntos maiores de vídeos produzem mais evidências recorrentes.',
  'The automatic taxonomy as an instrument. Each cell is a first-stage cluster on the spoke of its family; its colour is the {x}.': 'A taxonomia automática como instrumento. Cada célula é um grupo da primeira etapa no raio da sua família; a cor é a {x}.',
  'Layout': 'Disposição', 'Radial wheel': 'Roda radial', 'Matrix grid': 'Matriz', 'Order by size': 'Por tamanho', 'By anomaly share': 'Por anomalia', 'All': 'Todas',
  'Search names, statements, F01…': 'Buscar nomes, frases, F01…',
  "Families are an automatic computational grouping of cluster centroids, not a validated taxonomy. Names are the most distinctive terms of each cluster's own statements.":
    'As famílias são um agrupamento computacional automático dos centroides, não uma taxonomia validada. Os nomes são os termos mais característicos das frases de cada grupo.',
  'The run produced no clusters.': 'A execução não produziu grupos.',
  // sources
  'Every video of the run with the decision returned by the VLM.': 'Todos os vídeos da execução com a decisão devolvida pela VLM.',
  'These are model predictions, not ground truth.': 'São previsões do modelo, não verdade de referência.',
  'Composition uses the reference labels supplied with the run; the VLM never saw them.': 'A composição usa os rótulos de referência fornecidos; a VLM nunca os viu.',
  'Click a row to read its evidence and jump to its clusters.': 'Clique numa linha para ler as evidências e ir aos grupos.',
  'Search videos…': 'Buscar vídeos…', 'Video': 'Vídeo', 'Status': 'Status', 'VLM decision': 'Decisão da VLM', 'Duration': 'Duração', 'Windows': 'Janelas',
  'Statements': 'Frases', 'ANOMALOUS': 'ANÔMALO', 'NORMAL': 'NORMAL', 'UNDETERMINED': 'INDETERMINADO', 'COMPLETE': 'COMPLETO', 'PARTIAL': 'PARCIAL', 'FAILED': 'FALHOU',
  'PROCESSING ISSUE': 'PROBLEMA NO PROCESSAMENTO', 'No valid evidence for this video.': 'Nenhuma evidência válida para este vídeo.',
  'Select a video to read its evidence.': 'Selecione um vídeo para ler as evidências.',
  // run report
  'Run report': 'Relatório da execução', 'generated {d} UTC': 'gerado em {d} UTC', 'simulated demonstration data': 'dados simulados de demonstração',
  'All stages ran automatically; nothing was reviewed by a person.': 'Todas as etapas rodaram automaticamente; nada foi revisado por uma pessoa.',
  'complete': 'completos', 'partial': 'parciais', 'failed': 'com falha', 'evidence occurrences': 'ocorrências de evidência', 'noise statements': 'frases sem grupo',
  'Extraction': 'Extração', 'Discovery': 'Descoberta', 'Checkpoint': 'Checkpoint', 'Revision': 'Revisão', 'Backend': 'Backend', 'Precision': 'Precisão',
  'Device': 'Dispositivo', 'Sampling': 'Amostragem', 'Frame size': 'Tamanho do frame', 'Valid windows': 'Janelas válidas', 'Invalid / failed windows': 'Janelas inválidas / com falha',
  'JSON parsed strictly': 'JSON estrito', 'JSON embedded in text': 'JSON dentro de texto', 'Embeddings': 'Embeddings', 'Deduplication': 'Deduplicação',
  'Second stage': 'Segunda etapa', 'Candidate cuts': 'Cortes avaliados', 'Composition': 'Composição', 'Projection': 'Projeção',
  'VLM decisions (no reference labels)': 'decisões da VLM (sem rótulos de referência)', 'reference labels': 'rótulos de referência',
  '1 frame per second (windows)': '1 frame por segundo (janelas)', '16 frames, uniformly spaced': '16 frames uniformes', 'Timings': 'Tempos', 'Export': 'Exportar',
  'Statements (CSV)': 'Frases (CSV)', 'Clusters (CSV)': 'Grupos (CSV)', 'Atlas data (JSON)': 'Dados do atlas (JSON)', '{m} linkage · k={k} · score {s}': 'ligação {m} · k={k} · escore {s}',
  'The VLM decision and evidence are model outputs, not verified annotations. Format validation checks the JSON contract, not visual correctness. Projections are qualitative.':
    'A decisão e as evidências são saídas do modelo, não anotações verificadas. A validação confere o formato JSON, não a correção visual. As projeções são qualitativas.',
  // intro & help foot
  '{s}, {c} and {f} discovered automatically from {v} described by {m}.': '{s}, {c} e {f} descobertos automaticamente em {v} descritos por {m}.',
  '{s} from {v}. No recurrent cluster was found in this run.': '{s} de {v}. Nenhum grupo recorrente foi encontrado nesta execução.',
  'SIMULATED DEMONSTRATION DATA · ': 'DADOS SIMULADOS DE DEMONSTRAÇÃO · ', ' and ': ' e ',
  'help-foot': 'Os eixos das projeções não têm interpretação; as distâncias são qualitativas. Grupos, famílias e nomes são produzidos automaticamente, sem revisão humana; as famílias são um <b>agrupamento computacional candidato</b>. A cor usa a {x}{p}. Teclas: <span class="mono">1–{n}</span> ou <span class="mono">← →</span> trocam a vista · <span class="mono">Esc</span> limpa a seleção · <span class="mono">/</span> busca · arraste as bordas dos painéis para redimensioná-los.',
  ' — model predictions, not ground truth': ' — previsões do modelo, não verdade de referência',
  'average linkage': 'ligação média', 'complete linkage': 'ligação completa',
};
const EN = {
  'help-foot': 'Axes of the projections are not interpretable; distances are qualitative. Clusters, families and names are produced automatically, without human review; families are a <b>candidate computational grouping</b>. Colour uses the {x}{p}. Keys: <span class="mono">1–{n}</span> or <span class="mono">← →</span> switch views · <span class="mono">Esc</span> clears the selection · <span class="mono">/</span> search · drag the panel edges to resize them.',
};
let lang = 'en';
try { lang = localStorage.getItem('atlas-lang') || ((navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en'); } catch (e) { }
const extra = { en: {}, pt: {} };
function L(key, vars) {
  let s = (lang === 'pt' ? (extra.pt[key] ?? PT[key]) : (extra.en[key] ?? EN[key])) ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}
function applyStatic(root = document) {
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = L(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = L(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = L(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = L(el.dataset.i18nPh); });
  root.querySelectorAll('.lang-btn b').forEach(b => { b.textContent = lang === 'pt' ? 'PT' : 'EN'; });
}
function setLang(next) { lang = next; try { localStorage.setItem('atlas-lang', next); } catch (e) { } applyStatic(); window.dispatchEvent(new CustomEvent('langchange', { detail: next })); }
window.I18N = { L, applyStatic, setLang, get lang() { return lang; }, add(dict) { for (const l of ['en', 'pt']) Object.assign(extra[l], dict[l] || {}); } };
window.L = L;
})();
