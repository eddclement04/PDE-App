// PDE invoice list fallback and local backup recovery
(function(){
  const APP_KEY = 'pde_project_invoice_app_v1';

  function $(id){ return document.getElementById(id); }
  function money(n){ return new Intl.NumberFormat('en-LC',{style:'currency',currency:'XCD'}).format(Number(n||0)); }
  function safe(v){ return String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
  function readJson(key){ try{return JSON.parse(localStorage.getItem(key)) || null}catch(e){return null} }
  function writeJson(key,data){ localStorage.setItem(key, JSON.stringify(data)); }
  function total(items){ return (items||[]).reduce((a,x)=>a + Number(x.qty||0) * Number(x.rate||0),0); }
  function paidFor(data,invoice){ return Number(invoice.paid||0) + (data.payments||[]).filter(p=>p.invoiceId===invoice.id).reduce((a,p)=>a+Number(p.amount||0),0); }
  function balance(data,invoice){ return total(invoice.items) - paidFor(data,invoice); }
  function clientName(data,id){ return (data.clients||[]).find(c=>c.id===id)?.name || 'No client'; }
  function projectName(data,id){ return (data.projects||[]).find(p=>p.id===id)?.name || 'No project'; }

  function ensureIds(data){
    let changed = false;
    (data.invoices||[]).forEach((i,index)=>{ if(!i.id){ i.id = 'invoice_' + Date.now() + '_' + index + '_' + Math.random().toString(16).slice(2); changed = true; } });
    if(changed) writeJson(APP_KEY,data);
    return data;
  }

  function latestInvoiceBackup(){
    const candidates = [];
    for(let i=0;i<localStorage.length;i++){
      const key = localStorage.key(i);
      if(!key || !key.startsWith(APP_KEY + '_backup_')) continue;
      const data = readJson(key);
      if(data && Array.isArray(data.invoices) && data.invoices.length){
        candidates.push({key,data,count:data.invoices.length});
      }
    }
    candidates.sort((a,b)=>String(b.key).localeCompare(String(a.key)));
    return candidates[0] || null;
  }

  function renderRestoreRow(table, backup){
    if(!table || !backup) return false;
    table.innerHTML = `<tr><td colspan="9"><strong>No invoices are in the current data file.</strong><br><span class="muted">A local backup was found with ${backup.count} invoice${backup.count===1?'':'s'}.</span><br><br><button type="button" class="btn primary" id="restoreInvoiceBackupBtn">Restore Invoice Backup</button></td></tr>`;
    const btn = $('restoreInvoiceBackupBtn');
    if(btn){
      btn.onclick = function(){
        if(!confirm('Restore the backup that contains your saved invoices? This will replace the current browser data with that backup.')) return;
        writeJson(APP_KEY, backup.data);
        setTimeout(()=>location.reload(),250);
      };
    }
    return true;
  }

  function renderInvoicesFallback(){
    const table = $('invoicesTable');
    if(!table) return;
    let data = readJson(APP_KEY) || {};
    data = ensureIds(data);
    const invoices = data.invoices || [];

    if(!invoices.length){
      const currentText = table.textContent || '';
      if(/No invoices/i.test(currentText)) renderRestoreRow(table, latestInvoiceBackup());
      return;
    }

    const appSaysEmpty = /No invoices/i.test(table.textContent || '');
    const hasRenderedRows = table.querySelectorAll('tr').length && !appSaysEmpty;
    if(hasRenderedRows) return;

    table.innerHTML = invoices.map(inv=>{
      const bal = balance(data,inv);
      const status = bal <= 0 ? 'Paid' : 'Unpaid';
      return `<tr>
        <td><b>${safe(inv.invoiceNo || '-')}</b></td>
        <td>${safe(clientName(data,inv.clientId))}</td>
        <td>${safe(projectName(data,inv.projectId))}</td>
        <td>${safe(inv.date || '')}</td>
        <td>${money(total(inv.items))}</td>
        <td>${money(paidFor(data,inv))}</td>
        <td>${money(bal)}</td>
        <td>${safe(status)}</td>
        <td><button class="btn small" onclick="printInvoice('${safe(inv.id)}')">Preview</button> <button class="btn small" onclick="paymentFromInvoice('${safe(inv.id)}')">Payment</button> <button class="btn small secondary" onclick="editInvoice('${safe(inv.id)}')">Edit</button> <button class="btn small danger" onclick="deleteInvoice('${safe(inv.id)}')">Delete</button></td>
      </tr>`;
    }).join('');
  }

  function start(){
    renderInvoicesFallback();
    setInterval(renderInvoicesFallback,3000);
    window.addEventListener('storage',renderInvoicesFallback);
    document.addEventListener('submit',()=>setTimeout(renderInvoicesFallback,600),true);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start); else start();
})();