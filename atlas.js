(() => {
  'use strict';
  const A = window.ATLAS_DATA || null;
  const rows = A ? A.evidence : (window.DEMO_EVIDENCE || []);
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = value => String(value ?? '').trim().replace(/\s+/g,' ').toLowerCase();
  const colors = ['#c4ef70','#75d9cb','#f0a17d','#a994f1','#e9d36d','#79a9e8','#ed8bb4','#82c68d','#d3a1e8','#d2c479','#72c9e8','#edaa55','#b7ceea','#e47772','#9dc15d','#8f91dd'];
  const modelNames = A ? [...new Set(rows.map(row => row.model))].sort() : [...new Set(rows.map(row => row.model))];
  const families = A ? A.families : [];
  const clusters = A ? A.clusters : [];
  const familyMap = new Map(families.map((family,index) => [family.family_id,{...family,color:colors[index%colors.length]}]));
  const clusterMap = new Map(clusters.map(cluster => [cluster.cluster_id,cluster]));
  // A amostra começa nos grupos para mostrar sua diversidade; novas análises
  // começam nas famílias, que são a etapa mais resumida da taxonomia.
  const initialLayer = A?.demo_metadata ? 'clusters' : 'families';
  const state = {layer:initialLayer, model:'all', family:null, cluster:null, query:''};
  document.querySelectorAll('.view-switch button').forEach(button =>
    button.classList.toggle('active', button.dataset.layer === initialLayer));
  const pointView={yaw:.55,pitch:.28,zoom:1,drag:null,dragged:false,points:[],projected:[],bins:new Map()};
  const occurrences = rows.flatMap(row => (row.occurrences || []).map(source => ({row,source})));
  const uniqueVideos = new Set(occurrences.map(({source})=>source.video_sha256||source.video_id));
  $('#recordCount').textContent = A ? uniqueVideos.size.toLocaleString() : rows.length;
  $('#mEvidence').textContent = (A ? occurrences.length : rows.reduce((n,row)=>n+(row.evidence||[]).length,0)).toLocaleString();
  $('#mUnique').textContent = rows.length.toLocaleString();
  $('#mClusters').textContent = A ? clusters.length.toLocaleString() : '—';
  $('#mFamilies').textContent = A ? families.length.toLocaleString() : '—';
  function renderPredictionCounts() {
    const predicted = new Map();
    if (A) occurrences.filter(({row})=>state.model==='all'||row.model===state.model).forEach(({row,source})=>{
      const key=`${row.model}::${source.video_sha256||source.video_id}`;
      if(!predicted.has(key))predicted.set(key,source.anomaly_prediction);else if(source.anomaly_prediction===1)predicted.set(key,1);
    });
    else rows.filter(row=>state.model==='all'||row.model===state.model).forEach(row=>predicted.set(`${row.model}::${row.video_id}`,row.anomaly));
    const count=[0,0];predicted.forEach(value=>{if(value===0||value===1)count[value]++;});
    $('#nNormal').textContent=count[0].toLocaleString();$('#nAnomaly').textContent=count[1].toLocaleString();
    const total=Math.max(1,count[0]+count[1]);$('#barNormal').style.width=`${100*count[0]/total}%`;$('#barAnomaly').style.width=`${100*count[1]/total}%`;
  }
  if (A) {
    $('#runLabel').textContent=A.demo_metadata?'DEMONSTRAÇÃO':'ANÁLISE GERADA';
    $('#datasetName').textContent=`${A.demo_metadata ? 'UCF-Crime · amostra de 32 vídeos' : (A.dataset_name || 'Conjunto de vídeos')} · ${modelNames.join(' + ')}`;
    const frameStrategy=A.demo_metadata ? 'Não informada na origem' : ({uniform16:'16 frames uniformes', '1fps':'1 frame por segundo'}[A.extraction_manifest?.sampling] || 'Não informada na origem');
    const embeddingName=(A.embedding_model||'Embedding não informado').replace('BAAI/','');
    const clusterSize=A.hdbscan?.min_cluster_size;
    $('#runSampling').textContent=frameStrategy;
    $('#runEmbedding').textContent=`${embeddingName}${Number.isInteger(clusterSize)?` · min ${clusterSize}`:''}`;
    const option = $('#modelFilter');
    modelNames.forEach(name => { const item=document.createElement('option');item.value=name;item.textContent=name;option.append(item); });
    $('#emptyPlot').classList.add('is-hidden');
    $('#inspectTitle').innerHTML='Um mapa de<br>padrões candidatos.';
    $('#inspectCopy').textContent=A.demo_metadata ? 'Esta amostra preserva as frases e os nomes no inglês original da saída do modelo. Os grupos são automáticos e não foram validados por pessoas.' : 'Os grupos e as famílias foram gerados a partir das evidências do modelo. Os nomes são sugestões automáticas e a hierarquia não foi validada por pessoas.';
  }

  const allFacts = () => A ? rows.map(row => ({text:row.text,model:row.model,cluster_id:row.cluster_id,occurrences:row.occurrences||[]})) : rows.flatMap(row => (row.evidence||[]).map((text,index)=>({text,model:row.model,cluster_id:null,occurrences:[{video_id:row.video_id,anomaly_prediction:row.anomaly,evidence_order:index}]})));
  function factsFiltered() {
    const q=norm(state.query);
      return allFacts().filter(fact => (state.model==='all'||fact.model===state.model) && (!q||norm(`${fact.text} ${fact.occurrences.map(o=>o.source_name||o.video_id).join(' ')}`).includes(q)));
  }
  function renderFacts() {
    const facts=factsFiltered();
    $('#evidenceRows').innerHTML=facts.length?facts.map((fact,index)=>{
      const source=fact.occurrences[0]||{}; const pred=source.anomaly_prediction;
      const cluster=clusterMap.get(fact.cluster_id);
      const fam=cluster&&familyMap.get(cluster.family_id);
      const status=pred===1?'MODELO INDICOU · ANOMALIA':pred===0?'MODELO INDICOU · SEM ANOMALIA':'RESPOSTA DO MODELO';
      return `<article class="evidence-row"><span class="row-index">${String(index+1).padStart(3,'0')}</span><div>${fam?`<span class="tag" style="--tag:${fam.color}">${esc(fam.automatic_name)}</span>`:''}<p>${esc(fact.text)}</p></div><small>${esc(fact.model||'')}<br>${esc(source.source_name||source.video_id||'')}<br>${status}</small></article>`;
    }).join(''):'<div class="no-results">Nenhuma evidência corresponde aos filtros.</div>';
  }
  function renderRecent() {
    const facts=factsFiltered().slice(0,5);
    $('#observationList').innerHTML=facts.map(fact=>{const source=fact.occurrences[0]||{};const pred=source.anomaly_prediction;return `<article class="observation"><p>${esc(fact.text)}</p><small><i class="pred ${pred===1?'anomaly':'normal'}"></i>${pred===1?'Modelo indicou anomalia':'Modelo não indicou anomalia'} · ${esc(source.source_name||source.video_id||'')}</small></article>`;}).join('');
  }
  function visibleNodes() {
    if (!A) return [];
    if (state.layer==='families') return families.filter(f=>f.coordinates && (!state.model||state.model==='all'||f.cluster_ids.some(id=>{const c=clusterMap.get(id);return c&&c.model===state.model;})));
    return clusters.filter(c=>c.coordinates && (!state.family||c.family_id===state.family) && (state.model==='all'||c.model===state.model));
  }
  function nodePosition(node) { const [x,y]=node.coordinates||[.5,.5];return [80+x*740,48+(1-y)*445]; }
  function renderPlot() {
    const svg=$('#plot');
    const canvas=$('#pointsCanvas');
    canvas.classList.toggle('is-hidden',state.layer!=='points');
    if (state.layer==='points') { svg.innerHTML=''; renderPoints(); return; }
    if (!A || state.layer==='evidence') { svg.innerHTML='';$('#emptyPlot').classList.toggle('is-hidden',state.layer==='evidence');return; }
    const isFamily=state.layer==='families';
    $('#vizTitle').textContent=isFamily?'Das evidências recorrentes às famílias candidatas.':'Explore os grupos de evidências da primeira etapa.';
    $('#vizSub').textContent=isFamily?'Cada nó reúne grupos HDBSCAN com representações centrais semelhantes.':'Cada nó reúne frases recorrentes. A cor identifica a família sugerida.';
    $('.axis-x').textContent='PROJEÇÃO · EXPLORATÓRIA';
    $('.axis-y').textContent=isFamily?'FAMÍLIAS CANDIDATAS':'GRUPOS HDBSCAN';
    const nodes=visibleNodes();
    if(!nodes.length){
      const title=!clusters.length?'Nenhum grupo recorrente foi encontrado.':isFamily?'Nenhuma família candidata está disponível para este conjunto.':'Nenhum grupo corresponde ao modelo selecionado.';
      const detail=!clusters.length?'Todas as evidências continuam disponíveis como observações sem grupo.':isFamily?'Pode haver poucos grupos para formar uma hierarquia. Abra a vista de grupos para inspecionar os resultados do HDBSCAN.':'Limpe o filtro de modelo ou escolha outra visualização.';
      $('#emptyPlot').innerHTML=`<div class="empty-symbol">✳</div><strong>${esc(title)}</strong><p>${esc(detail)}</p>`;
      $('#emptyPlot').classList.remove('is-hidden');svg.innerHTML='';return;
    }
    $('#emptyPlot').classList.add('is-hidden');
    const markup=nodes.map(node=>{
      const family=isFamily?node:familyMap.get(node.family_id);
      const color=family?(familyMap.get(family.family_id)?.color||'#c4ef70'):'#8490a4';
      const [x,y]=nodePosition(node);
      const size=isFamily?node.size_clusters:node.size;
      const radius=isFamily?Math.min(40,17+Math.sqrt(size)*3):Math.min(25,7+Math.sqrt(size)*1.7);
      const name=isFamily?node.automatic_name:node.label;
      const id=isFamily?node.family_id:node.cluster_id;
      const title=isFamily?`${node.automatic_name} · ${node.size_clusters} grupos`: `${node.label} · ${node.size} frases`;
      return `<g class="atlas-node" data-id="${esc(id)}" data-kind="${isFamily?'family':'cluster'}" tabindex="0" role="button" aria-label="${esc(title)}"><circle cx="${x}" cy="${y}" r="${radius+8}" fill="${color}" opacity=".055"/><circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" fill-opacity=".17" stroke="${color}" stroke-opacity=".75" stroke-width="1.1"/><circle cx="${x}" cy="${y}" r="3" fill="${color}"/><text x="${x}" y="${y+radius+15}" text-anchor="middle">${esc(name.length>25?name.slice(0,23)+'…':name)}</text></g>`;
    }).join('');
    svg.innerHTML=`<g class="map-guides"><ellipse cx="450" cy="280" rx="335" ry="180"/><ellipse cx="450" cy="280" rx="205" ry="112"/></g>${markup}`;
    const palette=families.slice(0,4).map((f,i)=>`<span class="legend-item"><i style="--c:${colors[i%colors.length]}"></i>${esc(f.automatic_name)}</span>`).join('');
    $('#legend').innerHTML=palette+(families.length>4?`<span class="legend-more">+ ${families.length-4} famílias</span>`:'');
    svg.querySelectorAll('.atlas-node').forEach(el=>{
      const choose=()=>selectNode(el.dataset.kind,el.dataset.id);
      el.addEventListener('click',choose);el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose();}});
      el.addEventListener('pointerenter',event=>showTip(el,event));el.addEventListener('pointermove',event=>moveTip(event));el.addEventListener('pointerleave',hideTip);
    });
  }
  function renderPoints() {
    const canvas=$('#pointsCanvas'), ctx=canvas.getContext('2d'), stage=$('.viz-stage');
    const rect=stage.getBoundingClientRect(), ratio=window.devicePixelRatio||1;
    canvas.width=Math.max(1,Math.round(rect.width*ratio));canvas.height=Math.max(1,Math.round(rect.height*ratio));
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,rect.width,rect.height);
    $('#vizTitle').textContent='Cada descrição no espaço semântico.';
    $('#vizSub').textContent='Cada ponto é uma frase de evidência. Arraste para girar e role para ampliar. Cada modelo tem uma projeção própria.';
    $('.axis-x').textContent='ARRASTE PARA GIRAR · ROLE PARA AMPLIAR';$('.axis-y').textContent='PROJEÇÃO POR MODELO · 3D';
    if(!A){$('#emptyPlot').innerHTML='<div class="empty-symbol">✳</div><strong>Execute a descoberta para criar a nuvem de evidências.</strong><p>A amostra contém respostas do modelo sem embeddings ou taxonomia calculados.</p>';$('#emptyPlot').classList.remove('is-hidden');$('#legend').innerHTML='';return;}
    const model=state.model==='all'?(modelNames[0]||''):state.model;
    const points=rows.filter(row=>row.model===model&&Array.isArray(row.coordinates_3d));
    if(!points.length){$('#emptyPlot').innerHTML='<div class="empty-symbol">✳</div><strong>Não há evidências projetadas para este modelo.</strong><p>Escolha outro modelo ou consulte a lista de evidências.</p>';$('#emptyPlot').classList.remove('is-hidden');$('#legend').innerHTML='';return;}
    $('#emptyPlot').classList.add('is-hidden');
    const colorFor=row=>{const cluster=clusterMap.get(row.cluster_id), family=cluster&&familyMap.get(cluster.family_id);return family?family.color:'#788394';};
    pointView.points=points.map(row=>({row,color:colorFor(row),xyz:row.coordinates_3d.map(value=>(value-.5)*2)}));
    drawPointScene(ctx,rect.width,rect.height);
    $('#legend').innerHTML=`<span class="legend-item"><i style="--c:#788394"></i>Sem grupo / sem família</span><span class="legend-more">${points.length.toLocaleString()} frases · ${esc(model)}</span>`;
    const nearest=event=>{
      const box=canvas.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top,bx=Math.floor(x/24),by=Math.floor(y/24);let best=null,dist=15*15;
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const item of pointView.bins.get(`${bx+dx},${by+dy}`)||[]){const d=(item.x-x)**2+(item.y-y)**2;if(d<dist){best=item.row;dist=d;}}
      return best;
    };
    canvas.onpointerdown=event=>{pointView.drag={x:event.clientX,y:event.clientY,yaw:pointView.yaw,pitch:pointView.pitch};pointView.dragged=false;canvas.style.cursor='grabbing';canvas.setPointerCapture(event.pointerId);};
    canvas.onpointermove=event=>{
      if(pointView.drag){const dx=event.clientX-pointView.drag.x,dy=event.clientY-pointView.drag.y;if(Math.abs(dx)+Math.abs(dy)>3)pointView.dragged=true;pointView.yaw=pointView.drag.yaw+dx*.008;pointView.pitch=Math.max(-1.1,Math.min(1.1,pointView.drag.pitch+dy*.006));drawPointScene(ctx,rect.width,rect.height);hideTip();return;}
      const hover=nearest(event);if(!hover){hideTip();canvas.style.cursor='grab';return;}canvas.style.cursor='pointer';const tip=$('#plotTip'),source=hover.occurrences?.[0]||{},time=Number.isFinite(source.start_seconds_nominal)?` · ~${source.start_seconds_nominal.toFixed(1)}s`:'';tip.innerHTML=`<b>${esc(hover.text)}</b><br><span>${esc(hover.model)} · ${esc(source.source_name||source.video_id||'origem não disponível')}${time} · ${esc(hover.occurrences?.length||0)} ocorrências</span>`;tip.style.display='block';moveTip(event);
    };
    canvas.onpointerup=()=>{pointView.drag=null;canvas.style.cursor='grab';};canvas.onpointercancel=()=>{pointView.drag=null;canvas.style.cursor='grab';};
    canvas.onpointerleave=()=>{if(!pointView.drag)hideTip();};
    canvas.onwheel=event=>{event.preventDefault();pointView.zoom=Math.max(.68,Math.min(2.2,pointView.zoom*Math.exp(-event.deltaY*.001)));drawPointScene(ctx,rect.width,rect.height);};
    canvas.onclick=event=>{if(pointView.dragged){pointView.dragged=false;return;}const hover=nearest(event);if(!hover)return;$('#inspectTitle').textContent='Evidência observável';$('#inspectCopy').textContent=hover.text;const source=hover.occurrences?.[0]||{},time=Number.isFinite(source.start_seconds_nominal)?` · ~${source.start_seconds_nominal.toFixed(1)}s`:'';$('#observationList').innerHTML=`<article class="observation"><p>${esc(hover.text)}</p><small>${esc(source.source_name||source.video_id||'Vídeo de origem')}${time} · ${esc(source.anomaly_prediction===1?'Modelo indicou anomalia':source.anomaly_prediction===0?'Modelo não indicou anomalia':'Previsão indisponível')}</small></article>`;};
  }
  function drawPointScene(ctx,width,height){
    const cy=Math.cos(pointView.yaw),sy=Math.sin(pointView.yaw),cp=Math.cos(pointView.pitch),sp=Math.sin(pointView.pitch),f=Math.min(width,height)*.82*pointView.zoom,cx=width/2,midY=height*.49;
    const project=(x,y,z)=>{const rx=x*cy+z*sy,rz=-x*sy+z*cy,ry=y*cp-rz*sp,depth=3.2-(y*sp+rz*cp);return {x:cx+rx*f/depth,y:midY-ry*f/depth,depth};};
    ctx.clearRect(0,0,width,height);ctx.save();ctx.lineWidth=1;ctx.strokeStyle='rgba(151,168,181,.10)';
    for(const radius of [.48,.92,1.34]){ctx.beginPath();for(let index=0;index<=100;index++){const angle=index/100*Math.PI*2,p=project(Math.cos(angle)*radius,-.92,Math.sin(angle)*radius);if(index===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();}
    for(let index=0;index<16;index++){const angle=index/16*Math.PI*2,a=project(Math.cos(angle)*.48,-.92,Math.sin(angle)*.48),b=project(Math.cos(angle)*1.34,-.92,Math.sin(angle)*1.34);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    const sorted=pointView.points.map(point=>({...point,...project(...point.xyz)})).filter(point=>point.depth>.2).sort((a,b)=>b.depth-a.depth);pointView.projected=sorted;pointView.bins=new Map();
    for(const point of sorted){const x=Math.floor(point.x/24),y=Math.floor(point.y/24),key=`${x},${y}`;if(!pointView.bins.has(key))pointView.bins.set(key,[]);pointView.bins.get(key).push(point);}
    for(const point of sorted){const size=Math.max(1.1,Math.min(4.2,3.2/point.depth)),alpha=point.row.cluster_id?.8:.28;ctx.globalAlpha=alpha;ctx.fillStyle=point.color;ctx.beginPath();ctx.arc(point.x,point.y,size,0,Math.PI*2);ctx.fill();}
    ctx.restore();ctx.globalAlpha=1;
  }
  function showTip(element,event) {
    const node=element.dataset.kind==='family'?familyMap.get(element.dataset.id):clusterMap.get(element.dataset.id);
    if(!node)return;
    const title=element.dataset.kind==='family'?node.automatic_name:node.label;
    const count=element.dataset.kind==='family'?`${node.size_clusters} grupos · ${node.size_evidence} frases`:`${node.size} frases únicas · ${node.model}`;
    const tip=$('#plotTip');tip.innerHTML=`<b>${esc(title)}</b><br><span>${esc(count)}</span>`;tip.style.display='block';moveTip(event);
  }
  function moveTip(event) {const stage=$('.viz-stage').getBoundingClientRect();const tip=$('#plotTip');tip.style.left=`${Math.min(stage.width-245,event.clientX-stage.left+12)}px`;tip.style.top=`${Math.max(6,event.clientY-stage.top+12)}px`;}
  function hideTip(){ $('#plotTip').style.display='none'; }
  function selectNode(kind,id) {
    if(kind==='family'){
      const family=familyMap.get(id);state.family=id;state.layer='clusters';state.cluster=null;
      document.querySelectorAll('.view-switch button').forEach(button=>button.classList.toggle('active',button.dataset.layer==='clusters'));
      $('#inspectTitle').textContent=family.automatic_name;
      $('#inspectCopy').textContent=`Família candidata automática com ${family.size_clusters} grupos HDBSCAN e ${family.size_evidence} frases únicas. Nome sugerido automaticamente, sem validação humana.`;
    } else {
      const cluster=clusterMap.get(id);state.cluster=id;state.family=cluster.family_id;
      $('#inspectTitle').textContent=cluster.label;
      $('#inspectCopy').textContent=`${cluster.size} frases únicas de ${cluster.model}. Família: ${familyMap.get(cluster.family_id)?.automatic_name||'Não atribuída'}. São descrições do modelo, não eventos verificados.`;
      const examples=(cluster.representative_evidence||[]).slice(0,2).map(text=>`“${text}”`).join(' · ');
      if(examples)$('#inspectCopy').textContent+=` Exemplos: ${examples}`;
    }
    renderPlot();
  }
  const nav={overview:['Visão geral','Um guia para explorar<br><em>o que a câmera registra.</em>','Explore evidências visuais recorrentes, das observações individuais a uma taxonomia resumida.'],clusters:['Grupos semânticos','Padrões que começam<br><em>a tomar forma.</em>','Explore os grupos de frases semelhantes identificados nas evidências.'],evidence:['Biblioteca de evidências','Cada observação,<br><em>com sua origem.</em>','Consulte as evidências geradas e rastreie cada descrição até o vídeo e a previsão.']};
  function setView(name) {
    const [crumb,title,lede]=nav[name]||nav.overview;
    $('#crumbTitle').textContent=crumb;$('#pageTitle').innerHTML=title;$('#pageLede').textContent=lede;
    document.querySelectorAll('.rail-item').forEach(button=>button.classList.toggle('selected',button.dataset.view===name));
    const evidence=name==='evidence';
    if(evidence){state.layer='evidence';document.querySelectorAll('.view-switch button').forEach(button=>button.classList.toggle('active',button.dataset.layer==='evidence'));}
    else if(name==='clusters'){state.layer='clusters';document.querySelectorAll('.view-switch button').forEach(button=>button.classList.toggle('active',button.dataset.layer==='clusters'));}
    else if(name==='overview'){state.layer=initialLayer;state.family=null;state.cluster=null;document.querySelectorAll('.view-switch button').forEach(button=>button.classList.toggle('active',button.dataset.layer===initialLayer));}
    $('#evidenceBrowser').classList.toggle('is-hidden',!evidence);
    document.querySelectorAll('.axis,.plot-watermark').forEach(el=>el.classList.toggle('is-hidden',evidence));
    if(!A){$('#inspectTitle').innerHTML=evidence?'Evidências da<br>execução original.':name==='clusters'?'A descoberta ainda<br>não foi executada.':'Uma amostra<br>de observações.';$('#inspectCopy').textContent=evidence?'A amostra preserva as previsões do modelo e os identificadores dos vídeos.':name==='clusters'?'Execute a descoberta semântica para criar os grupos e as famílias candidatas.':'Esta demonstração apresenta respostas arquivadas do InternVL.';}
    renderPlot();renderFacts();renderRecent();
  }
  document.querySelectorAll('.rail-item').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
  document.querySelectorAll('.view-switch button').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('.view-switch button').forEach(item=>item.classList.toggle('active',item===button));
    state.layer=button.dataset.layer;state.family=null;state.cluster=null;
    if(state.layer==='points'&&state.model==='all'&&modelNames.length){state.model=modelNames[0];$('#modelFilter').value=state.model;}
    const evidence=state.layer==='evidence';$('#evidenceBrowser').classList.toggle('is-hidden',!evidence);
    document.querySelectorAll('.axis,.plot-watermark').forEach(el=>el.classList.toggle('is-hidden',evidence));
    if(evidence){$('#crumbTitle').textContent='Biblioteca de evidências';$('#pageTitle').innerHTML=nav.evidence[1];$('#pageLede').textContent=nav.evidence[2];}
    renderPlot();renderFacts();
  }));
  $('#allEvidence').addEventListener('click',()=>setView('evidence'));
  $('#evidenceSearch').addEventListener('input',event=>{state.query=event.target.value;renderFacts();});
  $('#modelFilter').addEventListener('change',event=>{state.model=event.target.value;renderPlot();renderFacts();renderRecent();renderPredictionCounts();});
  window.addEventListener('resize',()=>{if(state.layer==='points')renderPoints();});
  $('#resetView').addEventListener('click',()=>{state.family=null;state.cluster=null;state.query='';state.model='all';pointView.yaw=.55;pointView.pitch=.28;pointView.zoom=1;$('#evidenceSearch').value='';$('#modelFilter').value='all';setView('overview');});
  $('#exportBtn').addEventListener('click',()=>{
    const content=rows.map(row=>JSON.stringify(A?{model:row.model,text:row.text,occurrences:row.occurrences}:row)).join('\n')+'\n';
    const blob=new Blob([content],{type:'application/x-ndjson'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=A?'observable-evidence.jsonl':'observable-evidence-sample.jsonl';link.click();URL.revokeObjectURL(link.href);
  });
  renderPlot();renderFacts();renderRecent();renderPredictionCounts();
  if(!A){$('#vizTitle').textContent='Seu mapa de evidências começa aqui.';$('#vizSub').textContent='Os exemplos são respostas do modelo; esta prévia ainda não tem embeddings ou taxonomia calculados.';}
})();
