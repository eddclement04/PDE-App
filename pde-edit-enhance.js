// PDE edit workflow helper for Job Costs and Invoices
(function(){
  function $(id){ return document.getElementById(id); }

  function submitButton(form){
    return form ? form.querySelector('button[type="submit"], button:not([type]), .btn.primary') : null;
  }

  function ensureCancelButton(formId, clearFn, label){
    const form = $(formId);
    if(!form) return null;
    const actions = form.querySelector('.actions') || form;
    let btn = form.querySelector('[data-cancel-edit="'+formId+'"]');
    if(!btn){
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn secondary';
      btn.dataset.cancelEdit = formId;
      btn.textContent = 'Cancel Edit';
      btn.style.display = 'none';
      btn.addEventListener('click', function(){
        clearFn();
        setMode(formId, false, label);
        hideNotice(formId);
      });
      actions.appendChild(btn);
    }
    return btn;
  }

  function setMode(formId, editing, label){
    const form = $(formId);
    if(!form) return;
    const btn = submitButton(form);
    const cancel = form.querySelector('[data-cancel-edit="'+formId+'"]');
    if(btn) btn.textContent = editing ? 'Update '+label : 'Save '+label;
    if(cancel) cancel.style.display = editing ? 'inline-flex' : 'none';
    form.dataset.editing = editing ? 'true' : 'false';
  }

  function addNotice(formId, text){
    const form = $(formId);
    if(!form) return;
    let note = form.querySelector('.editing-notice');
    if(!note){
      note = document.createElement('div');
      note.className = 'editing-notice full';
      note.style.cssText = 'padding:12px 14px;border:1px solid #bfdbfe;background:#eff6ff;color:#0755f5;border-radius:12px;font-weight:800;';
      form.insertBefore(note, form.firstChild.nextSibling || form.firstChild);
    }
    note.textContent = text;
    note.hidden = false;
  }

  function hideNotice(formId){
    const note = $(formId)?.querySelector('.editing-notice');
    if(note) note.hidden = true;
  }

  function scrollToForm(formId){
    const form = $(formId);
    if(form) form.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function setup(){
    if(window.__pdeEditEnhanceReady) return;
    window.__pdeEditEnhanceReady = true;

    ensureCancelButton('costForm', function(){
      if(typeof window.newCost === 'function') window.newCost();
      hideNotice('costForm');
    }, 'Job Cost');

    ensureCancelButton('invoiceForm', function(){
      if(typeof window.newInvoice === 'function') window.newInvoice();
      hideNotice('invoiceForm');
    }, 'Invoice');

    const oldEditCost = window.editCost;
    if(typeof oldEditCost === 'function'){
      window.editCost = function(id){
        oldEditCost(id);
        setMode('costForm', true, 'Job Cost');
        addNotice('costForm', 'Editing saved Job Cost. Make your changes, then click Update Job Cost.');
        scrollToForm('costForm');
      };
    }

    const oldEditInvoice = window.editInvoice;
    if(typeof oldEditInvoice === 'function'){
      window.editInvoice = function(id){
        oldEditInvoice(id);
        setMode('invoiceForm', true, 'Invoice');
        addNotice('invoiceForm', 'Editing saved Invoice. Make your changes, then click Update Invoice.');
        scrollToForm('invoiceForm');
      };
    }

    const costForm = $('costForm');
    if(costForm){
      costForm.addEventListener('submit', function(){
        setTimeout(function(){ setMode('costForm', false, 'Job Cost'); hideNotice('costForm'); }, 300);
      }, true);
    }

    const invoiceForm = $('invoiceForm');
    if(invoiceForm){
      invoiceForm.addEventListener('submit', function(){
        setTimeout(function(){ setMode('invoiceForm', false, 'Invoice'); hideNotice('invoiceForm'); }, 300);
      }, true);
    }

    const clearCost = $('clearCostBtn');
    if(clearCost) clearCost.addEventListener('click', function(){
      setTimeout(function(){ setMode('costForm', false, 'Job Cost'); hideNotice('costForm'); }, 50);
    });

    const clearInvoice = $('clearInvoiceBtn');
    if(clearInvoice) clearInvoice.addEventListener('click', function(){
      setTimeout(function(){ setMode('invoiceForm', false, 'Invoice'); hideNotice('invoiceForm'); }, 50);
    });
  }

  if(document.readyState === 'loading'){
    window.addEventListener('load', setup);
  }else{
    setup();
  }
})();
