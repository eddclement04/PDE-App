// PDE robust invoice edit workflow - mirrors Job Cost edit behavior
(function(){
  const APP_KEY = 'pde_project_invoice_app_v1';
  const DRAFT_KEY = 'pde_project_invoice_app_form_drafts_v1';

  function $(id){ return document.getElementById(id); }
  function readState(){ try{return JSON.parse(localStorage.getItem(APP_KEY)) || {}}catch(e){return {}} }
  function writeState(data){ localStorage.setItem(APP_KEY, JSON.stringify(data)); }
  function safe(v){ return String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
  function uid(prefix){ return prefix + '_' + Date.now() + '_' + Math.random().toString(16).slice(2); }

  function clearDraft(formId){
    try{
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY)) || {};
      delete d[formId];
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    }catch(e){}
  }

  function ensureInvoiceIds(){
    const state = readState();
    if(!Array.isArray(state.invoices)) return;
    let changed = false;
    state.invoices.forEach((inv,index)=>{
      if(!inv.id){ inv.id = 'invoice_' + Date.now() + '_' + index + '_' + Math.random().toString(16).slice(2); changed = true; }
    });
    if(changed){
      writeState(state);
      setTimeout(()=>location.reload(),120);
    }
  }

  function injectStyle(){
    if($('pdeInvoiceEditStyle')) return;
    const style = document.createElement('style');
    style.id = 'pdeInvoiceEditStyle';
    style.textContent = `
      .pde-editing-invoice-note{padding:12px 14px;border:1px solid #bfdbfe;background:#eff6ff;color:#0755f5;border-radius:12px;font-weight:850;margin-bottom:14px;grid-column:1/-1;}
      .pde-invoice-edit-toast{position:fixed;right:22px;bottom:22px;z-index:9999;background:#111827;color:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 24px 70px rgba(15,23,42,.3);font-weight:850;}
      @media(max-width:760px){.pde-invoice-edit-toast{left:16px;right:16px;bottom:16px}}
    `;
    document.head.appendChild(style);
  }

  function toast(text){
    injectStyle();
    const old = $('pdeInvoiceEditToast');
    if(old) old.remove();
    const t = document.createElement('div');
    t.id = 'pdeInvoiceEditToast';
    t.className = 'pde-invoice-edit-toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),3000);
  }

  function setInvoiceMode(editing){
    const form = $('invoiceForm');
    if(!form) return;
    form.dataset.editing = editing ? 'true' : 'false';
    const submit = form.querySelector('button[type="submit"], button:not([type]), .btn.primary');
    if(submit) submit.textContent = editing ? 'Update Invoice' : 'Save Invoice';

    let cancel = form.querySelector('[data-invoice-cancel-edit]');
    const actions = form.querySelector('.actions') || form;
    if(!cancel){
      cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn secondary';
      cancel.dataset.invoiceCancelEdit = 'true';
      cancel.textContent = 'Cancel Edit';
      cancel.onclick = function(){
        if(typeof window.newInvoice === 'function') window.newInvoice();
        setInvoiceMode(false);
        const note = $('pdeInvoiceEditNotice');
        if(note) note.remove();
        clearDraft('invoiceForm');
      };
      actions.appendChild(cancel);
    }
    cancel.style.display = editing ? 'inline-flex' : 'none';

    let note = $('pdeInvoiceEditNotice');
    if(editing){
      if(!note){
        note = document.createElement('div');
        note.id = 'pdeInvoiceEditNotice';
        note.className = 'pde-editing-invoice-note full';
        form.insertBefore(note, form.firstChild.nextSibling || form.firstChild);
      }
      note.textContent = 'Editing saved Invoice. Make your changes, then click Update Invoice.';
    }else if(note){
      note.remove();
    }
  }

  function showInvoicesView(){
    if(typeof window.showView === 'function') window.showView('invoices');
    else document.querySelector('.nav-btn[data-view="invoices"]')?.click();
  }

  function addLineRow(item){
    const box = $('lineItems');
    if(!box) return;
    if(typeof window.addLineItem === 'function'){
      window.addLineItem(item || {});
      return;
    }
    const r = document.createElement('div');
    r.className = 'line';
    r.innerHTML = `<label>Description<input class="desc" value="${safe(item?.description || '')}"></label><label>Unit<input class="unit" value="${safe(item?.unit || 'Item')}"></label><label>Qty<input class="qty" type="number" step="0.01" value="${item?.qty ?? 1}"></label><label>Rate<input class="rate" type="number" step="0.01" value="${item?.rate ?? 0}"></label><button type="button" class="btn danger">×</button>`;
    r.querySelector('button').onclick = () => r.remove();
    box.appendChild(r);
  }

  function editInvoiceDirect(id){
    ensureInvoiceIds();
    clearDraft('invoiceForm');
    const state = readState();
    const invoice = (state.invoices || []).find(i=>String(i.id) === String(id));
    if(!invoice){ alert('This invoice could not be found. Refresh the app and try again.'); return; }

    const form = $('invoiceForm');
    if(!form) return;
    ['id','invoiceNo','date','dueDate','clientId','projectId','paid','notes'].forEach(k=>{
      if(form.elements[k]) form.elements[k].value = invoice[k] ?? '';
    });

    const box = $('lineItems');
    if(box) box.innerHTML = '';
    (invoice.items && invoice.items.length ? invoice.items : [{}]).forEach(addLineRow);

    showInvoicesView();
    setInvoiceMode(true);
    setTimeout(()=>form.scrollIntoView({behavior:'smooth', block:'start'}),150);
    toast('Invoice loaded for editing.');
  }

  function makeEditButtonsReliable(){
    const table = $('invoicesTable');
    if(!table) return;
    [...table.querySelectorAll('button')].forEach(btn=>{
      const onclick = btn.getAttribute('onclick') || '';
      const match = onclick.match(/editInvoice\(['"]([^'"]+)['"]\)/);
      if(match){
        btn.type = 'button';
        btn.onclick = function(e){ e.preventDefault(); editInvoiceDirect(match[1]); };
      }
    });
  }

  function setup(){
    injectStyle();
    ensureInvoiceIds();
    window.editInvoice = editInvoiceDirect;
    makeEditButtonsReliable();
    setInterval(makeEditButtonsReliable,1500);

    const form = $('invoiceForm');
    if(form && form.dataset.invoiceEditSubmitWatch !== 'true'){
      form.dataset.invoiceEditSubmitWatch = 'true';
      form.addEventListener('submit',()=>{
        if(form.dataset.editing === 'true'){
          setTimeout(()=>{ setInvoiceMode(false); clearDraft('invoiceForm'); },350);
        }
      },true);
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',setup); else setup();
})();
