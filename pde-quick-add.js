// PDE quick add client/project buttons for Job Costs
(function(){
  function $(id){ return document.getElementById(id); }
  function uid(prefix){ return prefix + '_' + Date.now() + '_' + Math.random().toString(16).slice(2); }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

  function injectStyle(){
    if($('pdeQuickAddStyle')) return;
    const style = document.createElement('style');
    style.id = 'pdeQuickAddStyle';
    style.textContent = `
      .pde-quick-add-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;}
      .pde-quick-add-row .btn{padding:9px 12px;font-size:11px;}
      .pde-quick-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9998;display:grid;place-items:center;padding:18px;}
      .pde-quick-modal{width:min(620px,100%);background:#fff;border:1px solid #dbe5f4;border-radius:22px;box-shadow:0 28px 80px rgba(15,23,42,.22);padding:26px;}
      .pde-quick-modal h3{margin:0 0 8px;color:#111a33;font-size:24px;font-weight:950;letter-spacing:-.03em;}
      .pde-quick-modal p{margin:0 0 18px;color:#64748b;line-height:1.55;}
      .pde-quick-form{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
      .pde-quick-form .full{grid-column:1/-1;}
      .pde-quick-actions{grid-column:1/-1;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:6px;}
      .pde-quick-toast{position:fixed;right:22px;bottom:22px;z-index:9999;background:#111827;color:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 24px 70px rgba(15,23,42,.3);font-weight:850;}
      @media(max-width:760px){.pde-quick-form{grid-template-columns:1fr}.pde-quick-actions .btn{flex:1 1 140px}.pde-quick-toast{left:16px;right:16px;bottom:16px}}
    `;
    document.head.appendChild(style);
  }

  function toast(msg){
    const old = $('pdeQuickToast');
    if(old) old.remove();
    const t = document.createElement('div');
    t.id = 'pdeQuickToast';
    t.className = 'pde-quick-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),2800);
  }

  function optionList(selectId, selected){
    const src = $(selectId);
    if(!src) return '<option value="">No client selected</option>';
    return [...src.options].map(o=>`<option value="${esc(o.value)}" ${o.value===selected?'selected':''}>${esc(o.textContent)}</option>`).join('');
  }

  function closeModal(){ $('pdeQuickModal')?.remove(); }

  function openClientModal(){
    injectStyle();
    closeModal();
    const wrap = document.createElement('div');
    wrap.id = 'pdeQuickModal';
    wrap.className = 'pde-quick-modal-backdrop';
    wrap.innerHTML = `
      <div class="pde-quick-modal" role="dialog" aria-modal="true" aria-labelledby="pdeQuickTitle">
        <h3 id="pdeQuickTitle">Add New Client</h3>
        <p>Add a client without leaving the Job Cost page. The new client will be selected automatically.</p>
        <form class="pde-quick-form" id="pdeQuickClientForm">
          <label class="full">Client Name<input name="name" required placeholder="Client name"></label>
          <label>Phone<input name="phone" placeholder="Phone number"></label>
          <label>Email<input name="email" type="email" placeholder="Email address"></label>
          <label>Address 1<input name="address1" placeholder="Street / Community / Building"></label>
          <label>District<input name="district" placeholder="Castries / Gros Islet / Vieux Fort"></label>
          <label>Country<input name="country" value="Saint Lucia"></label>
          <label>Postal Address<input name="postalAddress" placeholder="Post Office / Postal code"></label>
          <div class="pde-quick-actions"><button type="button" class="btn secondary" data-close-quick>Cancel</button><button class="btn primary">Add Client</button></div>
        </form>
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-close-quick]').onclick = closeModal;
    wrap.addEventListener('click',e=>{ if(e.target === wrap) closeModal(); });
    const input = wrap.querySelector('[name="name"]');
    input?.focus();
    $('pdeQuickClientForm').onsubmit = e => {
      e.preventDefault();
      const q = e.target;
      const main = $('clientForm');
      if(!main){ alert('Client form not found.'); return; }
      const id = uid('client');
      main.elements.id.value = id;
      main.elements.name.value = q.elements.name.value;
      if(main.elements.address1) main.elements.address1.value = q.elements.address1.value;
      if(main.elements.district) main.elements.district.value = q.elements.district.value;
      if(main.elements.country) main.elements.country.value = q.elements.country.value;
      if(main.elements.postalAddress) main.elements.postalAddress.value = q.elements.postalAddress.value;
      const phoneBox = $('clientPhones');
      const emailBox = $('clientEmails');
      if(phoneBox){ phoneBox.innerHTML = `<div class="multi-row"><input type="tel" value="${esc(q.elements.phone.value)}"><button type="button" class="btn danger">−</button></div>`; }
      if(emailBox){ emailBox.innerHTML = `<div class="multi-row"><input type="email" value="${esc(q.elements.email.value)}"><button type="button" class="btn danger">−</button></div>`; }
      main.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      setTimeout(()=>{
        const sel = $('costClientSelect');
        if(sel) sel.value = id;
        closeModal();
        toast('Client added and selected.');
      },100);
    };
  }

  function openProjectModal(){
    injectStyle();
    closeModal();
    const selectedClient = $('costClientSelect')?.value || '';
    const wrap = document.createElement('div');
    wrap.id = 'pdeQuickModal';
    wrap.className = 'pde-quick-modal-backdrop';
    wrap.innerHTML = `
      <div class="pde-quick-modal" role="dialog" aria-modal="true" aria-labelledby="pdeQuickTitle">
        <h3 id="pdeQuickTitle">Add New Project</h3>
        <p>Add a project from the Job Cost page. The new project will be selected automatically.</p>
        <form class="pde-quick-form" id="pdeQuickProjectForm">
          <label class="full">Project Name<input name="name" required placeholder="Project name"></label>
          <label class="full">Client<select name="clientId">${optionList('costClientSelect', selectedClient)}</select></label>
          <label>Site Address 1<input name="siteAddress1" placeholder="Project site / community"></label>
          <label>Site District<input name="siteDistrict" placeholder="District"></label>
          <label>Site Country<input name="siteCountry" value="Saint Lucia"></label>
          <label>Status<select name="status"><option>Pending</option><option selected>Active</option><option>On Hold</option><option>Completed</option><option>Cancelled</option></select></label>
          <label class="full">Notes<textarea name="notes" rows="2" placeholder="Project notes"></textarea></label>
          <div class="pde-quick-actions"><button type="button" class="btn secondary" data-close-quick>Cancel</button><button class="btn primary">Add Project</button></div>
        </form>
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-close-quick]').onclick = closeModal;
    wrap.addEventListener('click',e=>{ if(e.target === wrap) closeModal(); });
    wrap.querySelector('[name="name"]')?.focus();
    $('pdeQuickProjectForm').onsubmit = e => {
      e.preventDefault();
      const q = e.target;
      const main = $('projectForm');
      if(!main){ alert('Project form not found.'); return; }
      const id = uid('project');
      main.elements.id.value = id;
      main.elements.name.value = q.elements.name.value;
      main.elements.clientId.value = q.elements.clientId.value;
      main.elements.status.value = q.elements.status.value;
      if(main.elements.deadline) main.elements.deadline.value = '';
      if(main.elements.siteAddress1) main.elements.siteAddress1.value = q.elements.siteAddress1.value;
      if(main.elements.siteDistrict) main.elements.siteDistrict.value = q.elements.siteDistrict.value;
      if(main.elements.siteCountry) main.elements.siteCountry.value = q.elements.siteCountry.value;
      if(main.elements.notes) main.elements.notes.value = q.elements.notes.value;
      main.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      setTimeout(()=>{
        const psel = $('costProjectSelect');
        const csel = $('costClientSelect');
        if(psel) psel.value = id;
        if(csel && q.elements.clientId.value) csel.value = q.elements.clientId.value;
        closeModal();
        toast('Project added and selected.');
      },100);
    };
  }

  function addButtons(){
    injectStyle();
    const clientSelect = $('costClientSelect');
    const projectSelect = $('costProjectSelect');
    if(clientSelect && !clientSelect.closest('label')?.querySelector('[data-quick-add-client]')){
      const row = document.createElement('div');
      row.className = 'pde-quick-add-row';
      row.innerHTML = '<button type="button" class="btn small secondary" data-quick-add-client>+ Add New Client</button>';
      clientSelect.closest('label')?.appendChild(row);
      row.querySelector('[data-quick-add-client]').onclick = openClientModal;
    }
    if(projectSelect && !projectSelect.closest('label')?.querySelector('[data-quick-add-project]')){
      const row = document.createElement('div');
      row.className = 'pde-quick-add-row';
      row.innerHTML = '<button type="button" class="btn small secondary" data-quick-add-project>+ Add New Project</button>';
      projectSelect.closest('label')?.appendChild(row);
      row.querySelector('[data-quick-add-project]').onclick = openProjectModal;
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',addButtons); else addButtons();
})();