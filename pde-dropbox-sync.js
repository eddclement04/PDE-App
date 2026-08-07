// PDE Dropbox sync for one shared App Folder data file + topbar status + automatic backups
(function(){
  const DBX_APP_KEY = 'ovh91cidwdhh7i3';
  const REDIRECT_URI = 'https://eddclement04.github.io/PDE-App/';
  const PDE_DATA_KEY = 'pde_project_invoice_app_v1';
  const DBX_AUTH_KEY = 'pde_dropbox_auth_v1';
  const DBX_VERIFIER_KEY = 'pde_dropbox_pkce_v1';
  const DBX_LAST_SYNC_KEY = 'pde_dropbox_last_sync_v1';
  const DBX_LAST_ACTION_KEY = 'pde_dropbox_last_action_v1';
  const DBX_LAST_BACKUP_KEY = 'pde_dropbox_last_backup_v1';
  const DBX_AUTO_BACKUP_KEY = 'pde_dropbox_auto_backup_enabled_v1';
  const DBX_LAST_BACKUP_SIGNATURE_KEY = 'pde_dropbox_last_backup_signature_v1';
  const DBX_FILE_PATH = '/pde-data.json';
  const DBX_DISPLAY_PATH = '/Apps/PDE-App/pde-data.json';
  const DBX_BACKUP_FOLDER = '/backups';
  const DBX_SCOPES = 'account_info.read files.content.read files.content.write';
  const AUTO_SAVE_DELAY_MS = 7000;
  const BACKUP_INTERVAL_MS = 30 * 60 * 1000;

  let autoSaveTimer = null;
  let backupInProgress = false;
  let localDataSignature = '';

  function $(id){ return document.getElementById(id); }
  function readAppData(){ try{return JSON.parse(localStorage.getItem(PDE_DATA_KEY)) || {}}catch(e){return {}} }
  function writeAppData(data){ localStorage.setItem(PDE_DATA_KEY, JSON.stringify(data)); }
  function auth(){ try{return JSON.parse(localStorage.getItem(DBX_AUTH_KEY)) || null}catch(e){return null} }
  function saveAuth(data){ localStorage.setItem(DBX_AUTH_KEY, JSON.stringify(data)); }
  function lastSync(){ return localStorage.getItem(DBX_LAST_SYNC_KEY) || ''; }
  function lastAction(){ return localStorage.getItem(DBX_LAST_ACTION_KEY) || ''; }
  function lastBackup(){ return localStorage.getItem(DBX_LAST_BACKUP_KEY) || ''; }
  function autoBackupEnabled(){ return localStorage.getItem(DBX_AUTO_BACKUP_KEY) !== 'false'; }
  function setAutoBackupEnabled(value){ localStorage.setItem(DBX_AUTO_BACKUP_KEY, value ? 'true' : 'false'); updateAutoBackupUi(); updateTopStatus(); }
  function setLastSync(action){ localStorage.setItem(DBX_LAST_SYNC_KEY, new Date().toISOString()); localStorage.setItem(DBX_LAST_ACTION_KEY, action || 'Synced'); updateTopStatus(); }
  function setLastBackup(action){ localStorage.setItem(DBX_LAST_BACKUP_KEY, new Date().toISOString()); localStorage.setItem(DBX_LAST_ACTION_KEY, action || 'Backed up'); updateAutoBackupUi(); updateTopStatus(); }

  function cleanDataForSignature(data){
    const copy = JSON.parse(JSON.stringify(data || {}));
    delete copy._dropboxSavedAt;
    delete copy._dropboxBackupCreatedAt;
    delete copy._dropboxBackupReason;
    return copy;
  }

  function dataSignature(data){
    try{return JSON.stringify(cleanDataForSignature(data));}catch(e){return ''}
  }

  function timeText(iso){
    if(!iso) return 'Not yet';
    try{return new Date(iso).toLocaleString();}catch(e){return iso}
  }

  function stamp(){
    const d = new Date();
    const pad = n => String(n).padStart(2,'0');
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'-'+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds());
  }

  function clearAuth(){
    localStorage.removeItem(DBX_AUTH_KEY);
    localStorage.removeItem(DBX_VERIFIER_KEY);
    setStatus('Dropbox disconnected.');
    updateButtons();
    updateTopStatus();
  }

  function setStatus(text){
    const el=$('dropboxStatus');
    if(el) el.textContent=text;
    updateTopStatus(text);
  }

  function syncText(){
    const connected = !!auth();
    const stampValue = lastSync();
    const backupStamp = lastBackup();
    if(!connected) return {label:'Dropbox: Not connected',detail:'Click to open Dropbox Sync settings.',state:'off'};
    if(stampValue){
      const action = lastAction() || 'Synced';
      const backupText = backupStamp ? ' Backup: '+timeText(backupStamp) : '';
      return {label:'Dropbox: Synced',detail:action+' '+timeText(stampValue)+backupText,state:'on'};
    }
    return {label:'Dropbox: Connected',detail:'Connected. Save, load, or backup data from Dropbox.',state:'on'};
  }

  function injectTopStatus(){
    if($('dropboxTopStatusBtn')) return;
    const actions = document.querySelector('.topbar-actions');
    if(!actions) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'dropboxTopStatusBtn';
    btn.className = 'btn secondary dropbox-status-btn';
    btn.onclick = function(){
      const nav = document.querySelector('.nav-btn[data-view="settings"]');
      if(nav) nav.click();
      setTimeout(function(){ const panel=$('dropboxSyncPanel'); if(panel) panel.scrollIntoView({behavior:'smooth',block:'start'}); },150);
    };
    actions.insertBefore(btn, actions.firstChild);

    if(!$('dropboxStatusStyle')){
      const style = document.createElement('style');
      style.id = 'dropboxStatusStyle';
      style.textContent = '.dropbox-status-btn{display:inline-flex;align-items:center;gap:8px}.dropbox-status-btn:before{content:"";width:9px;height:9px;border-radius:50%;background:#94a3b8;display:inline-block}.dropbox-status-btn.is-on:before{background:#16a34a}.dropbox-status-btn.is-working:before{background:#f59e0b}.dropbox-status-btn.is-off:before{background:#94a3b8}.dropbox-status-btn small{display:block;font-size:10px;font-weight:800;text-transform:none;letter-spacing:0;color:inherit;opacity:.75;margin-top:2px}.auto-backup-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:14px}.auto-backup-switch{display:inline-flex;align-items:center;gap:10px;font-weight:900;color:#17213a}.auto-backup-switch input{width:auto}.backup-status-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-top:14px}.backup-status-card{border:1px solid #e6ebf4;border-radius:14px;background:#f8fbff;padding:12px}.backup-status-card strong{display:block;color:#111a33;margin-bottom:4px}.backup-status-card span{font-size:12px;color:#6d7890}@media(max-width:760px){.dropbox-status-btn{width:100%;justify-content:center}.auto-backup-row{display:grid}.auto-backup-row .btn{width:100%}}';
      document.head.appendChild(style);
    }
    updateTopStatus();
  }

  function updateTopStatus(override){
    const btn = $('dropboxTopStatusBtn');
    if(!btn) return;
    const info = syncText();
    let detail = override || info.detail;
    if(detail && detail.length > 55) detail = detail.slice(0,52)+'...';
    btn.classList.remove('is-on','is-off','is-working');
    btn.classList.add(override && /saving|loading|connecting|backup/i.test(override) ? 'is-working' : 'is-'+info.state);
    btn.innerHTML = '<span>'+info.label+'<small>'+detail+'</small></span>';
    btn.title = override || info.detail;
  }

  function friendlyDropboxError(err){
    const msg = String(err && err.message ? err.message : err || '');
    if(msg.includes('missing_scope')){
      localStorage.removeItem(DBX_AUTH_KEY);
      localStorage.removeItem(DBX_VERIFIER_KEY);
      updateButtons();
      updateTopStatus('Reconnect needed. Missing Dropbox permission.');
      return 'Dropbox needs a new permission approval. Click Connect Dropbox again, approve access, then retry Save or Load.';
    }
    if(msg.includes('expired_access_token') || msg.includes('invalid_access_token')){
      localStorage.removeItem(DBX_AUTH_KEY);
      updateButtons();
      updateTopStatus('Reconnect needed. Dropbox token expired.');
      return 'Dropbox connection expired. Click Connect Dropbox again.';
    }
    return msg || 'Dropbox action failed.';
  }

  function b64url(bytes){
    let s=''; bytes.forEach(b=>s+=String.fromCharCode(b));
    return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  async function sha256(text){
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return b64url(new Uint8Array(hash));
  }

  function makeVerifier(){ const a=new Uint8Array(64); crypto.getRandomValues(a); return b64url(a); }

  async function connectDropbox(){
    clearAuth();
    setStatus('Connecting to Dropbox...');
    const verifier = makeVerifier();
    localStorage.setItem(DBX_VERIFIER_KEY, verifier);
    const challenge = await sha256(verifier);
    const url = new URL('https://www.dropbox.com/oauth2/authorize');
    url.searchParams.set('client_id', DBX_APP_KEY);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('token_access_type', 'offline');
    url.searchParams.set('scope', DBX_SCOPES);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    location.href = url.toString();
  }

  async function finishConnect(code){
    const verifier = localStorage.getItem(DBX_VERIFIER_KEY);
    if(!verifier) throw new Error('Missing Dropbox verifier. Click Connect Dropbox again.');
    const body = new URLSearchParams();
    body.set('code', code);
    body.set('grant_type', 'authorization_code');
    body.set('client_id', DBX_APP_KEY);
    body.set('redirect_uri', REDIRECT_URI);
    body.set('code_verifier', verifier);
    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body});
    if(!res.ok) throw new Error(await res.text());
    const data = await res.json();
    data.saved_at = Date.now();
    data.expires_at = Date.now() + Number(data.expires_in || 14400) * 1000 - 60000;
    saveAuth(data);
    localStorage.removeItem(DBX_VERIFIER_KEY);
    history.replaceState({}, document.title, REDIRECT_URI);
    setStatus('Dropbox connected. Auto Backup is on. Use Save To Dropbox, Load From Dropbox, or Backup Now.');
    updateButtons();
    updateTopStatus();
  }

  async function bearer(){
    let data = auth();
    if(!data || !data.access_token) throw new Error('Dropbox is not connected.');
    if(data.expires_at && Date.now() > data.expires_at && data.refresh_token){
      const body = new URLSearchParams();
      body.set('grant_type','refresh_token');
      body.set('refresh_token',data.refresh_token);
      body.set('client_id',DBX_APP_KEY);
      const res = await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
      if(!res.ok) throw new Error(await res.text());
      const fresh = await res.json();
      data = {...data,...fresh,saved_at:Date.now(),expires_at:Date.now()+Number(fresh.expires_in||14400)*1000-60000};
      saveAuth(data);
    }
    return data.access_token;
  }

  async function uploadText(path, text){
    const token = await bearer();
    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method:'POST',
      headers:{
        'Authorization':'Bearer '+token,
        'Content-Type':'application/octet-stream',
        'Dropbox-API-Arg':JSON.stringify({path, mode:'overwrite', autorename:false, mute:true, strict_conflict:false})
      },
      body:text
    });
    if(!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function downloadText(path){
    const token = await bearer();
    const res = await fetch('https://content.dropboxapi.com/2/files/download', {
      method:'POST',
      headers:{'Authorization':'Bearer '+token, 'Dropbox-API-Arg':JSON.stringify({path})}
    });
    if(res.status === 409) return null;
    if(!res.ok) throw new Error(await res.text());
    return res.text();
  }

  async function saveToDropbox(options={}){
    try{
      if(!auth()) throw new Error('Dropbox is not connected.');
      setStatus(options.silent ? 'Auto-saving PDE data to Dropbox...' : 'Saving PDE data to Dropbox...');
      const data = readAppData();
      data._dropboxSavedAt = new Date().toISOString();
      await uploadText(DBX_FILE_PATH, JSON.stringify(data,null,2));
      localDataSignature = dataSignature(data);
      setLastSync(options.action || (options.silent ? 'Auto saved to Dropbox' : 'Saved to Dropbox'));
      setStatus((options.silent ? 'Auto-saved to Dropbox: ' : 'Saved to Dropbox: ') + DBX_DISPLAY_PATH);
    }catch(err){ const msg=friendlyDropboxError(err); setStatus(msg); if(!options.silent) alert(msg); }
  }

  async function createVersionedBackup(reason='backup', sourceData=null, options={}){
    if(backupInProgress && !options.force) return false;
    if(!auth()){
      if(!options.silent) alert('Dropbox is not connected.');
      return false;
    }
    try{
      backupInProgress = true;
      setStatus('Creating Dropbox backup...');
      const data = sourceData ? JSON.parse(JSON.stringify(sourceData)) : readAppData();
      data._dropboxBackupCreatedAt = new Date().toISOString();
      data._dropboxBackupReason = reason;
      const path = DBX_BACKUP_FOLDER + '/pde-backup-' + stamp() + '-' + String(reason).replace(/[^a-z0-9-]+/gi,'-').toLowerCase() + '.json';
      await uploadText(path, JSON.stringify(data,null,2));
      const sig = dataSignature(data);
      localStorage.setItem(DBX_LAST_BACKUP_SIGNATURE_KEY, sig);
      setLastBackup('Backup created');
      setStatus('Backup created in Dropbox: /Apps/PDE-App' + path);
      return true;
    }catch(err){ const msg=friendlyDropboxError(err); setStatus(msg); if(!options.silent) alert(msg); return false; }
    finally{ backupInProgress = false; }
  }

  function scheduleAutoSave(reason='Auto saved after change'){
    if(!auth() || !autoBackupEnabled()) return;
    clearTimeout(autoSaveTimer);
    setStatus('Change detected. Auto-save scheduled...');
    autoSaveTimer = setTimeout(()=>saveToDropbox({silent:true,action:reason}), AUTO_SAVE_DELAY_MS);
  }

  async function maybeScheduledBackup(){
    if(!auth() || !autoBackupEnabled()) return;
    const now = Date.now();
    const last = Date.parse(lastBackup() || '');
    if(last && now - last < BACKUP_INTERVAL_MS) return;
    const data = readAppData();
    const sig = dataSignature(data);
    const lastSig = localStorage.getItem(DBX_LAST_BACKUP_SIGNATURE_KEY) || '';
    if(sig && sig !== lastSig) await createVersionedBackup('scheduled-30-minute-backup', data, {silent:true});
  }

  async function loadFromDropbox(){
    try{
      setStatus('Loading PDE data from Dropbox...');
      const text = await downloadText(DBX_FILE_PATH);
      if(!text){ alert('No Dropbox file found yet. Save from the device with your current PDE data first.'); setStatus('No Dropbox data file found.'); return; }
      const data = JSON.parse(text);
      if(!confirm('Load data from Dropbox? This will replace the data currently saved in this browser. A backup of this browser data will be created first.')){ setStatus('Load cancelled.'); return; }
      const current = readAppData();
      localStorage.setItem(PDE_DATA_KEY + '_backup_before_dropbox_' + Date.now(), localStorage.getItem(PDE_DATA_KEY) || '{}');
      if(auth()) await createVersionedBackup('before-load-from-dropbox', current, {silent:true, force:true});
      writeAppData(data);
      localDataSignature = dataSignature(data);
      setLastSync('Loaded from Dropbox');
      setStatus('Loaded from Dropbox. Refreshing...');
      setTimeout(()=>location.reload(),600);
    }catch(err){ const msg=friendlyDropboxError(err); setStatus(msg); alert(msg); }
  }

  function updateAutoBackupUi(){
    const toggle = $('autoBackupToggle');
    if(toggle) toggle.checked = autoBackupEnabled();
    const status = $('autoBackupStatus');
    if(status){
      status.innerHTML = '<div class="backup-status-card"><strong>Auto Backup</strong><span>'+(autoBackupEnabled()?'On':'Off')+'</span></div><div class="backup-status-card"><strong>Backup Interval</strong><span>Every 30 minutes while app is open and data changed</span></div><div class="backup-status-card"><strong>Last Backup</strong><span>'+timeText(lastBackup())+'</span></div>';
    }
  }

  function updateButtons(){
    const connected = !!auth();
    ['saveDropboxBtn','loadDropboxBtn','disconnectDropboxBtn','backupNowDropboxBtn'].forEach(id=>{ const b=$(id); if(b) b.disabled=!connected; });
    const c=$('connectDropboxBtn'); if(c) c.textContent = connected ? 'Reconnect Dropbox' : 'Connect Dropbox';
    updateAutoBackupUi();
    updateTopStatus();
  }

  function injectPanel(){
    const settings = $('settings');
    if(!settings || $('dropboxSyncPanel')) return;
    const panel = document.createElement('section');
    panel.id='dropboxSyncPanel';
    panel.className='panel';
    panel.style.marginTop='20px';
    panel.innerHTML = '<div class="panel-header"><div><h3>Dropbox Sync & Auto Backup</h3><p>Save, load, and automatically back up the same PDE data file between your laptop and phone.</p></div></div><div class="backup-box"><button type="button" class="btn primary" id="connectDropboxBtn">Connect Dropbox</button><button type="button" class="btn" id="saveDropboxBtn">Save To Dropbox</button><button type="button" class="btn secondary" id="loadDropboxBtn">Load From Dropbox</button><button type="button" class="btn secondary" id="backupNowDropboxBtn">Backup Now</button><button type="button" class="btn danger" id="disconnectDropboxBtn">Disconnect Dropbox</button></div><div class="auto-backup-row"><label class="auto-backup-switch"><input type="checkbox" id="autoBackupToggle"> Auto Backup On</label><span class="muted">Auto-saves after saved changes and creates versioned backups every 30 minutes while the app is open.</span></div><div class="backup-status-grid" id="autoBackupStatus"></div><p class="muted" id="dropboxStatus">Dropbox not connected.</p><p class="muted">Main Dropbox file: <strong>'+DBX_DISPLAY_PATH+'</strong><br>Versioned backups folder: <strong>/Apps/PDE-App/backups/</strong></p>';
    settings.appendChild(panel);
    $('connectDropboxBtn').onclick=connectDropbox;
    $('saveDropboxBtn').onclick=()=>saveToDropbox({action:'Saved to Dropbox'});
    $('loadDropboxBtn').onclick=loadFromDropbox;
    $('backupNowDropboxBtn').onclick=()=>createVersionedBackup('manual-backup', null, {force:true});
    $('disconnectDropboxBtn').onclick=clearAuth;
    $('autoBackupToggle').onchange=e=>setAutoBackupEnabled(e.target.checked);
    updateButtons();
  }

  async function handleRedirect(){
    const url = new URL(location.href);
    const code = url.searchParams.get('code');
    if(!code) return;
    try{ await finishConnect(code); }
    catch(err){ const msg=friendlyDropboxError(err); setStatus('Dropbox connection failed. '+msg); alert(msg); }
  }

  function installAutoBackupWatchers(){
    localDataSignature = dataSignature(readAppData());

    document.addEventListener('submit', e=>{
      const form = e.target;
      if(!form || !form.id) return;
      const isTracked = ['clientForm','projectForm','costForm','invoiceForm','paymentForm','settingsForm'].includes(form.id);
      if(!isTracked) return;
      const editingImportant = (form.id === 'costForm' || form.id === 'invoiceForm') && form.dataset.editing === 'true' && form.elements.id?.value;
      if(editingImportant && autoBackupEnabled() && auth()){
        const snapshot = readAppData();
        createVersionedBackup('before-edit-update', snapshot, {silent:true, force:true});
      }
      setTimeout(()=>scheduleAutoSave('Auto saved after app change'), 1300);
    }, true);

    window.addEventListener('beforeunload',()=>{
      if(autoSaveTimer && auth() && autoBackupEnabled()){
        try{
          const data = readAppData();
          localStorage.setItem(PDE_DATA_KEY + '_pending_dropbox_save_' + Date.now(), JSON.stringify(data));
        }catch(e){}
      }
    });

    setInterval(()=>{
      const sig = dataSignature(readAppData());
      if(sig && sig !== localDataSignature){
        localDataSignature = sig;
        scheduleAutoSave('Auto saved after local data change');
      }
    }, 15000);

    setInterval(maybeScheduledBackup, 60000);
  }

  function start(){
    injectTopStatus();
    injectPanel();
    handleRedirect();
    installAutoBackupWatchers();
    updateAutoBackupUi();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();