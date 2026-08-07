// PDE edit workflow helper for Job Costs and Invoices + confirmation and undo
(function(){
  const APP_KEY = 'pde_project_invoice_app_v1';
  const DRAFT_KEY = 'pde_project_invoice_app_form_drafts_v1';
  function $(id){ return document.getElementById(id); }
  function uid(prefix){ return prefix + '_' + Date.now() + '_' + Math.random().toString(16).slice(2); }

  function readState(){ try{return JSON.parse(localStorage.getItem(APP_KEY)) || {}}catch(e){return {}} }
  function writeState(data){ localStorage.setItem(APP_KEY, JSON.stringify(data)); }
  function clearDraft(formId){ try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY))||{}; delete d[formId]; localStorage.setItem(DRAFT_KEY,JSON.stringify(d));}catch(e){} }

  function normalizeIds(){
    const data = readState();
    let changed = false;
    [['clients','client'],['projects','project'],['costs','cost'],['invoices','invoice'],['payments','payment']].forEach(([list,prefix])=>{
      if(!Array.isArray(data[list])) return;
      data[list].forEach((item,index)=>{
        if(!item.id){ item.id = prefix + '_' + Date.now() + '_' + index + '_' + Math.random().toString(16).slice(2); changed = true; }
      });
    });
    if(changed){
      writeState(data);
      if(!sessionStorage.getItem('pde_ids_normalized_once')){
        sessionStorage.setItem('pde_ids_normalized_once','1');
        setTimeout(()=>location.reload(),100);
      }
    }
  }

  function submitButton(form){ return form ? form.querySelector('button[type="submit"], button:not([type]), .btn.primary') : null; }
  function setMode(formId, editing, label){
    const form = $(formId); if(!form) return;
    const btn = submitButton(form);
    const cancel = form.querySelector('[data-cancel-edit="'+formId+'"]');
    if(btn) btn.textContent = editing ? 'Update '+label : 'Save '+label;
    if(cancel) cancel.style.display = editing ? 'inline-flex' : 'none';
    form.dataset.editing = editing ? 'true' : 'false';
  }
  function addNotice(formId, text){
    const form = $(formId); if(!form) return;
    let note = form.querySelector('.editing-notice');
    if(!note){
      note = document.createElement('div');
      note.className = 'editing-notice full';
      note.style.cssText = 'padding:12px 14px;border:1px solid #bfdbfe;background:#eff6ff;color:#0755f5;border-radius:12px;font-weight:800;';
      form.insertBefore(note, form.firstChild.nextSibling || form.firstChild);
    }
    note.textContent = text; note.hidden = false;
  }
  function hideNotice(formId){ const note = $(formId)?.querySelector('.editing-notice'); if(note) note.hidden = true; }
  function scrollToForm(formId){ const form=$(formId); if(form) form.scrollIntoView({behavior:'smooth', block:'start'}); }

  function injectEditUiStyle(){
    if($('pdeEditConfirmStyle')) return;
    const style = document.createElement('style');
    style.id = 'pdeEditConfirmStyle';
    style.textContent = `
      .pde-edit-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.42);z-index:9998;display:grid;place-items:center;padding:18px;}
      .pde-edit-modal{width:min(460px,100%);background:#fff;border:1px solid #dbe5f4;border-radius:22px;box-shadow:0 28px 80px rgba(15,23,42,.22);padding:26px;}
      .pde-edit-modal h3{margin:0 0 8px;color:#111a33;font-size:24px;font-weight:950;letter-spacing:-.03em;}
      .pde-edit-modal p{margin:0 0 18px;color:#64748b;line-height:1.55;}
      .pde-edit-modal-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;}
      .pde-undo-toast{position:fixed;right:22px;bottom:22px;z-index:9999;max-width:430px;background:#111827;color:#fff;border-radius:18px;padding:16px 16px 14px;box-shadow:0 24px 70px rgba(15,23,42,.3);display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;}
      .pde-undo-toast strong{display:block;font-size:14px;margin-bottom:3px;}
      .pde-undo-toast span{display:block;color:#cbd5e1;font-size:12px;line-height:1.35;}
      .pde-undo-toast button{border:1px solid #93c5fd;background:#2563eb;color:#fff;border-radius:10px;padding:10px 14px;font-weight:950;text-transform:uppercase;font-size:12px;cursor:pointer;}
      .pde-undo-timer{grid-column:1/-1;height:4px;background:#334155;border-radius:99px;overflow:hidden;}
      .pde-undo-timer i{display:block;height:100%;width:100%;background:#60a5fa;animation:pdeUndoShrink 10s linear forwards;}
      @keyframes pdeUndoShrink{from{width:100%;}to{width:0%;}}
      @media(max-width:760px){.pde-undo-toast{left:16px;right:16px;bottom:16px}.pde-edit-modal-actions .btn{flex:1 1 140px;}}
    `;
    document.head.appendChild(style);
  }

  function showConfirmModal(label){
    injectEditUiStyle();
    return new Promise(resolve=>{
      const old = $('pdeEditConfirmModal');
      if(old) old.remove();
      const wrap = document.createElement('div');
      wrap.id = 'pdeEditConfirmModal';
      wrap.className = 'pde-edit-modal-backdrop';
      wrap.innerHTML = `
        <div class="pde-edit-modal" role="dialog" aria-modal="true" aria-labelledby="pdeEditConfirmTitle">
          <h3 id="pdeEditConfirmTitle">Confirm ${label} update</h3>
          <p>You are about to update a saved ${label}. This will replace the existing saved record with the changes currently in the form.</p>
          <div class="pde-edit-modal-actions">
            <button type="button" class="btn secondary" id="pdeEditCancelBtn">Cancel</button>
            <button type="button" class="btn primary" id="pdeEditConfirmBtn">Confirm Update</button>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      function close(value){ wrap.remove(); resolve(value); }
      $('pdeEditCancelBtn').onclick = () => close(false);
      $('pdeEditConfirmBtn').onclick = () => close(true);
      wrap.addEventListener('click', e=>{ if(e.target === wrap) close(false); });
      document.addEventListener('keydown', function esc(e){ if(e.key === 'Escape'){ document.removeEventListener('keydown',esc); close(false); } });
      $('pdeEditConfirmBtn')?.focus();
    });
  }

  function showUndoToast(label, previousState){
    injectEditUiStyle();
    const old = $('pdeUndoToast');
    if(old) old.remove();
    const toast = document.createElement('div');
    toast.id = 'pdeUndoToast';
    toast.className = 'pde-undo-toast';
    toast.innerHTML = `<div><strong>${label} updated.</strong><span>You have 10 seconds to undo this edit.</span></div><button type="button" id="pdeUndoBtn">Undo</button><div class="pde-undo-timer"><i></i></div>`;
    document.body.appendChild(toast);
    let active = true;
    const timer = setTimeout(()=>{ active=false; toast.remove(); },10000);
    $('pdeUndoBtn').onclick = () => {
      if(!active) return;
      clearTimeout(timer);
      localStorage.setItem(APP_KEY, JSON.stringify(previousState));
      toast.innerHTML = '<div><strong>Edit undone.</strong><span>Restoring the previous saved data...</span></div>';
      setTimeout(()=>location.reload(),350);
    };
  }

  const pendingUndo = {};
  function attachConfirmUndo(formId,label){
    const form = $(formId); if(!form || form.dataset.confirmUndoReady === 'true') return;
    form.dataset.confirmUndoReady = 'true';
    form.addEventListener('submit', e=>{
      const isEditing = form.dataset.editing === 'true' && !!form.elements.id?.value;
      if(!isEditing) return;

      if(form.dataset.editConfirmed === 'true'){
        delete form.dataset.editConfirmed;
        const snap = pendingUndo[formId];
        delete pendingUndo[formId];
        if(snap) setTimeout(()=>showUndoToast(label,snap),550);
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();
      const snapshot = readState();
      showConfirmModal(label).then(ok=>{
        if(!ok) return;
        pendingUndo[formId] = snapshot;
        form.dataset.editConfirmed = 'true';
        if(typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      });
    },true);
  }

  function ensureCancelButton(formId, clearFn, label){
    const form=$(formId); if(!form) return;
    const actions=form.querySelector('.actions') || form;
    let btn=form.querySelector('[data-cancel-edit="'+formId+'"]');
    if(!btn){
      btn=document.createElement('button'); btn.type='button'; btn.className='btn secondary'; btn.dataset.cancelEdit=formId; btn.textContent='Cancel Edit'; btn.style.display='none';
      btn.addEventListener('click',()=>{ clearFn(); setMode(formId,false,label); hideNotice(formId); });
      actions.appendChild(btn);
    }
  }

  function findRecord(list,id){
    const data = readState();
    const arr = data[list] || [];
    return arr.find(x=>String(x.id)===String(id)) || null;
  }

  function show(view){ if(typeof window.showView === 'function') window.showView(view); else document.querySelector(`.nav-btn[data-view="${view}"]`)?.click(); }

  function fillRows(boxId, cls, items){
    const box = $(boxId); if(!box) return;
    box.innerHTML = '';
    const addFn = cls === 'cost-line' ? window.addCostItem : window.addLineItem;
    const visible = (items || []).filter(x=>cls === 'line' || !x.autoDrawingTask);
    if(typeof addFn === 'function'){
      (visible.length ? visible : [{}]).forEach(item=>addFn(item));
      return;
    }
    (visible.length ? visible : [{}]).forEach(item=>{
      const r=document.createElement('div'); r.className=cls;
      const firstLabel = cls === 'line' ? 'Description' : 'Job / Task';
      r.innerHTML=`<label>${firstLabel}<input class="desc" value="${String(item.description||'').replace(/"/g,'&quot;')}"></label><label>Unit<input class="unit" value="${String(item.unit||'Item').replace(/"/g,'&quot;')}"></label><label>Qty<input class="qty" type="number" step="0.01" value="${item.qty??1}"></label><label>Rate<input class="rate" type="number" step="0.01" value="${item.rate??0}"></label><button type="button" class="btn danger">×</button>`;
      r.querySelector('button').onclick=()=>r.remove(); box.appendChild(r);
    });
  }

  function editCostDirect(id){
    normalizeIds();
    clearDraft('costForm');
    const cost = findRecord('costs',id);
    if(!cost){ alert('This job cost could not be found. Refresh the app and try again.'); return; }
    const f = $('costForm'); if(!f) return;
    ['id','title','date','clientId','projectId','projectType','notes'].forEach(k=>{ if(f.elements[k]) f.elements[k].value = cost[k] || ''; });
    if(typeof window.updateProjectTypeSections === 'function') window.updateProjectTypeSections(cost.projectType || '');
    if(typeof window.fillDrawings === 'function') window.fillDrawings(cost.drawings || {});
    fillRows('costItems','cost-line',cost.items || []);
    if(typeof window.syncDrawingTasks === 'function') setTimeout(()=>window.syncDrawingTasks(cost.items || []),100);
    show('costs');
    setMode('costForm',true,'Job Cost');
    addNotice('costForm','Editing saved Job Cost. Make your changes, then click Update Job Cost.');
    setTimeout(()=>scrollToForm('costForm'),150);
  }

  function editInvoiceDirect(id){
    normalizeIds();
    clearDraft('invoiceForm');
    const inv = findRecord('invoices',id);
    if(!inv){ alert('This invoice could not be found. Refresh the app and try again.'); return; }
    const f = $('invoiceForm'); if(!f) return;
    ['id','invoiceNo','date','dueDate','clientId','projectId','paid','notes'].forEach(k=>{ if(f.elements[k]) f.elements[k].value = inv[k] || ''; });
    fillRows('lineItems','line',inv.items || []);
    show('invoices');
    setMode('invoiceForm',true,'Invoice');
    addNotice('invoiceForm','Editing saved Invoice. Make your changes, then click Update Invoice.');
    setTimeout(()=>scrollToForm('invoiceForm'),150);
  }

  function setup(){
    normalizeIds();
    injectEditUiStyle();
    ensureCancelButton('costForm',()=>{ if(typeof window.newCost==='function') window.newCost(); hideNotice('costForm'); },'Job Cost');
    ensureCancelButton('invoiceForm',()=>{ if(typeof window.newInvoice==='function') window.newInvoice(); hideNotice('invoiceForm'); },'Invoice');
    attachConfirmUndo('costForm','Job Cost');
    attachConfirmUndo('invoiceForm','Invoice');
    window.editCost = editCostDirect;
    window.editInvoice = editInvoiceDirect;
    const costForm=$('costForm'); if(costForm) costForm.addEventListener('submit',()=>setTimeout(()=>{setMode('costForm',false,'Job Cost'); hideNotice('costForm'); clearDraft('costForm');},300),true);
    const invoiceForm=$('invoiceForm'); if(invoiceForm) invoiceForm.addEventListener('submit',()=>setTimeout(()=>{setMode('invoiceForm',false,'Invoice'); hideNotice('invoiceForm'); clearDraft('invoiceForm');},300),true);
    $('clearCostBtn')?.addEventListener('click',()=>setTimeout(()=>{setMode('costForm',false,'Job Cost'); hideNotice('costForm'); clearDraft('costForm');},50));
    $('clearInvoiceBtn')?.addEventListener('click',()=>setTimeout(()=>{setMode('invoiceForm',false,'Invoice'); hideNotice('invoiceForm'); clearDraft('invoiceForm');},50));
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',setup); else setup();
})();