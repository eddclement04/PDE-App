const PLUMBING_DRAWING_OPTIONS = [
  'Plumbing Isometrics',
  'Ground Floor Plumbing Layout',
  'First Floor Plumbing Layout'
];

function injectPlumbingDrawingOptions() {
  document.querySelectorAll('.drawing-section').forEach(section => {
    const heading = section.querySelector('strong')?.textContent?.trim();
    const placeholder = section.querySelector('.drawing-options-placeholder');
    if (heading !== 'Plumbing' || !placeholder || placeholder.dataset.plumbingReady === 'true') return;

    const sectionKey = section.closest('[data-project-type-section]')?.dataset.projectTypeSection || 'project-type';
    const customId = `custom-plumbing-${slug(sectionKey)}`;

    placeholder.innerHTML = PLUMBING_DRAWING_OPTIONS.map(option => `
      <label class="drawing-check" style="display:flex;gap:8px;align-items:center;font-weight:600;color:#1f2937;margin:6px 0;">
        <input type="checkbox" style="width:auto;" data-drawing-category="plumbing" value="${esc(option)}">
        <span>${esc(option)}</span>
      </label>
    `).join('') + `
      <div class="drawing-custom" data-custom-category="plumbing" style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb;">
        <strong style="font-size:13px;margin-bottom:8px;">Custom Plumbing Drawings</strong>
        <div class="custom-drawing-list" id="${customId}"></div>
        <button type="button" class="btn small plus-row" data-add-custom-drawing="${customId}">+ Add Custom</button>
      </div>
    `;
    placeholder.dataset.plumbingReady = 'true';
  });
}

const previousReadDrawingSelectionsForPlumbing = readDrawingSelections;
readDrawingSelections = function () {
  const drawings = previousReadDrawingSelectionsForPlumbing ? previousReadDrawingSelectionsForPlumbing() : {};
  const section = activeTypeSection();
  drawings.plumbing = [];
  drawings.plumbingCustom = [];
  if (!section) return drawings;
  section.querySelectorAll('[data-drawing-category="plumbing"]:checked').forEach(input => drawings.plumbing.push(input.value));
  section.querySelectorAll('[data-custom-drawing-input="plumbing"]').forEach(input => {
    const value = input.value.trim();
    if (value) drawings.plumbingCustom.push(value);
  });
  return drawings;
};

const previousFillDrawingSelectionsForPlumbing = fillDrawingSelections;
fillDrawingSelections = function (drawings = {}) {
  if (previousFillDrawingSelectionsForPlumbing) previousFillDrawingSelectionsForPlumbing(drawings);
  const selectedPlumbing = asArray(drawings.plumbing);
  document.querySelectorAll('[data-drawing-category="plumbing"]').forEach(input => {
    input.checked = selectedPlumbing.includes(input.value);
  });
  const section = activeTypeSection();
  if (section) {
    const customBox = section.querySelector('[data-custom-category="plumbing"] .custom-drawing-list');
    asArray(drawings.plumbingCustom).forEach(value => addCustomDrawing(customBox?.id, value));
  }
};

renderCosts = function () {
  const table = document.getElementById('costsTable');
  if (!table) return;
  table.innerHTML = state.costs.map(c => {
    const site = asArray(c.drawings?.site).join(', ');
    const arch = asArray(c.drawings?.architectural).concat(asArray(c.drawings?.architecturalCustom)).join(', ');
    const structural = asArray(c.drawings?.structural).concat(asArray(c.drawings?.structuralCustom)).join(', ');
    const electrical = asArray(c.drawings?.electrical).concat(asArray(c.drawings?.electricalCustom)).join(', ');
    const plumbing = asArray(c.drawings?.plumbing).concat(asArray(c.drawings?.plumbingCustom)).join(', ');
    return `<tr><td>${esc(c.date || '')}</td><td><b>${esc(c.title || '')}</b>${site ? `<br><span class="muted">Site drawings: ${esc(site)}</span>` : ''}${arch ? `<br><span class="muted">Architectural drawings: ${esc(arch)}</span>` : ''}${structural ? `<br><span class="muted">Structural drawings: ${esc(structural)}</span>` : ''}${electrical ? `<br><span class="muted">Electrical drawings: ${esc(electrical)}</span>` : ''}${plumbing ? `<br><span class="muted">Plumbing drawings: ${esc(plumbing)}</span>` : ''}</td><td>${esc(client(c.clientId).name || '')}</td><td>${esc(project(c.projectId).name || '')}</td><td><b>${money(costTotal(c))}</b></td><td><div class="row-actions"><button class="btn small secondary" onclick="editCost('${c.id}')">Edit</button><button class="btn small" onclick="invoiceFromCost('${c.id}')">Invoice</button><button class="btn small danger" onclick="deleteCost('${c.id}')">Delete</button></div></td></tr>`;
  }).join('') || '<tr><td colspan="6">No job costs added yet.</td></tr>';
};

invoiceFromCost = function (id) {
  const c = jobCost(id);
  const f = document.getElementById('invoiceForm');
  newInvoice();
  f.elements.clientId.value = c.clientId || '';
  f.elements.projectId.value = c.projectId || '';
  f.elements.notes.value = c.notes || 'Thank you for your business.';
  document.getElementById('lineItems').innerHTML = '';
  const selectedDrawings = asArray(c.drawings?.site)
    .concat(asArray(c.drawings?.architectural), asArray(c.drawings?.architecturalCustom))
    .concat(asArray(c.drawings?.structural), asArray(c.drawings?.structuralCustom))
    .concat(asArray(c.drawings?.electrical), asArray(c.drawings?.electricalCustom))
    .concat(asArray(c.drawings?.plumbing), asArray(c.drawings?.plumbingCustom));
  selectedDrawings.forEach(d => addLineItem({ description: d, qty: 1, rate: 0 }));
  (c.items || []).forEach(item => addLineItem({ description: item.description, qty: item.qty, rate: item.rate }));
  if (!selectedDrawings.length && !(c.items || []).length) addLineItem();
  showView('invoices');
};

injectPlumbingDrawingOptions();
renderCosts();
