const STRUCTURAL_DRAWING_OPTIONS = [
  'Foundation Plan and Details',
  'Column Details',
  'Stair Plan and Details',
  'First Floor Reinforcement Layout and Sections',
  'First Floor beam sections and Details',
  'Roof Beam sections and details',
  'Roof Plan and Details',
  'Structural Details'
];

function safeSlug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function injectStructuralDrawingOptions() {
  document.querySelectorAll('.drawing-section').forEach(section => {
    const heading = section.querySelector('strong')?.textContent?.trim();
    const placeholder = section.querySelector('.drawing-options-placeholder');
    if (heading !== 'Structural' || !placeholder || placeholder.dataset.structuralReady === 'true') return;

    const sectionKey = section.closest('[data-project-type-section]')?.dataset.projectTypeSection || 'project-type';
    const customId = `custom-structural-${safeSlug(sectionKey)}`;

    placeholder.innerHTML = STRUCTURAL_DRAWING_OPTIONS.map(option => `
      <label class="drawing-check" style="display:flex;gap:8px;align-items:center;font-weight:600;color:#1f2937;margin:6px 0;">
        <input type="checkbox" style="width:auto;" data-drawing-category="structural" value="${option}">
        <span>${option}</span>
      </label>
    `).join('') + `
      <div class="drawing-custom" data-custom-category="structural" style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb;">
        <strong style="font-size:13px;margin-bottom:8px;">Custom Structural Drawings</strong>
        <div class="custom-drawing-list" id="${customId}"></div>
        <button type="button" class="btn small plus-row" data-add-custom-structural="${customId}">+ Add Custom</button>
      </div>
    `;
    placeholder.dataset.structuralReady = 'true';
  });
}

function addCustomStructuralDrawing(containerId, value = '') {
  const box = document.getElementById(containerId);
  if (!box) return;
  const row = document.createElement('div');
  row.className = 'multi-row custom-drawing-row';
  row.innerHTML = `<input type="text" data-custom-drawing-input="structural" value="${esc(value)}" placeholder="Custom structural drawing name"><button type="button" class="btn danger">−</button>`;
  row.querySelector('button').onclick = () => row.remove();
  box.append(row);
}

const previousReadDrawingSelections = readDrawingSelections;
readDrawingSelections = function () {
  const drawings = previousReadDrawingSelections ? previousReadDrawingSelections() : { site: [], architectural: [], architecturalCustom: [] };
  const section = activeTypeSection();
  drawings.structural = [];
  drawings.structuralCustom = [];
  if (!section) return drawings;
  section.querySelectorAll('[data-drawing-category="structural"]:checked').forEach(input => drawings.structural.push(input.value));
  section.querySelectorAll('[data-custom-drawing-input="structural"]').forEach(input => {
    const value = input.value.trim();
    if (value) drawings.structuralCustom.push(value);
  });
  return drawings;
};

const previousFillDrawingSelections = fillDrawingSelections;
fillDrawingSelections = function (drawings = {}) {
  if (previousFillDrawingSelections) previousFillDrawingSelections(drawings);
  const selectedStructural = asArray(drawings.structural);
  document.querySelectorAll('[data-drawing-category="structural"]').forEach(input => {
    input.checked = selectedStructural.includes(input.value);
  });
  const section = activeTypeSection();
  if (section) {
    const customBox = section.querySelector('[data-custom-category="structural"] .custom-drawing-list');
    asArray(drawings.structuralCustom).forEach(value => addCustomStructuralDrawing(customBox?.id, value));
  }
};

const previousRenderCosts = renderCosts;
renderCosts = function () {
  const table = document.getElementById('costsTable');
  if (!table) return previousRenderCosts();
  table.innerHTML = state.costs.map(c => {
    const site = asArray(c.drawings?.site).join(', ');
    const arch = asArray(c.drawings?.architectural).concat(asArray(c.drawings?.architecturalCustom)).join(', ');
    const structural = asArray(c.drawings?.structural).concat(asArray(c.drawings?.structuralCustom)).join(', ');
    return `<tr><td>${esc(c.date || '')}</td><td><b>${esc(c.title || '')}</b>${site ? `<br><span class="muted">Site drawings: ${esc(site)}</span>` : ''}${arch ? `<br><span class="muted">Architectural drawings: ${esc(arch)}</span>` : ''}${structural ? `<br><span class="muted">Structural drawings: ${esc(structural)}</span>` : ''}</td><td>${esc(client(c.clientId).name || '')}</td><td>${esc(project(c.projectId).name || '')}</td><td><b>${money(costTotal(c))}</b></td><td><div class="row-actions"><button class="btn small secondary" onclick="editCost('${c.id}')">Edit</button><button class="btn small" onclick="invoiceFromCost('${c.id}')">Invoice</button><button class="btn small danger" onclick="deleteCost('${c.id}')">Delete</button></div></td></tr>`;
  }).join('') || '<tr><td colspan="6">No job costs added yet.</td></tr>';
};

const previousInvoiceFromCost = invoiceFromCost;
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
    .concat(asArray(c.drawings?.structural), asArray(c.drawings?.structuralCustom));
  selectedDrawings.forEach(d => addLineItem({ description: d, qty: 1, rate: 0 }));
  (c.items || []).forEach(item => addLineItem({ description: item.description, qty: item.qty, rate: item.rate }));
  if (!selectedDrawings.length && !(c.items || []).length) addLineItem();
  showView('invoices');
};

document.addEventListener('click', event => {
  const custom = event.target.closest('[data-add-custom-structural]');
  if (custom) addCustomStructuralDrawing(custom.dataset.addCustomStructural);
});

injectStructuralDrawingOptions();
renderCosts();
