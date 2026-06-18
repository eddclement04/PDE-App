// PDE app patch: custom drawing button + section totals/grand total + autosave drafts
(function(){
  const money = n => new Intl.NumberFormat('en-LC',{style:'currency',currency:'XCD'}).format(Number(n||0));
  const sectionLabels = {site:'Site',architectural:'Architectural',structural:'Structural',electrical:'Electrical',plumbing:'Plumbing',hvac:'HVAC'};
  const draftKey = 'pde_project_invoice_app_form_drafts_v1';
  let refreshing = false;
  let restoring = false;

  function calcRow(row){
    const qty = Number(row.querySelector('.qty')?.value || 0);
    const rate = Number(row.querySelector('.rate')?.value || 0);
    return qty * rate;
  }

  function totalRow(label, amount, className){
    const div = document.createElement('div');
    div.className = className;
    div.dataset.autoDrawingHeading = 'true';
    div.style.cssText = 'grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:12px;margin:4px 0 10px;padding:9px 12px;border:1px solid #d8e5f3;border-radius:10px;background:#f8fbff;font-weight:800;color:#0f4c81';
    div.innerHTML = `<span>${label}</span><span>${money(amount)}</span>`;
    return div;
  }

  function refreshTotals(){
    const box = document.getElementById('costItems');
    if(!box || refreshing) return;
    refreshing = true;
    box.querySelectorAll('.drawing-section-total,.drawing-grand-total').forEach(x=>x.remove());

    Object.keys(sectionLabels).forEach(cat=>{
      const rows = [...box.querySelectorAll(`.cost-line[data-drawing-cat="${cat}"]`)];
      if(!rows.length) return;
      let sectionTotal = rows.reduce((sum,row)=>sum + calcRow(row),0);
      const last = rows[rows.length - 1];
      last.insertAdjacentElement('afterend', totalRow(`${sectionLabels[cat]} Total`, sectionTotal, 'drawing-section-total'));
    });

    const allRows = [...box.querySelectorAll('.cost-line')];
    const fullGrand = allRows.reduce((sum,row)=>sum + calcRow(row),0);
    if(allRows.length){
      box.appendChild(totalRow('Grand Total', fullGrand, 'drawing-grand-total'));
    }
    refreshing = false;
  }

  function addCustomFromButton(btn){
    const id = btn?.dataset?.addCustomDrawing;
    if(!id) return;
    if(typeof window.addCustomDrawing === 'function'){
      window.addCustomDrawing(id);
    }else{
      const list = document.getElementById(id);
      if(!list) return;
      const category = list.closest('[data-custom-category]')?.dataset.customCategory || 'custom';
      const row = document.createElement('div');
      row.className = 'multi-row custom-drawing-row';
      row.innerHTML = `<input data-custom-drawing-input="${category}" placeholder="Custom ${sectionLabels[category]||category} drawing"><button type="button" class="btn danger">−</button>`;
      row.querySelector('button').onclick = () => { row.remove(); setTimeout(()=>{refreshTotals(); saveAllDrafts();},0); };
      list.appendChild(row);
    }
    setTimeout(()=>{refreshTotals(); saveAllDrafts();},0);
  }

  function getDrafts(){
    try{return JSON.parse(localStorage.getItem(draftKey)) || {}}catch(e){return {}}
  }

  function setDrafts(data){
    localStorage.setItem(draftKey, JSON.stringify(data));
  }

  function fieldValue(el){
    if(el.type === 'checkbox') return el.checked;
    return el.value;
  }

  function setFieldValue(el,val){
    if(val === undefined || val === null) return;
    if(el.type === 'checkbox') el.checked = !!val;
    else el.value = val;
  }

  function readSimpleFields(form){
    const data = {};
    form.querySelectorAll('input[name], select[name], textarea[name]').forEach(el=>{
      data[el.name] = fieldValue(el);
    });
    return data;
  }

  function fillSimpleFields(form,data={}){
    Object.entries(data).forEach(([name,val])=>{
      const el = form.querySelector(`[name="${CSS.escape(name)}"]`);
      if(el) setFieldValue(el,val);
    });
  }

  function readDraft(form){
    const data = readSimpleFields(form);
    if(form.id === 'costForm'){
      data.costItems = [...document.querySelectorAll('#costItems .cost-line')].filter(r=>!r.dataset.autoDrawingTask).map(r=>({
        description:r.querySelector('.desc')?.value || '',
        unit:r.querySelector('.unit')?.value || '',
        qty:r.querySelector('.qty')?.value || '',
        rate:r.querySelector('.rate')?.value || ''
      }));
      data.customDrawings = [...document.querySelectorAll('[data-custom-drawing-input]')].map(i=>({
        category:i.dataset.customDrawingInput || '',
        value:i.value || '',
        section:i.closest('[data-project-type-section]')?.dataset.projectTypeSection || ''
      }));
      data.checkedDrawings = [...document.querySelectorAll('[data-drawing-category]')].filter(i=>i.checked).map(i=>({
        category:i.dataset.drawingCategory || '',
        value:i.value || '',
        section:i.closest('[data-project-type-section]')?.dataset.projectTypeSection || ''
      }));
    }
    if(form.id === 'invoiceForm'){
      data.lineItems = [...document.querySelectorAll('#lineItems .line')].map(r=>({
        description:r.querySelector('.desc')?.value || '',
        unit:r.querySelector('.unit')?.value || '',
        qty:r.querySelector('.qty')?.value || '',
        rate:r.querySelector('.rate')?.value || ''
      }));
    }
    return data;
  }

  function rowHtml(item, cls){
    const label = cls === 'line' ? 'Description' : 'Job / Task';
    return `<label>${label}<input class="desc" value="${(item.description||'').replace(/"/g,'&quot;')}"></label><label>Unit<input class="unit" value="${(item.unit||'Item').replace(/"/g,'&quot;')}"></label><label>Qty<input class="qty" type="number" step="0.01" value="${item.qty||1}"></label><label>Rate<input class="rate" type="number" step="0.01" value="${item.rate||0}"></label><button type="button" class="btn danger">×</button>`;
  }

  function restoreRows(boxId, rows, cls){
    const box = document.getElementById(boxId);
    if(!box || !Array.isArray(rows) || !rows.length) return;
    box.innerHTML = '';
    rows.forEach(item=>{
      const r = document.createElement('div');
      r.className = cls;
      r.innerHTML = rowHtml(item,cls);
      r.querySelector('button').onclick = () => { r.remove(); saveAllDrafts(); refreshTotals(); };
      box.appendChild(r);
    });
  }

  function restoreCostDrawings(data){
    if(!data) return;
    setTimeout(()=>{
      (data.checkedDrawings || []).forEach(d=>{
        document.querySelectorAll(`[data-project-type-section="${d.section}"] [data-drawing-category="${d.category}"]`).forEach(i=>{
          if(i.value === d.value) i.checked = true;
        });
      });
      (data.customDrawings || []).forEach(d=>{
        const list = document.querySelector(`[data-project-type-section="${d.section}"] [data-custom-category="${d.category}"] .custom-drawing-list`);
        if(!list || !d.value) return;
        const row = document.createElement('div');
        row.className = 'multi-row custom-drawing-row';
        row.innerHTML = `<input data-custom-drawing-input="${d.category}" value="${d.value.replace(/"/g,'&quot;')}" placeholder="Custom ${sectionLabels[d.category]||d.category} drawing"><button type="button" class="btn danger">−</button>`;
        row.querySelector('button').onclick = () => { row.remove(); setTimeout(()=>{refreshTotals(); saveAllDrafts();},0); };
        list.appendChild(row);
      });
      refreshTotals();
    },300);
  }

  function restoreDraft(form){
    const data = getDrafts()[form.id];
    if(!data) return;
    restoring = true;
    fillSimpleFields(form,data);
    if(form.id === 'costForm'){
      if(typeof window.updateProjectTypeSections === 'function' && data.projectType) window.updateProjectTypeSections(data.projectType);
      restoreRows('costItems', data.costItems, 'cost-line');
      restoreCostDrawings(data);
    }
    if(form.id === 'invoiceForm') restoreRows('lineItems', data.lineItems, 'line');
    restoring = false;
  }

  function saveDraft(form){
    if(restoring || !form?.id) return;
    const drafts = getDrafts();
    drafts[form.id] = readDraft(form);
    drafts[form.id]._savedAt = new Date().toISOString();
    setDrafts(drafts);
  }

  function saveAllDrafts(){
    ['clientForm','projectForm','costForm','invoiceForm','paymentForm','settingsForm'].forEach(id=>{
      const form = document.getElementById(id);
      if(form) saveDraft(form);
    });
  }

  function clearDraft(formId){
    const drafts = getDrafts();
    delete drafts[formId];
    setDrafts(drafts);
  }

  document.addEventListener('click', function(e){
    const btn = e.target.closest('[data-add-custom-drawing]');
    if(!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    addCustomFromButton(btn);
  }, true);

  document.addEventListener('change', e => {
    if(e.target.matches('[data-drawing-category], .qty, .rate')) setTimeout(refreshTotals,0);
    const form = e.target.closest('form');
    if(form) setTimeout(()=>saveDraft(form),0);
  });
  document.addEventListener('input', e => {
    if(e.target.matches('[data-custom-drawing-input], .qty, .rate')) setTimeout(refreshTotals,0);
    const form = e.target.closest('form');
    if(form) setTimeout(()=>saveDraft(form),0);
  });
  document.addEventListener('submit', e => {
    if(e.target?.id) clearDraft(e.target.id);
  }, true);

  window.addEventListener('load', () => {
    ['clientForm','projectForm','costForm','invoiceForm','paymentForm','settingsForm'].forEach(id=>{
      const form = document.getElementById(id);
      if(form) restoreDraft(form);
    });
    const box = document.getElementById('costItems');
    if(box){
      new MutationObserver(()=>setTimeout(()=>{refreshTotals(); saveAllDrafts();},0)).observe(box,{childList:true,subtree:true});
      refreshTotals();
    }
  });
})();
