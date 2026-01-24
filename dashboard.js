async function fetchRegistry(url){
  const res = await fetch(url, {cache: 'no-store'});
  if(!res.ok) throw new Error('No se pudo cargar registry');
  return res.json();
}

function renderAppItem(app, onToggle){
  const el = document.createElement('div');
  el.className = 'app';

  const expired = app.expirationDate && new Date(app.expirationDate) < new Date();
  if(expired) el.classList.add('expired');

  const top = document.createElement('div');
  top.className = 'app-top';

  const left = document.createElement('div');
  left.innerHTML = `
    <div class="name">${app.name}</div>
    <div class="app-id">ID: ${app.id}</div>
  `;

  const status = document.createElement('div');
  status.className = 'status-badge ' + (app.enabled ? 'status-blocked' : 'status-active');
  status.textContent = app.enabled ? 'BLOQUEADO' : 'ACTIVO';

  top.appendChild(left);
  top.appendChild(status);

  const dates = document.createElement('div');
  dates.className = 'dates';
  dates.innerHTML = `
    <div class="date-box">Inicio: ${app.startDate || '—'}</div>
    <div class="date-box">Vence: ${app.expirationDate || '—'}</div>
  `;

  const actions = document.createElement('div');
  actions.className = 'actions';

  const btnWA = document.createElement('a');
  btnWA.className = 'btn ghost';
  btnWA.href = app.whatsapp || '#';
  btnWA.target = '_blank';
  btnWA.textContent = 'WhatsApp';

  const btnToggle = document.createElement('button');
  btnToggle.className = 'btn primary';
  btnToggle.textContent = app.enabled ? 'Desbloquear' : 'Bloquear';
  btnToggle.addEventListener('click', ()=> onToggle(app.id));

  actions.appendChild(btnWA);
  actions.appendChild(btnToggle);

  el.appendChild(top);
  el.appendChild(dates);
  el.appendChild(actions);

  return el;
}

function updateJsonArea(data){
  const ta = document.getElementById('json-srv');
  ta.value = JSON.stringify(data, null, 2);
}

function enableDownloadButton(data){
  const btn = document.getElementById('download-json');
  btn.onclick = ()=>{
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'apps.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  document.getElementById('copy-json').onclick = async ()=>{
    try{ await navigator.clipboard.writeText(JSON.stringify(data, null, 2)); alert('JSON copiado'); }catch(e){ alert('No se pudo copiar'); }
  };
}

