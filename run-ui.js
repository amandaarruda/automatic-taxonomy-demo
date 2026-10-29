(() => {
  const launch = document.querySelector('#launchRun');
  const modal = document.querySelector('#runModal');
  const form = document.querySelector('#runForm');
  const status = document.querySelector('#runProgress');
  const submit = document.querySelector('#submitRun');
  const fileInput = form.querySelector('input[type=file]');
  let activeRun = false;
  // Uma página hospedada é apenas uma demonstração. Somente o aplicativo
  // servido em loopback pode aceitar vídeos e chamar o endpoint local.
  const localApp = ['http:', 'https:'].includes(location.protocol) &&
    ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname);

  if (!localApp) {
    launch.innerHTML = '<span>＋</span> Usar meus vídeos';
    launch.title = 'Saiba como executar o produto localmente';
    document.querySelector('.local-tag').innerHTML = '<i></i> DEMONSTRAÇÃO';
    document.querySelector('.rail-bottom span:nth-child(2)').textContent = 'Prévia da demonstração';
    document.querySelector('.inspect-bottom span:last-child').textContent = 'Para seus vídeos, execute o aplicativo localmente.';
    form.querySelectorAll('.form-label, .form-grid, .form-note, .form-actions').forEach(el => el.hidden = true);
    document.querySelector('#runModalTitle').textContent = 'Analise seus vídeos localmente.';
    document.querySelector('.modal-lede').textContent = 'Esta página é uma demonstração apenas para consulta. Para analisar vídeos, instale o produto e execute o modelo e o aplicativo no seu próprio computador.';
    launch.addEventListener('click', () => {
      modal.classList.remove('is-hidden');
      status.classList.remove('is-hidden');
      status.textContent = 'Inicie o aplicativo com evidence-atlas-serve e acesse http://127.0.0.1:8765. Seus vídeos não são enviados por esta demonstração.';
    });
  } else {
    launch.addEventListener('click', () => modal.classList.remove('is-hidden'));
  }
  document.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', () => modal.classList.add('is-hidden')));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !activeRun) modal.classList.add('is-hidden'); });
  fileInput.addEventListener('change', () => {
    const files = [...fileInput.files];
    const total = files.reduce((size,file)=>size+file.size,0);
    document.querySelector('#fileSummary').textContent = files.length
      ? `${files.length} vídeo${files.length===1?'':'s'} · ${(total/1024**3).toFixed(2)} GB selecionados`
      : 'Selecione um ou mais vídeos deste computador.';
  });

  async function poll(runId) {
    activeRun = true; submit.disabled = true; launch.disabled = true;
    status.classList.remove('is-hidden','error','success');
    status.textContent = 'Preparando a análise local…';
    const started = Date.now();
    while (true) {
      await new Promise(resolve => setTimeout(resolve,1500));
      try {
        const response = await fetch(`/api/runs/${encodeURIComponent(runId)}`,{cache:'no-store'});
        if (!response.ok) throw new Error(`O servidor retornou ${response.status}`);
        const job = await response.json();
        if(job.stage==='extracting') {
          const count=job.current||0,total=job.total||job.video_count||0;
          status.innerHTML=`Analisando vídeo ${count} de ${total}<small>${escapeText(job.video||'')} · ${job.complete||0} concluído(s) · ${job.failed||0} com falha</small>`;
        } else if(job.stage==='discovering taxonomy') {
          status.innerHTML='Gerando embeddings, grupos e taxonomia…<small>Esta etapa é local e pode levar alguns minutos.</small>';
        } else if(job.status==='queued'||job.stage==='loading model') {
          status.innerHTML=`Preparando a execução…<small>Tempo decorrido: ${(Date.now()-started)/1000|0}s</small>`;
        } else if(job.status==='complete') {
          status.classList.add('success');
          status.textContent=`Atlas pronto · ${job.evidence_count} evidências · ${job.cluster_count} grupos · ${job.family_count} famílias candidatas`;
          location.assign(job.atlas_url); return;
        } else if(job.status==='failed') {
          status.classList.add('error');
          status.innerHTML=`Análise interrompida. Detalhe técnico: ${escapeText(job.error||'erro desconhecido')}<small>Os arquivos e resultados concluídos permanecem na pasta local da análise.</small>`;
          activeRun=false;submit.disabled=false;launch.disabled=false;return;
        }
      } catch(error) {
        status.classList.add('error');status.textContent=`Não foi possível consultar o andamento: ${error.message}`;
        activeRun=false;submit.disabled=false;launch.disabled=false;return;
      }
    }
  }
  const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if(!localApp){status.classList.remove('is-hidden');return;}
    const files=[...fileInput.files];
    if(!files.length){status.classList.remove('is-hidden','error');status.classList.add('error');status.textContent='Escolha pelo menos um vídeo.';return;}
    submit.disabled=true;launch.disabled=true;activeRun=true;
    status.classList.remove('is-hidden','error','success');status.textContent=`Copiando ${files.length} vídeo${files.length===1?'':'s'} para esta execução local…`;
    try {
      const response=await fetch('/api/runs',{method:'POST',body:new FormData(form)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.detail||`O servidor retornou ${response.status}`);
      await poll(data.run_id);
    } catch(error) {
      activeRun=false;submit.disabled=false;launch.disabled=false;
      status.classList.add('error');status.textContent=`Não foi possível iniciar a análise: ${error.message}`;
    }
  });
})();
