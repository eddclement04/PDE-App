// PDE app patch: custom drawing button + section totals/grand total
(function(){
  const money = n => new Intl.NumberFormat('en-LC',{style:'currency',currency:'XCD'}).format(Number(n||0));
  const sectionLabels = {site:'Site',architectural:'Architectural',structural:'Structural',electrical:'Electrical',plumbing:'Plumbing',hvac:'HVAC'};
  let refreshing = false;

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

    let grand = 0;
    Object.keys(sectionLabels).forEach(cat=>{
      const rows = [...box.querySelectorAll(`.cost-line[data-drawing-cat="${cat}"]`)];
      if(!rows.length) return;
      let sectionTotal = rows.reduce((sum,row)=>sum + calcRow(row),0);
      grand += sectionTotal;
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
      row.querySelector('button').onclick = () => { row.remove(); setTimeout(refreshTotals,0); };
      list.appendChild(row);
    }
    setTimeout(refreshTotals,0);
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
  });
  document.addEventListener('input', e => {
    if(e.target.matches('[data-custom-drawing-input], .qty, .rate')) setTimeout(refreshTotals,0);
  });

  window.addEventListener('load', () => {
    const box = document.getElementById('costItems');
    if(box){
      new MutationObserver(()=>setTimeout(refreshTotals,0)).observe(box,{childList:true,subtree:true});
      refreshTotals();
    }
  });
})();
