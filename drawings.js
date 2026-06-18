const SITE_DRAWING_OPTIONS = [
  'Location Plan',
  'Site Plan',
  'Site Details',
  'Traffic Management Plan',
  'Site Management Plan',
  'Solid Waste Management Plan'
];

function drawingOptionId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function injectSiteDrawingOptions() {
  document.querySelectorAll('.drawing-section').forEach(section => {
    const heading = section.querySelector('strong')?.textContent?.trim();
    const placeholder = section.querySelector('.drawing-options-placeholder');
    if (heading !== 'Site' || !placeholder || placeholder.dataset.ready === 'true') return;

    placeholder.innerHTML = SITE_DRAWING_OPTIONS.map(option => `
      <label class="drawing-check">
        <input type="checkbox" data-drawing-category="site" value="${option}">
        <span>${option}</span>
      </label>
    `).join('');
    placeholder.dataset.ready = 'true';
  });
}

function activeProjectTypeSection() {
  const selectedType = document.getElementById('costProjectType')?.value || '';
  if (!selectedType) return null;
  return document.querySelector(`[data-project-type-section="${selectedType}"]`);
}

function readDrawingSelections() {
  const section = activeProjectTypeSection();
  const drawings = { site: [] };
  if (!section) return drawings;
  section.querySelectorAll('[data-drawing-category="site"]:checked').forEach(input => {
    drawings.site.push(input.value);
  });
  return drawings;
}

function clearDrawingSelections() {
  document.querySelectorAll('[data-drawing-category]').forEach(input => {
    input.checked = false;
  });
}

function fillDrawingSelections(drawings = {}) {
  clearDrawingSelections();
  const siteDrawings = Array.isArray(drawings.site) ? drawings.site : [];
  document.querySelectorAll('[data-drawing-category="site"]').forEach(input => {
    input.checked = siteDrawings.includes(input.value);
  });
}

function patchCostFormDrawingSupport() {
  const form = document.getElementById('costForm');
  if (!form || form.dataset.drawingPatch === 'true') return;
  form.dataset.drawingPatch = 'true';

  form.onsubmit = e => {
    e.preventDefault();
    let f = e.target;
    let items = readCostItems();
    if (!items.length) return alert('Add at least one job/task cost item.');
    let c = {
      id: f.elements.id.value || uid('cost'),
      title: f.elements.title.value.trim(),
      date: f.elements.date.value,
      clientId: f.elements.clientId.value,
      projectId: f.elements.projectId.value,
      projectType: f.elements.projectType.value,
      drawings: readDrawingSelections(),
      notes: f.elements.notes.value.trim(),
      items
    };
    let idx = state.costs.findIndex(x => x.id === c.id);
    idx >= 0 ? state.costs[idx] = c : state.costs.push(c);
    newCost();
    saveState();
  };
}

const originalNewCost = newCost;
newCost = function () {
  originalNewCost();
  clearDrawingSelections();
};

const originalEditCost = editCost;
editCost = function (id) {
  originalEditCost(id);
  const c = jobCost(id);
  fillDrawingSelections(c.drawings || {});
};

injectSiteDrawingOptions();
patchCostFormDrawingSupport();