async function init(){
  const registryUrl = './data/apps.json';
  let data = { apps: [] };
  try{ data = await fetchRegistry(registryUrl); }catch(e){ console.warn(e); }

  const list = document.getElementById('apps-list'); list.innerHTML = '';
  const map = new Map();
  (data.apps || []).forEach(a => map.set(a.id, a));

  // Editor elements
  const selApp = document.getElementById('edit-app-id');
  const btnAdd = document.getElementById('add-app');
  const btnRemove = document.getElementById('remove-app');
  const inName = document.getElementById('edit-name');
  const inWA = document.getElementById('edit-whatsapp');
  const inMsg = document.getElementById('edit-message');
  const inStart = document.getElementById('edit-startDate');
  const inExp = document.getElementById('edit-expirationDate');
  const inEnabled = document.getElementById('edit-enabled');
  const btnSave = document.getElementById('save-app');
  const btnCancel = document.getElementById('cancel-edit');

  function getData(){ return { apps: Array.from(map.values()) }; }

  function populateSelect(){
    selApp.innerHTML = '<option value="">-- seleccionar --</option>';
    Array.from(map.values()).forEach(a=>{
      const o = document.createElement('option'); o.value = a.id; o.textContent = a.name || a.id;
      selApp.appendChild(o);
    });
  }

  function clearEditor(){
    selApp.value = '';
    inName.value = '';
    inWA.value = '';
    inMsg.value = '';
    inStart.value = '';
    inExp.value = '';
    inEnabled.checked = false;
  }

  function loadSelected(){
    const id = selApp.value; if(!id){ clearEditor(); return; }
    const a = map.get(id); if(!a) return;
    inName.value = a.name || '';
    inWA.value = a.whatsapp || '';
    inMsg.value = a.message || '';
    inStart.value = a.startDate || '';
    inExp.value = a.expirationDate || '';
    inEnabled.checked = !!a.enabled;
  }

  btnAdd.addEventListener('click', ()=>{
    const id = prompt('Id para la nueva app (sin espacios):', 'app-'+Date.now());
    if(!id) return;
    if(map.has(id)){ alert('Id ya existe'); return; }
    const newApp = { id, name:id, whatsapp:'', enabled:false, message:'', startDate:'', expirationDate:'' };
    map.set(id, newApp);
    populateSelect();
    selApp.value = id; loadSelected(); renderAll(); updateJsonArea(getData()); enableDownloadButton(getData);
  });

  btnRemove.addEventListener('click', ()=>{
    const id = selApp.value; if(!id) { alert('Seleccione una app'); return; }
    if(!confirm('Eliminar app "'+id+'"?')) return;
    map.delete(id);
    populateSelect(); clearEditor(); renderAll(); updateJsonArea(getData()); enableDownloadButton(getData);
  });

  selApp.addEventListener('change', loadSelected);

  btnSave.addEventListener('click', ()=>{
    const id = selApp.value; if(!id){ alert('Seleccione una app para guardar'); return; }
    const a = map.get(id) || { id };
    a.name = inName.value || id;
    a.whatsapp = inWA.value || '';
    a.message = inMsg.value || '';
    a.startDate = inStart.value || '';
    a.expirationDate = inExp.value || '';
    a.enabled = !!inEnabled.checked;
    map.set(id, a);
    populateSelect(); selApp.value = id; renderAll(); updateJsonArea(getData()); enableDownloadButton(getData);
    alert('Guardado');
  });

  btnCancel.addEventListener('click', ()=>{ loadSelected(); });

  const onToggle = (id)=>{
    const app = map.get(id);
    if(!app) return;
    app.enabled = !app.enabled;
    renderAll();
    updateJsonArea(getData());
  };

  function renderAll(){
    list.innerHTML = '';
    (Array.from(map.values())).forEach(app => list.appendChild(renderAppItem(app, onToggle)));
  }

  renderAll();
  populateSelect();
  updateJsonArea(getData());
  enableDownloadButton(getData);
  // enable push-to-github button (client-side). Requires user PAT with repo permissions.
  function toBase64(str){ try{ return btoa(unescape(encodeURIComponent(str))); }catch(e){ return btoa(str); } }
  function createPushModal(){
    const backdrop = document.createElement('div'); backdrop.className = 'gh-modal-backdrop';
    const modal = document.createElement('div'); modal.className = 'gh-modal';
    modal.innerHTML = `
      <h3>Push apps.json a GitHub</h3>
      <label>Owner/Repo (ej: user/repo)</label>
      <input id="gh-repo" type="text" placeholder="usuario/repositorio">
      <div class="row">
        <div style="flex:1">
          <label>Branch</label>
          <input id="gh-branch" type="text" placeholder="main">
        </div>
        <div style="flex:1">
          <label>Ruta del archivo</label>
          <input id="gh-path" type="text" placeholder="data/apps.json">
        </div>
      </div>
      <label>Personal Access Token (scope: repo)</label>
      <input id="gh-token" type="password" placeholder="ghp_...">
      <div class="note">Aviso: el token se usa solo desde tu navegador para hacer el commit. No lo guardamos.</div>
      <div class="actions">
        <button id="gh-cancel" class="btn">Cancelar</button>
        <button id="gh-push" class="btn primary">Subir y crear commit</button>
      </div>
    `;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    return backdrop;
  }

  async function pushToGitHub({owner, repo, branch='main', path='data/apps.json', token, content}){
    const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    try{
      // get existing file to obtain sha (if exists)
      const getUrl = apiBase + (branch ? `?ref=${encodeURIComponent(branch)}` : '');
      let sha = null;
      const g = await fetch(getUrl, { headers: { Authorization: 'token '+token, Accept: 'application/vnd.github.v3+json' } });
      if(g.ok){ const gj = await g.json(); sha = gj.sha; }
      const body = { message: 'Update apps.json via dashboard', content: toBase64(content), branch };
      if(sha) body.sha = sha;
      const putRes = await fetch(apiBase, { method:'PUT', headers: { Authorization: 'token '+token, Accept: 'application/vnd.github.v3+json', 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      if(!putRes.ok){ const err = await putRes.json().catch(()=>null); throw new Error('GitHub API error: '+(err && err.message ? err.message : putRes.status)); }
      return await putRes.json();
    }catch(e){ throw e; }
  }

  function enablePushButton(getData){
    const btn = document.getElementById('push-json');
    btn.addEventListener('click', ()=>{
      const modal = createPushModal();
      modal.querySelector('#gh-cancel').addEventListener('click', ()=>{ modal.remove(); });
      modal.querySelector('#gh-push').addEventListener('click', async ()=>{
        const repo = modal.querySelector('#gh-repo').value.trim();
        const branch = modal.querySelector('#gh-branch').value.trim() || 'main';
        const path = modal.querySelector('#gh-path').value.trim() || 'data/apps.json';
        const token = modal.querySelector('#gh-token').value.trim();
        if(!repo || !token){ alert('Repo y token son requeridos'); return; }
        const [owner, rname] = repo.split('/'); if(!owner || !rname){ alert('Formato owner/repo inválido'); return; }
        const dataStr = JSON.stringify(getData(), null, 2);
        try{
          modal.querySelector('#gh-push').textContent = 'Subiendo...';
          await pushToGitHub({ owner, repo: rname, branch, path, token, content: dataStr });
          alert('apps.json subido correctamente');
          modal.remove();
        }catch(err){ alert('Error al subir: '+err.message); modal.querySelector('#gh-push').textContent = 'Subir y crear commit'; }
      });
    });
  }

  enablePushButton(getData);
}

document.addEventListener('DOMContentLoaded', init);
