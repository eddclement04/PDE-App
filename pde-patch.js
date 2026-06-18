// PDE app patch: custom drawing button + section totals/grand total + autosave drafts + dashboard charts
(function(){
  const APP_KEY = 'pde_project_invoice_app_v1';
  const money = n => new Intl.NumberFormat('en-LC',{style:'currency',currency:'XCD'}).format(Number(n||0));
  const sectionLabels = {site:'Site',architectural:'Architectural',structural:'Structural',electrical:'Electrical',plumbing:'Plumbing',hvac:'HVAC'};
  const draftKey = 'pde_project_invoice_app_form_drafts_v1';
  let refreshing = false;
  let restoring = false;

  function safeText(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

  function readAppState(){
    try{return JSON.parse(localStorage.getItem(APP_KEY)) || {clients:[],projects:[],costs:[],invoices:[],payments:[]}}catch(e){return {clients:[],projects:[],costs:[],invoices:[],payments:[]}}
  }

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

  function setDrafts(data){localStorage.setItem(draftKey, JSON.stringify(data));}
  function fieldValue(el){return el.type === 'checkbox' ? el.checked : el.value;}
  function setFieldValue(el,val){if(val === undefined || val === null) return;if(el.type === 'checkbox') el.checked = !!val;else el.value = val;}

  function readSimpleFields(form){
    const data = {};
    form.querySelectorAll('input[name], select[name], textarea[name]').forEach(el=>{data[el.name] = fieldValue(el);});
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
        document.querySelectorAll(`[data-project-type-section="${d.section}"] [data-drawing-category="${d.category}"]`).forEach(i=>{if(i.value === d.value) i.checked = true;});
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

  function clearDraft(formId){const drafts = getDrafts();delete drafts[formId];setDrafts(drafts);}

  function itemTotal(items){return (items||[]).reduce((a,x)=>a + Number(x.qty||0) * Number(x.rate||0),0);}
  function getClientName(state,id){return (state.clients||[]).find(c=>c.id===id)?.name || 'No client';}
  function getProjectName(state,id){return (state.projects||[]).find(p=>p.id===id)?.name || 'No project';}
  function paidForInvoice(state,invoice){return Number(invoice.paid||0) + (state.payments||[]).filter(p=>p.invoiceId===invoice.id).reduce((a,p)=>a+Number(p.amount||0),0);}
  function invoiceBalance(state,invoice){return Math.max(itemTotal(invoice.items) - paidForInvoice(state,invoice),0);}
  function chartStyle(){return 'height:10px;border-radius:999px;background:#e5edf6;overflow:hidden;margin-top:8px';}
  function barFill(p){return `height:100%;width:${Math.min(Math.max(p,0),100)}%;border-radius:999px;background:linear-gradient(90deg,#0f4c81,#4fa3d1)`;}

  function chartPanel(title, subtitle, rows){
    if(!rows.length) return `<section class="panel"><div class="panel-header"><div><h3>${title}</h3><p>${subtitle}</p></div></div><p class="empty">No data yet.</p></section>`;
    const max = Math.max(...rows.map(r=>r.value),1);
    return `<section class="panel"><div class="panel-header"><div><h3>${title}</h3><p>${subtitle}</p></div></div><div class="dashboard-chart-bars">${rows.map(r=>`<div style="margin:12px 0"><div style="display:flex;justify-content:space-between;gap:12px;font-size:.92rem"><strong>${safeText(r.label)}</strong><span>${money(r.value)}</span></div><div style="${chartStyle()}"><div style="${barFill((r.value/max)*100)}"></div></div></div>`).join('')}</div></section>`;
  }

  function renderDashboardInsights(){
    const dashboard = document.getElementById('dashboard');
    if(!dashboard) return;
    const state = readAppState();
    const invoices = state.invoices || [];
    const payments = state.payments || [];
    const costs = state.costs || [];
    const outstandingInvoices = invoices.map(i=>({
      invoice:i,
      client:getClientName(state,i.clientId),
      project:getProjectName(state,i.projectId),
      total:itemTotal(i.items),
      paid:paidForInvoice(state,i),
      balance:invoiceBalance(state,i),
      dueDate:i.dueDate || ''
    })).filter(x=>x.balance>0).sort((a,b)=>b.balance-a.balance);
    const outstandingTotal = outstandingInvoices.reduce((a,x)=>a+x.balance,0);
    const invoiceTotal = invoices.reduce((a,i)=>a+itemTotal(i.items),0);
    const paidTotal = invoices.reduce((a,i)=>a+paidForInvoice(state,i),0);
    const costTotal = costs.reduce((a,c)=>a+itemTotal(c.items),0);
    const paymentTotal = payments.reduce((a,p)=>a+Number(p.amount||0),0);
    const todayStr = new Date().toISOString().slice(0,10);
    const overdue = outstandingInvoices.filter(x=>x.dueDate && x.dueDate < todayStr).reduce((a,x)=>a+x.balance,0);

    const byClient = Object.values(outstandingInvoices.reduce((acc,x)=>{acc[x.client] ||= {label:x.client,value:0};acc[x.client].value += x.balance;return acc;},{})).sort((a,b)=>b.value-a.value).slice(0,6);
    const byProjectCost = Object.values(costs.reduce((acc,c)=>{let label=getProjectName(state,c.projectId);acc[label] ||= {label,value:0};acc[label].value += itemTotal(c.items);return acc;},{})).sort((a,b)=>b.value-a.value).slice(0,6);
    const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now=new Date();
    const monthRows=[];
    for(let i=5;i>=0;i--){let d=new Date(now.getFullYear(),now.getMonth()-i,1);let key=d.toISOString().slice(0,7);monthRows.push({key,label:`${monthNames[d.getMonth()]} ${d.getFullYear()}`,value:0});}
    payments.forEach(p=>{let key=String(p.date||'').slice(0,7);let row=monthRows.find(r=>r.key===key);if(row)row.value+=Number(p.amount||0);});
    const statusPaid = Math.min(paidTotal,invoiceTotal);
    const statusOutstanding = Math.max(invoiceTotal-paidTotal,0);
    const paidPct = invoiceTotal ? Math.round((statusPaid/invoiceTotal)*100) : 0;

    let holder = document.getElementById('dashboardInsights');
    if(!holder){
      holder = document.createElement('div');
      holder.id = 'dashboardInsights';
      const stats = dashboard.querySelector('.stats-grid');
      stats?.insertAdjacentElement('afterend', holder);
    }
    holder.innerHTML = `
      <div class="stats-grid" style="margin-top:20px">
        <article class="stat-card"><span>Outstanding Payments</span><strong>${money(outstandingTotal)}</strong></article>
        <article class="stat-card"><span>Overdue Payments</span><strong>${money(overdue)}</strong></article>
        <article class="stat-card"><span>Invoices Paid</span><strong>${paidPct}%</strong></article>
        <article class="stat-card"><span>Total Invoiced</span><strong>${money(invoiceTotal)}</strong></article>
        <article class="stat-card"><span>Total Job Costs</span><strong>${money(costTotal)}</strong></article>
      </div>
      <div class="grid two" style="margin-top:20px">
        ${chartPanel('Outstanding payments by client','Clients with unpaid invoice balances.',byClient)}
        <section class="panel"><div class="panel-header"><div><h3>Invoice status</h3><p>Paid amount compared with outstanding invoice balances.</p></div></div><div style="display:grid;grid-template-columns:130px 1fr;gap:20px;align-items:center"><div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(#0f4c81 0 ${paidPct}%, #dbe7f3 ${paidPct}% 100%);display:grid;place-items:center"><div style="width:72px;height:72px;border-radius:50%;background:white;display:grid;place-items:center;font-weight:800;color:#0f4c81">${paidPct}%</div></div><div><p><strong>Paid:</strong> ${money(statusPaid)}</p><p><strong>Outstanding:</strong> ${money(statusOutstanding)}</p><p><strong>Total invoiced:</strong> ${money(invoiceTotal)}</p></div></div></section>
        ${chartPanel('Payments received by month','Payment collections for the last six months.',monthRows)}
        ${chartPanel('Job cost by project','Top projects by recorded job cost.',byProjectCost)}
      </div>
      <section class="panel table-wrap" style="margin-top:20px"><div class="panel-header"><div><h3>Outstanding payments</h3><p>Unpaid invoice balances requiring follow-up.</p></div></div><table><thead><tr><th>Invoice</th><th>Client</th><th>Project</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Outstanding</th></tr></thead><tbody>${outstandingInvoices.length?outstandingInvoices.slice(0,10).map(x=>`<tr><td><b>${safeText(x.invoice.invoiceNo||'')}</b></td><td>${safeText(x.client)}</td><td>${safeText(x.project)}</td><td>${safeText(x.dueDate||'-')}</td><td>${money(x.total)}</td><td>${money(x.paid)}</td><td><b>${money(x.balance)}</b></td></tr>`).join(''):'<tr><td colspan="7">No outstanding payments.</td></tr>'}</tbody></table></section>
    `;
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
    setTimeout(renderDashboardInsights,100);
  });
  document.addEventListener('input', e => {
    if(e.target.matches('[data-custom-drawing-input], .qty, .rate')) setTimeout(refreshTotals,0);
    const form = e.target.closest('form');
    if(form) setTimeout(()=>saveDraft(form),0);
  });
  document.addEventListener('submit', e => {if(e.target?.id) clearDraft(e.target.id);setTimeout(renderDashboardInsights,500);}, true);
  window.addEventListener('storage', renderDashboardInsights);

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
    renderDashboardInsights();
    setInterval(renderDashboardInsights,3000);
  });
})();
