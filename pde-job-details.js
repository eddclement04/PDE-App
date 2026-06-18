// PDE app patch: show exact job cost records behind Dashboard Total Job Costs
(function(){
  const APP_KEY = 'pde_project_invoice_app_v1';
  const money = n => new Intl.NumberFormat('en-LC',{style:'currency',currency:'XCD'}).format(Number(n||0));
  const safe = v => String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function readState(){
    try{return JSON.parse(localStorage.getItem(APP_KEY)) || {}}catch(e){return {}}
  }

  function itemTotal(items){
    return (items || []).reduce((sum,item)=>sum + Number(item.qty || 0) * Number(item.rate || 0),0);
  }

  function clientName(state,id){
    return (state.clients || []).find(c=>c.id===id)?.name || 'No client';
  }

  function projectName(state,id){
    return (state.projects || []).find(p=>p.id===id)?.name || 'No project';
  }

  function renderJobCostDetails(){
    const dashboard = document.getElementById('dashboard');
    if(!dashboard) return;

    const state = readState();
    const costs = state.costs || [];
    const rows = costs.map(c=>({
      date:c.date || '',
      title:c.title || 'Untitled job cost',
      client:clientName(state,c.clientId),
      project:projectName(state,c.projectId),
      total:itemTotal(c.items),
      items:c.items || []
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
          <p>This is the breakdown behind the Dashboard Total Job Costs: <strong>${money(grandTotal)}</strong></p>
        </div>
      </div>
      <table>
        <thead>
          <tr><th>Date</th><th>Cost Title / Scope</th><th>Client</th><th>Project</th><th>Line Items</th><th>Total Cost</th></tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map(row=>`
            <tr>
              <td>${safe(row.date || '-')}</td>
              <td><b>${safe(row.title)}</b></td>
              <td>${safe(row.client)}</td>
              <td>${safe(row.project)}</td>
              <td>${row.items.length ? row.items.map(i=>`${safe(i.description || 'Item')} — ${money(Number(i.qty || 0) * Number(i.rate || 0))}`).join('<br>') : '-'}</td>
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
          <td><button class="btn small secondary" onclick="editCost('${row.id||''}')">Edit</button></td>
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
