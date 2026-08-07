// PDE Dropbox sync for one shared App Folder data file
(function(){
  const DBX_APP_KEY = 'ovh91cidwdhh7i3';
  const REDIRECT_URI = 'https://eddclement04.github.io/PDE-App/';
  const PDE_DATA_KEY = 'pde_project_invoice_app_v1';
  const DBX_AUTH_KEY = 'pde_dropbox_auth_v1';
  const DBX_VERIFIER_KEY = 'pde_dropbox_pkce_v1';
  const DBX_FILE_PATH = '/pde-data.json';
  const DBX_DISPLAY_PATH = '/Apps/PDE-App/pde-data.json';
  const DBX_SCOPES = 'account_info.read files.content.read files.content.write';

  function $(id){ return document.getElementById(id); }
  function readAppData(){ try{return JSON.parse(localStorage.getItem(PDE_DATA_KEY)) || {}}catch(e){return {}} }
  function writeAppData(data){ localStorage.setItem(PDE_DATA_KEY, JSON.stringify(data)); }
  function auth(){ try{return JSON.parse(localStorage.getItem(DBX_AUTH_KEY)) || null}catch(e){return null} }
  function saveAuth(data){ localStorage.setItem(DBX_AUTH_KEY, JSON.stringify(data)); }
  function clearAuth(){ localStorage.removeItem(DBX_AUTH_KEY); localStorage.removeItem(DBX_VERIFIER_KEY); setStatus('Dropbox disconnected.'); updateButtons(); }
  function setStatus(text){ const el=$('dropboxStatus'); if(el) el.textContent=text; }

  function friendlyDropboxError(err){
    const msg = String(err && err.message ? err.message : err || '');
    if(msg.includes('missing_scope')){
      localStorage.removeItem(DBX_AUTH_KEY);
      localStorage.removeItem(DBX_VERIFIER_KEY);
      updateButtons();
      return 'Dropbox needs a new permission approval. Click Connect Dropbox again, approve access, then retry Save or Load.';
    }
    if(msg.includes('expired_access_token') || msg.includes('invalid_access_token')){
      localStorage.removeItem(DBX_AUTH_KEY);
      updateButtons();
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
    setStatus('Dropbox connected. Use Save To Dropbox or Load From Dropbox.');
    updateButtons();
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

  async function saveToDropbox(){
    try{
      setStatus('Saving PDE data to Dropbox...');
      const data = readAppData();
      data._dropboxSavedAt = new Date().toISOString();
      await uploadText(DBX_FILE_PATH, JSON.stringify(data,null,2));
      setStatus('Saved to Dropbox: '+DBX_DISPLAY_PATH);
    }catch(err){ const msg=friendlyDropboxError(err); setStatus(msg); alert(msg); }
  }

  async function loadFromDropbox(){
    try{
      setStatus('Loading PDE data from Dropbox...');
      const text = await downloadText(DBX_FILE_PATH);
      if(!text){ alert('No Dropbox file found yet. Save from the device with your current PDE data first.'); setStatus('No Dropbox data file found.'); return; }
      const data = JSON.parse(text);
      if(!confirm('Load data from Dropbox? This will replace the data currently saved in this browser.')){ setStatus('Load cancelled.'); return; }
      localStorage.setItem(PDE_DATA_KEY + '_backup_before_dropbox_' + Date.now(), localStorage.getItem(PDE_DATA_KEY) || '{}');
      writeAppData(data);
      setStatus('Loaded from Dropbox. Refreshing...');
      setTimeout(()=>location.reload(),600);
    }catch(err){ const msg=friendlyDropboxError(err); setStatus(msg); alert(msg); }
  }

  function updateButtons(){
    const connected = !!auth();
    ['saveDropboxBtn','loadDropboxBtn','disconnectDropboxBtn'].forEach(id=>{ const b=$(id); if(b) b.disabled=!connected; });
    const c=$('connectDropboxBtn'); if(c) c.textContent = connected ? 'Reconnect Dropbox' : 'Connect Dropbox';
  }

  function injectPanel(){
    const settings = $('settings');
    if(!settings || $('dropboxSyncPanel')) return;
    const panel = document.createElement('section');
    panel.id='dropboxSyncPanel';
    panel.className='panel';
    panel.style.marginTop='20px';
    panel.innerHTML = '<div class="panel-header"><div><h3>Dropbox Sync</h3><p>Save and load the same PDE data file between your laptop and phone.</p></div></div><div class="backup-box"><button type="button" class="btn primary" id="connectDropboxBtn">Connect Dropbox</button><button type="button" class="btn" id="saveDropboxBtn">Save To Dropbox</button><button type="button" class="btn secondary" id="loadDropboxBtn">Load From Dropbox</button><button type="button" class="btn danger" id="disconnectDropboxBtn">Disconnect Dropbox</button></div><p class="muted" id="dropboxStatus">Dropbox not connected.</p><p class="muted">Dropbox file: <strong>'+DBX_DISPLAY_PATH+'</strong></p>';
    settings.appendChild(panel);
    $('connectDropboxBtn').onclick=connectDropbox;
    $('saveDropboxBtn').onclick=saveToDropbox;
    $('loadDropboxBtn').onclick=loadFromDropbox;
    $('disconnectDropboxBtn').onclick=clearAuth;
    updateButtons();
  }

  async function handleRedirect(){
    const url = new URL(location.href);
    const code = url.searchParams.get('code');
    if(!code) return;
    try{ await finishConnect(code); }
    catch(err){ const msg=friendlyDropboxError(err); setStatus('Dropbox connection failed. '+msg); alert(msg); }
  }

  function start(){ injectPanel(); handleRedirect(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();