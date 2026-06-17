const STORAGE_KEY = "pde_project_invoice_app_v1";

const defaultState = {
  settings: {
    businessName: "Perspective Designs and Estimates",
    businessPhone: "",
    businessEmail: "",
    businessAddress: "Saint Lucia",
    paymentDetails: "",
    invoicePrefix: "PDE-INV"
  },
  clients: [],
  projects: [],
  invoices: []
};

let state = loadState();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return structuredClone(defaultState);
    const parsed = JSON.parse(stored);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      settings: { ...structuredClone(defaultState).settings, ...(parsed.settings || {}) },
      clients: parsed.clients || [],
      projects: parsed.projects || [],
      invoices: parsed.invoices || []
    };
  } catch (error) {
    console.error("Could not load saved data:", error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function money(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-LC", {
    style: "currency",
    currency: "XCD"
  }).format(amount);
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getClient(id) {
  return state.clients.find(client => client.id === id);
}

function getProject(id) {
  return state.projects.find(project => project.id === id);
}

function invoiceTotal(invoice) {
  return (invoice.items || []).reduce((sum, item) => {
    return sum + Number(item.qty || 0) * Number(item.rate || 0);
  }, 0);
}

function invoiceBalance(invoice) {
  return invoiceTotal(invoice) - Number(invoice.paid || 0);
}

function paymentStatus(total, paid) {
  total = Number(total || 0);
  paid = Number(paid || 0);
  if (paid <= 0) return "Unpaid";
  if (paid >= total) return "Paid";
  return "Part Paid";
}

function statusClass(status) {
  return String(status || "")
    .toLowerCase()
    .replaceAll(" ", "-");
}

function nextInvoiceNumber() {
  const prefix = state.settings.invoicePrefix || "PDE-INV";
  const numbers = state.invoices
    .map(inv => String(inv.invoiceNo || ""))
    .filter(no => no.startsWith(prefix))
    .map(no => Number(no.replace(prefix, "").replace(/[^0-9]/g, "")))
    .filter(Boolean);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function renderAll() {
  renderSelects();
  renderDashboard();
  renderClients();
  renderProjects();
  renderInvoices();
  renderSettings();
}

function renderSelects() {
  const clientOptions = [
    `<option value="">Select client</option>`,
    ...state.clients.map(client => `<option value="${client.id}">${escapeHTML(client.name)}</option>`)
  ].join("");

  $("#projectClientSelect").innerHTML = clientOptions;
  $("#invoiceClientSelect").innerHTML = clientOptions;

  const projectOptions = [
    `<option value="">Select project</option>`,
    ...state.projects.map(project => `<option value="${project.id}">${escapeHTML(project.name)}</option>`)
  ].join("");

  $("#invoiceProjectSelect").innerHTML = projectOptions;
}

function renderDashboard() {
  $("#statClients").textContent = state.clients.length;
  $("#statProjects").textContent = state.projects.length;
  $("#statActiveProjects").textContent = state.projects.filter(p => p.status === "Active").length;

  const unpaid = state.invoices.reduce((sum, invoice) => sum + Math.max(invoiceBalance(invoice), 0), 0);
  $("#statUnpaid").textContent = money(unpaid);

  const recentProjects = state.projects.slice(-5).reverse();
  $("#recentProjects").innerHTML = recentProjects.length
    ? recentProjects.map(project => {
      const client = getClient(project.clientId);
      return `
        <div class="mini-card">
          <strong>${escapeHTML(project.name)}</strong>
          <span>${escapeHTML(client?.name || "No client")} • ${escapeHTML(project.status || "")} • Balance: ${money((project.fee || 0) - (project.paid || 0))}</span>
        </div>
      `;
    }).join("")
    : "No projects added yet.";

  const recentInvoices = state.invoices.slice(-5).reverse();
  $("#recentInvoices").innerHTML = recentInvoices.length
    ? recentInvoices.map(invoice => {
      const client = getClient(invoice.clientId);
      const total = invoiceTotal(invoice);
      const balance = invoiceBalance(invoice);
      return `
        <div class="mini-card">
          <strong>${escapeHTML(invoice.invoiceNo)}</strong>
          <span>${escapeHTML(client?.name || "No client")} • ${money(total)} • Balance: ${money(balance)}</span>
        </div>
      `;
    }).join("")
    : "No invoices added yet.";
}

function renderClients() {
  const tbody = $("#clientsTable");

  if (!state.clients.length) {
    tbody.innerHTML = `<tr><td colspan="5">No clients added yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.clients.map(client => `
    <tr>
      <td><strong>${escapeHTML(client.name)}</strong></td>
      <td>${escapeHTML(client.phone)}</td>
      <td>${escapeHTML(client.email)}</td>
      <td>${escapeHTML(client.address)}</td>
      <td>
        <div class="row-actions">
          <button class="btn small secondary" onclick="editClient('${client.id}')">Edit</button>
          <button class="btn small danger" onclick="deleteClient('${client.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderProjects() {
  const search = $("#projectSearch")?.value?.toLowerCase() || "";
  const status = $("#projectStatusFilter")?.value || "";

  let projects = [...state.projects];

  if (status) {
    projects = projects.filter(project => project.status === status);
  }

  if (search) {
    projects = projects.filter(project => {
      const client = getClient(project.clientId);
      return [
        project.name,
        project.location,
        project.serviceType,
        project.status,
        client?.name
      ].join(" ").toLowerCase().includes(search);
    });
  }

  const tbody = $("#projectsTable");

  if (!projects.length) {
    tbody.innerHTML = `<tr><td colspan="8">No projects found.</td></tr>`;
    return;
  }

  tbody.innerHTML = projects.map(project => {
    const client = getClient(project.clientId);
    const fee = Number(project.fee || 0);
    const paid = Number(project.paid || 0);
    const balance = fee - paid;

    return `
      <tr>
        <td>
          <strong>${escapeHTML(project.name)}</strong><br>
          <small>${escapeHTML(project.location || "")}</small>
        </td>
        <td>${escapeHTML(client?.name || "")}</td>
        <td>${escapeHTML(project.serviceType || "")}</td>
        <td><span class="badge ${statusClass(project.status)}">${escapeHTML(project.status || "")}</span></td>
        <td>${money(fee)}</td>
        <td>${money(paid)}</td>
        <td>${money(balance)}</td>
        <td>
          <div class="row-actions">
            <button class="btn small secondary" onclick="editProject('${project.id}')">Edit</button>
            <button class="btn small" onclick="createInvoiceFromProject('${project.id}')">Invoice</button>
            <button class="btn small danger" onclick="deleteProject('${project.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderInvoices() {
  const search = $("#invoiceSearch")?.value?.toLowerCase() || "";
  const statusFilter = $("#invoiceStatusFilter")?.value || "";

  let invoices = [...state.invoices];

  if (statusFilter) {
    invoices = invoices.filter(invoice => paymentStatus(invoiceTotal(invoice), invoice.paid) === statusFilter);
  }

  if (search) {
    invoices = invoices.filter(invoice => {
      const client = getClient(invoice.clientId);
      const project = getProject(invoice.projectId);
      return [
        invoice.invoiceNo,
        client?.name,
        project?.name,
        invoice.date
      ].join(" ").toLowerCase().includes(search);
    });
  }

  const tbody = $("#invoicesTable");

  if (!invoices.length) {
    tbody.innerHTML = `<tr><td colspan="9">No invoices found.</td></tr>`;
    return;
  }

  tbody.innerHTML = invoices.map(invoice => {
    const client = getClient(invoice.clientId);
    const project = getProject(invoice.projectId);
    const total = invoiceTotal(invoice);
    const balance = invoiceBalance(invoice);
    const status = paymentStatus(total, invoice.paid);

    return `
      <tr>
        <td><strong>${escapeHTML(invoice.invoiceNo)}</strong></td>
        <td>${escapeHTML(client?.name || "")}</td>
        <td>${escapeHTML(project?.name || "")}</td>
        <td>${escapeHTML(invoice.date || "")}</td>
        <td>${money(total)}</td>
        <td>${money(invoice.paid || 0)}</td>
        <td>${money(balance)}</td>
        <td><span class="badge ${statusClass(status)}">${status}</span></td>
        <td>
          <div class="row-actions">
            <button class="btn small" onclick="previewInvoice('${invoice.id}')">Preview</button>
            <button class="btn small secondary" onclick="editInvoice('${invoice.id}')">Edit</button>
            <button class="btn small danger" onclick="deleteInvoice('${invoice.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderSettings() {
  const form = $("#settingsForm");
  Object.entries(state.settings).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value || "";
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.showModal();
}

function closeModals() {
  $$("dialog[open]").forEach(dialog => dialog.close());
}

function resetClientForm() {
  $("#clientModalTitle").textContent = "Add Client";
  $("#clientForm").reset();
  $("#clientForm").elements.id.value = "";
}

function resetProjectForm() {
  $("#projectModalTitle").textContent = "Add Project";
  $("#projectForm").reset();
  $("#projectForm").elements.id.value = "";
}

function resetInvoiceForm() {
  $("#invoiceModalTitle").textContent = "Create Invoice";
  $("#invoiceForm").reset();
  $("#invoiceForm").elements.id.value = "";
  $("#invoiceForm").elements.invoiceNo.value = nextInvoiceNumber();
  $("#invoiceForm").elements.date.value = todayISO();
  $("#lineItems").innerHTML = "";
  addLineItem();
  updateInvoiceSummary();
}

function addLineItem(item = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "line-item";
  wrapper.innerHTML = `
    <label>
      Description
      <input class="item-description" value="${escapeHTML(item.description || "")}" placeholder="Architectural drafting services" />
    </label>
    <label>
      Qty
      <input class="item-qty" type="number" min="0" step="0.01" value="${Number(item.qty || 1)}" />
    </label>
    <label>
      Rate
      <input class="item-rate" type="number" min="0" step="0.01" value="${Number(item.rate || 0)}" />
    </label>
    <label>
      Amount
      <input class="item-amount" disabled value="${money(Number(item.qty || 1) * Number(item.rate || 0))}" />
    </label>
    <button type="button" class="icon-btn remove-line">×</button>
  `;

  wrapper.querySelectorAll(".item-qty, .item-rate").forEach(input => {
    input.addEventListener("input", updateInvoiceSummary);
  });

  wrapper.querySelector(".remove-line").addEventListener("click", () => {
    wrapper.remove();
    updateInvoiceSummary();
  });

  $("#lineItems").appendChild(wrapper);
  updateInvoiceSummary();
}

function getLineItemsFromForm() {
  return $$("#lineItems .line-item").map(row => ({
    description: row.querySelector(".item-description").value.trim(),
    qty: Number(row.querySelector(".item-qty").value || 0),
    rate: Number(row.querySelector(".item-rate").value || 0)
  })).filter(item => item.description || item.qty || item.rate);
}

function updateInvoiceSummary() {
  let subtotal = 0;

  $$("#lineItems .line-item").forEach(row => {
    const qty = Number(row.querySelector(".item-qty").value || 0);
    const rate = Number(row.querySelector(".item-rate").value || 0);
    const amount = qty * rate;
    row.querySelector(".item-amount").value = money(amount);
    subtotal += amount;
  });

  const paid = Number($("#invoiceForm").elements.paid.value || 0);
  $("#invoiceSubtotal").textContent = money(subtotal);
  $("#invoicePaid").textContent = money(paid);
  $("#invoiceBalance").textContent = money(subtotal - paid);
}

function editClient(id) {
  const client = getClient(id);
  if (!client) return;

  $("#clientModalTitle").textContent = "Edit Client";
  const form = $("#clientForm");
  form.elements.id.value = client.id;
  form.elements.name.value = client.name || "";
  form.elements.phone.value = client.phone || "";
  form.elements.email.value = client.email || "";
  form.elements.address.value = client.address || "";
  openModal("clientModal");
}

function deleteClient(id) {
  const linkedProjects = state.projects.some(project => project.clientId === id);
  const linkedInvoices = state.invoices.some(invoice => invoice.clientId === id);

  if (linkedProjects || linkedInvoices) {
    alert("This client is linked to a project or invoice. Delete or edit those records first.");
    return;
  }

  if (!confirm("Delete this client?")) return;
  state.clients = state.clients.filter(client => client.id !== id);
  saveState();
}

function editProject(id) {
  const project = getProject(id);
  if (!project) return;

  $("#projectModalTitle").textContent = "Edit Project";
  const form = $("#projectForm");
  Object.entries(project).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value ?? "";
  });
  openModal("projectModal");
}

function deleteProject(id) {
  const linkedInvoices = state.invoices.some(invoice => invoice.projectId === id);

  if (linkedInvoices) {
    alert("This project is linked to an invoice. Delete or edit that invoice first.");
    return;
  }

  if (!confirm("Delete this project?")) return;
  state.projects = state.projects.filter(project => project.id !== id);
  saveState();
}

function createInvoiceFromProject(projectId) {
  const project = getProject(projectId);
  if (!project) return;

  resetInvoiceForm();

  const form = $("#invoiceForm");
  form.elements.clientId.value = project.clientId || "";
  form.elements.projectId.value = project.id;
  form.elements.paid.value = Number(project.paid || 0);

  $("#lineItems").innerHTML = "";
  addLineItem({
    description: `${project.serviceType || "Professional"} services for ${project.name}`,
    qty: 1,
    rate: Number(project.fee || 0)
  });

  updateInvoiceSummary();
  openModal("invoiceModal");
}

function editInvoice(id) {
  const invoice = state.invoices.find(inv => inv.id === id);
  if (!invoice) return;

  $("#invoiceModalTitle").textContent = "Edit Invoice";
  const form = $("#invoiceForm");
  form.elements.id.value = invoice.id;
  form.elements.invoiceNo.value = invoice.invoiceNo || "";
  form.elements.date.value = invoice.date || "";
  form.elements.dueDate.value = invoice.dueDate || "";
  form.elements.clientId.value = invoice.clientId || "";
  form.elements.projectId.value = invoice.projectId || "";
  form.elements.paid.value = invoice.paid || 0;
  form.elements.notes.value = invoice.notes || "";

  $("#lineItems").innerHTML = "";
  (invoice.items || []).forEach(item => addLineItem(item));
  if (!(invoice.items || []).length) addLineItem();

  updateInvoiceSummary();
  openModal("invoiceModal");
}

function deleteInvoice(id) {
  if (!confirm("Delete this invoice?")) return;
  state.invoices = state.invoices.filter(invoice => invoice.id !== id);
  saveState();
}

function previewInvoice(id) {
  const invoice = state.invoices.find(inv => inv.id === id);
  if (!invoice) return;

  const client = getClient(invoice.clientId) || {};
  const project = getProject(invoice.projectId) || {};
  const settings = state.settings;
  const total = invoiceTotal(invoice);
  const paid = Number(invoice.paid || 0);
  const balance = total - paid;
  const status = paymentStatus(total, paid);

  $("#invoicePreview").innerHTML = `
    <div class="invoice-head">
      <div>
        <h2>${escapeHTML(settings.businessName)}</h2>
        <p>${escapeHTML(settings.businessAddress).replaceAll("\n", "<br>")}</p>
        <p>${escapeHTML(settings.businessPhone)}</p>
        <p>${escapeHTML(settings.businessEmail)}</p>
      </div>
      <div class="invoice-meta">
        <h2>INVOICE</h2>
        <p><strong>No:</strong> ${escapeHTML(invoice.invoiceNo)}</p>
        <p><strong>Date:</strong> ${escapeHTML(invoice.date || "")}</p>
        <p><strong>Due:</strong> ${escapeHTML(invoice.dueDate || "")}</p>
        <p><strong>Status:</strong> ${escapeHTML(status)}</p>
      </div>
    </div>

    <div class="invoice-section-grid">
      <div>
        <h4>Bill To</h4>
        <p><strong>${escapeHTML(client.name || "")}</strong></p>
        <p>${escapeHTML(client.address || "").replaceAll("\n", "<br>")}</p>
        <p>${escapeHTML(client.phone || "")}</p>
        <p>${escapeHTML(client.email || "")}</p>
      </div>
      <div>
        <h4>Project</h4>
        <p><strong>${escapeHTML(project.name || "")}</strong></p>
        <p>${escapeHTML(project.location || "")}</p>
        <p>${escapeHTML(project.serviceType || "")}</p>
      </div>
    </div>

    <table class="invoice-items">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${(invoice.items || []).map(item => `
          <tr>
            <td>${escapeHTML(item.description || "")}</td>
            <td>${Number(item.qty || 0)}</td>
            <td>${money(item.rate || 0)}</td>
            <td>${money(Number(item.qty || 0) * Number(item.rate || 0))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="invoice-totals">
      <div><span>Subtotal</span><strong>${money(total)}</strong></div>
      <div><span>Paid</span><strong>${money(paid)}</strong></div>
      <div class="balance"><span>Balance Due</span><strong>${money(balance)}</strong></div>
    </div>

    <div class="invoice-notes">
      <h4>Notes</h4>
      <p>${escapeHTML(invoice.notes || "Thank you for your business.").replaceAll("\n", "<br>")}</p>

      ${settings.paymentDetails ? `
        <h4>Payment Details</h4>
        <p>${escapeHTML(settings.paymentDetails).replaceAll("\n", "<br>")}</p>
      ` : ""}
    </div>
  `;

  openModal("invoicePreviewModal");
}

function exportData() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pde-app-backup-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importData(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported || !Array.isArray(imported.clients) || !Array.isArray(imported.projects) || !Array.isArray(imported.invoices)) {
        throw new Error("Invalid backup file.");
      }

      if (!confirm("Importing will replace the current app data in this browser. Continue?")) return;

      state = {
        ...structuredClone(defaultState),
        ...imported,
        settings: { ...structuredClone(defaultState).settings, ...(imported.settings || {}) }
      };

      saveState();
      alert("Backup imported successfully.");
    } catch (error) {
      alert("Could not import this file. Make sure it is a valid app backup JSON file.");
    }
  };
  reader.readAsText(file);
}

function setupEvents() {
  $$(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
      $$(".nav-btn").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      const view = button.dataset.view;
      $$(".view").forEach(section => section.classList.remove("active"));
      document.getElementById(view).classList.add("active");

      $("#viewTitle").textContent = button.textContent;
    });
  });

  $$("[data-open-modal]").forEach(button => {
    button.addEventListener("click", () => {
      const modalId = button.dataset.openModal;
      if (modalId === "clientModal") resetClientForm();
      if (modalId === "projectModal") resetProjectForm();
      if (modalId === "invoiceModal") resetInvoiceForm();
      openModal(modalId);
    });
  });

  $$(".close-modal").forEach(button => button.addEventListener("click", closeModals));

  $("#clientForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const client = {
      id: form.elements.id.value || uid("client"),
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      email: form.elements.email.value.trim(),
      address: form.elements.address.value.trim()
    };

    const index = state.clients.findIndex(item => item.id === client.id);
    if (index >= 0) state.clients[index] = client;
    else state.clients.push(client);

    saveState();
    closeModals();
  });

  $("#projectForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    const project = {
      id: form.elements.id.value || uid("project"),
      name: form.elements.name.value.trim(),
      clientId: form.elements.clientId.value,
      location: form.elements.location.value.trim(),
      serviceType: form.elements.serviceType.value,
      status: form.elements.status.value,
      startDate: form.elements.startDate.value,
      deadline: form.elements.deadline.value,
      fee: Number(form.elements.fee.value || 0),
      paid: Number(form.elements.paid.value || 0),
      notes: form.elements.notes.value.trim()
    };

    const index = state.projects.findIndex(item => item.id === project.id);
    if (index >= 0) state.projects[index] = project;
    else state.projects.push(project);

    saveState();
    closeModals();
  });

  $("#invoiceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    const invoice = {
      id: form.elements.id.value || uid("invoice"),
      invoiceNo: form.elements.invoiceNo.value.trim(),
      date: form.elements.date.value,
      dueDate: form.elements.dueDate.value,
      clientId: form.elements.clientId.value,
      projectId: form.elements.projectId.value,
      paid: Number(form.elements.paid.value || 0),
      notes: form.elements.notes.value.trim(),
      items: getLineItemsFromForm()
    };

    if (!invoice.items.length) {
      alert("Add at least one invoice line item.");
      return;
    }

    const index = state.invoices.findIndex(item => item.id === invoice.id);
    if (index >= 0) state.invoices[index] = invoice;
    else state.invoices.push(invoice);

    saveState();
    closeModals();
  });

  $("#settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    state.settings = {
      businessName: form.elements.businessName.value.trim(),
      businessPhone: form.elements.businessPhone.value.trim(),
      businessEmail: form.elements.businessEmail.value.trim(),
      businessAddress: form.elements.businessAddress.value.trim(),
      paymentDetails: form.elements.paymentDetails.value.trim(),
      invoicePrefix: form.elements.invoicePrefix.value.trim() || "PDE-INV"
    };

    saveState();
    alert("Settings saved.");
  });

  $("#addLineItemBtn").addEventListener("click", () => addLineItem());
  $("#invoiceForm").elements.paid.addEventListener("input", updateInvoiceSummary);

  $("#invoiceProjectSelect").addEventListener("change", event => {
    const project = getProject(event.target.value);
    if (!project) return;

    const form = $("#invoiceForm");
    if (project.clientId) form.elements.clientId.value = project.clientId;
    if (!$("#lineItems .line-item") || confirm("Use this project fee as the invoice line item?")) {
      $("#lineItems").innerHTML = "";
      addLineItem({
        description: `${project.serviceType || "Professional"} services for ${project.name}`,
        qty: 1,
        rate: Number(project.fee || 0)
      });
    }
    updateInvoiceSummary();
  });

  $("#projectSearch").addEventListener("input", renderProjects);
  $("#projectStatusFilter").addEventListener("change", renderProjects);
  $("#invoiceSearch").addEventListener("input", renderInvoices);
  $("#invoiceStatusFilter").addEventListener("change", renderInvoices);

  $("#exportDataBtn").addEventListener("click", exportData);
  $("#exportDataBtn2").addEventListener("click", exportData);
  $("#importFile").addEventListener("change", event => importData(event.target.files[0]));

  $("#clearDataBtn").addEventListener("click", () => {
    if (!confirm("This will delete all local app data from this browser. Export a backup first. Continue?")) return;
    state = structuredClone(defaultState);
    saveState();
  });

  $("#printInvoiceBtn").addEventListener("click", () => window.print());
}

setupEvents();
renderAll();
