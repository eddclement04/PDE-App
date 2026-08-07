// PDE edit workflow helper for Job Costs and Invoices
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
    ensureCancelButton('costForm',()=>{ if(typeof window.newCost==='function') window.newCost(); hideNotice('costForm'); },'Job Cost');
    ensureCancelButton('invoiceForm',()=>{ if(typeof window.newInvoice==='function') window.newInvoice(); hideNotice('invoiceForm'); },'Invoice');
    window.editCost = editCostDirect;
    window.editInvoice = editInvoiceDirect;
    const costForm=$('costForm'); if(costForm) costForm.addEventListener('submit',()=>setTimeout(()=>{setMode('costForm',false,'Job Cost'); hideNotice('costForm'); clearDraft('costForm');},300),true);
    const invoiceForm=$('invoiceForm'); if(invoiceForm) invoiceForm.addEventListener('submit',()=>setTimeout(()=>{setMode('invoiceForm',false,'Invoice'); hideNotice('invoiceForm'); clearDraft('invoiceForm');},300),true);
    $('clearCostBtn')?.addEventListener('click',()=>setTimeout(()=>{setMode('costForm',false,'Job Cost'); hideNotice('costForm'); clearDraft('costForm');},50));
    $('clearInvoiceBtn')?.addEventListener('click',()=>setTimeout(()=>{setMode('invoiceForm',false,'Invoice'); hideNotice('invoiceForm'); clearDraft('invoiceForm');},50));
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',setup); else setup();
})();
