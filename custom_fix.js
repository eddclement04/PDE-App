document.addEventListener('click', function (event) {
  var button = event.target.closest('[data-add-custom-drawing]');
  if (!button) return;
  event.preventDefault();
  var box = document.getElementById(button.getAttribute('data-add-custom-drawing'));
  if (!box) return;
  var holder = box.closest('[data-custom-category]');
  var category = holder ? holder.getAttribute('data-custom-category') : 'custom';
  var row = document.createElement('div');
  row.className = 'multi-row custom-drawing-row';
  row.innerHTML = '<input data-custom-drawing-input="' + category + '" placeholder="Custom drawing"><button type="button" class="btn danger">−</button>';
  row.querySelector('button').onclick = function () { row.parentNode.removeChild(row); if (window.syncDrawingTasks) window.syncDrawingTasks(); };
  box.appendChild(row);
  if (window.syncDrawingTasks) setTimeout(window.syncDrawingTasks, 0);
}, true);

(function () {
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function openView(viewName) {
    if (typeof window.showView === 'function') {
      window.showView(viewName);
      return;
    }
    var button = document.querySelector('[data-view="' + viewName + '"]');
    if (button) button.click();
  }

  function addOption(select, value, label) {
    if (!select || select.querySelector('option[value="' + value + '"]')) return;
    var option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function addQuickCreateOptions() {
    document.querySelectorAll('select[name="clientId"]').forEach(function (select) {
      addOption(select, '__add_new_client', '+ Add New Client');
    });

    document.querySelectorAll('select[name="projectId"]').forEach(function (select) {
      addOption(select, '__add_new_project', '+ Add New Project');
    });
  }

  function openNewClient() {
    openView('clients');
    var clearButton = document.getElementById('clearClientBtn');
    if (clearButton) clearButton.click();
    setTimeout(function () {
      var nameInput = document.querySelector('#clientForm [name="name"]');
      if (nameInput) nameInput.focus();
    }, 80);
  }

  function openNewProject(sourceSelect) {
    var sourceForm = sourceSelect ? sourceSelect.closest('form') : null;
    var selectedClient = sourceForm && sourceForm.elements.clientId ? sourceForm.elements.clientId.value : '';
    openView('projects');
    var clearButton = document.getElementById('clearProjectBtn');
    if (clearButton) clearButton.click();
    setTimeout(function () {
      var projectClient = document.getElementById('projectClientSelect');
      if (projectClient && selectedClient && selectedClient.indexOf('__') !== 0) projectClient.value = selectedClient;
      var nameInput = document.querySelector('#projectForm [name="name"]');
      if (nameInput) nameInput.focus();
    }, 80);
  }

  ready(function () {
    addQuickCreateOptions();
    document.addEventListener('focusin', function (event) {
      if (event.target.matches && event.target.matches('select[name="clientId"], select[name="projectId"]')) addQuickCreateOptions();
    });
    document.addEventListener('click', function () {
      setTimeout(addQuickCreateOptions, 50);
    });
    document.addEventListener('change', function (event) {
      var select = event.target;
      if (!select.matches || !select.matches('select[name="clientId"], select[name="projectId"]')) return;
      if (select.value === '__add_new_client') {
        select.value = '';
        openNewClient();
      }
      if (select.value === '__add_new_project') {
        select.value = '';
        openNewProject(select);
      }
      setTimeout(addQuickCreateOptions, 50);
    }, true);
    setInterval(addQuickCreateOptions, 1200);
  });
})();

(function () {
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    if (document.querySelector('.pde-menu-toggle')) return;

    var style = document.createElement('style');
    style.textContent = [
      '.pde-menu-toggle{display:none;position:fixed;top:14px;left:14px;z-index:3000;width:46px;height:42px;border:0;border-radius:12px;background:#0f4c81;color:#fff;box-shadow:0 10px 25px rgba(15,76,129,.28);cursor:pointer;align-items:center;justify-content:center;flex-direction:column;gap:5px}',
      '.pde-menu-toggle span{display:block;width:22px;height:2px;background:#fff;border-radius:4px;transition:.2s ease}',
      '.pde-menu-backdrop{display:none;position:fixed;inset:0;background:rgba(15,23,42,.42);z-index:2200}',
      'body.pde-menu-open .pde-menu-backdrop{display:block}',
      'body.pde-menu-open .pde-menu-toggle span:nth-child(1){transform:translateY(7px) rotate(45deg)}',
      'body.pde-menu-open .pde-menu-toggle span:nth-child(2){opacity:0}',
      'body.pde-menu-open .pde-menu-toggle span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}',
      '@media(max-width:900px){.pde-menu-toggle{display:flex}.sidebar{position:fixed!important;top:0!important;left:0!important;bottom:0!important;width:286px!important;max-width:86vw!important;z-index:2500!important;transform:translateX(-105%);transition:transform .24s ease;box-shadow:14px 0 40px rgba(15,23,42,.25);overflow-y:auto}.main{margin-left:0!important;width:100%!important;padding-top:64px!important}body.pde-menu-open .sidebar{transform:translateX(0)}body.pde-menu-open{overflow:hidden}}',
      '@media(min-width:901px){.sidebar{transform:none!important}.pde-menu-backdrop{display:none!important}}'
    ].join('');
    document.head.appendChild(style);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'pde-menu-toggle';
    toggle.setAttribute('aria-label', 'Open menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span></span><span></span><span></span>';

    var backdrop = document.createElement('div');
    backdrop.className = 'pde-menu-backdrop';

    document.body.prepend(toggle);
    document.body.appendChild(backdrop);

    function setMenu(open) {
      document.body.classList.toggle('pde-menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    toggle.addEventListener('click', function () {
      setMenu(!document.body.classList.contains('pde-menu-open'));
    });

    backdrop.addEventListener('click', function () {
      setMenu(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setMenu(false);
    });

    document.querySelectorAll('.sidebar [data-view], .sidebar .nav-btn').forEach(function (item) {
      item.addEventListener('click', function () {
        setMenu(false);
      });
    });
  });
})();
