// PDE app patch: dashboard job cost category totals + edit helper loader
(function(){
  const APP_KEY = 'pde_project_invoice_app_v1';
  const money = n => new Intl.NumberFormat('en-LC',{style:'currency',currency:'XCD'}).format(Number(n||0));
  const safe = v => String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const CAT_LABEL = {site:'Site',architectural:'Architectural',structural:'Structural',electrical:'Electrical',plumbing:'Plumbing',hvac:'HVAC',other:'Other'};
  const CAT_ORDER = ['site','architectural','structural','electrical','plumbing','hvac','other'];

  function readState(){
    try{return JSON.parse(localStorage.getItem(APP_KEY)) || {}}catch(e){return {}}
  }

  function itemValue(item){
    return Number(item.qty || 0) * Number(item.rate || 0);
  }

  function itemTotal(items){
    return (items || []).reduce((sum,item)=>sum + itemValue(item),0);
  }

  function clientName(state,id){
    return (state.clients || []).find(c=>c.id===id)?.name || 'No client';
  }

  function projectName(state,id){
    return (state.projects || []).find(p=>p.id===id)?.name || 'No project';
  }

  function categoryTotals(items){
    const totals = {};
    (items || []).forEach(item=>{
      const cat = item.drawingCat || 'other';
      totals[cat] = (totals[cat] || 0) + itemValue(item);
    });
    return CAT_ORDER.filter(cat=>totals[cat]).map(cat=>({label:CAT_LABEL[cat] || cat,total:totals[cat]}));
  }

  function renderJobCostDetails(){
    const dashboard = document.getElementById('dashboard');
    if(!dashboard) return;

    const state = readState();
    const costs = state.costs || [];
    const rows = costs.map(c=>({
      id:c.id || '',
      date:c.date || '',
      title:c.title || 'Untitled job cost',
      client:clientName(state,c.clientId),
      project:projectName(state,c.projectId),
      total:itemTotal(c.items),
      categories:categoryTotals(c.items || [])
    })).sort((a,b)=>b.total-a.total);

    let panel = document.getElementById('dashboardJobCostDetails');
    if(!panel){
      panel = document.createElement('section');
      panel.id = 'dashboardJobCostDetails';
      panel.className = 'panel table-wrap';
      panel.style.marginTop = '20px';
      dashboard.appendChild(panel);
    }

    const grandTotal = rows.reduce((sum,row)=>sum+row.total,0);
    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <h3>Job Cost Details</h3>
          <p>Dashboard summary by drawing heading/category: <strong>${money(grandTotal)}</strong></p>
        </div>
      </div>
      <table>
        <thead>
          <tr><th>Date</th><th>Cost Title / Scope</th><th>Client</th><th>Project</th><th>Heading Totals</th><th>Total Cost</th></tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map(row=>`
            <tr>
              <td>${safe(row.date || '-')}</td>
              <td><b>${safe(row.title)}</b></td>
              <td>${safe(row.client)}</td>
              <td>${safe(row.project)}</td>
              <td>${row.categories.length ? row.categories.map(c=>`<b>${safe(c.label)} Total</b> — ${money(c.total)}`).join('<br>') : '<b>Other Total</b> — '+money(row.total)}</td>
              <td><b>${money(row.total)}</b></td>
            </tr>`).join('') : '<tr><td colspan="6">No saved job cost records found.</td></tr>'}
        </tbody>
      </table>
    `;

    const costsTable = document.getElementById('costsTable');
    if(costsTable && rows.length && /No job costs/i.test(costsTable.textContent || '')){
      costsTable.innerHTML = rows.map(row=>`
        <tr>
          <td>${safe(row.date || '-')}</td>
          <td><b>${safe(row.title)}</b></td>
          <td>${safe(row.client)}</td>
          <td>${safe(row.project)}</td>
          <td><b>${money(row.total)}</b></td>
          <td><button class="btn small secondary" onclick="editCost('${row.id}')">Edit</button></td>
        </tr>`).join('');
    }
  }

  window.addEventListener('load',()=>{
    renderJobCostDetails();
    setInterval(renderJobCostDetails,3000);
    const s=document.createElement('script');
    s.src='pde-edit-enhance.js?v=1';
    document.body.appendChild(s);
  });
  window.addEventListener('storage',renderJobCostDetails);
  document.addEventListener('submit',()=>setTimeout(renderJobCostDetails,500),true);
})();
