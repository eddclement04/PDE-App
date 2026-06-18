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
