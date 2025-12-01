const state = {
  backendUrl: window.BACKEND_URL || localStorage.getItem('backendUrl') || '',
  municipalities: [],
  meses: [],
  progress: {},
  selectedMunicipio: '',
  selectedMes: '',
  loading: false,
};

const els = {
  muniSelect: document.getElementById('municipio'),
  mesSelect: document.getElementById('mes'),
  buttons: Array.from(document.querySelectorAll('[data-process]')),
  resultText: document.getElementById('result-text'),
  rutaCreg: document.getElementById('ruta-creg'),
  progressList: document.getElementById('progress-list'),
  progressTitle: document.getElementById('progress-title'),
};

const trackedProcesses = [
  'boton1', 'boton2', 'boton5', 'boton6', 'boton7',
  'boton8', 'boton12', 'boton9', 'boton10', 'boton11', 'boton13',
];

function showMessage(message, isError = false) {
  els.resultText.textContent = message;
  els.resultText.classList.toggle('text-danger', isError);
}

function updateRuta(text) {
  els.rutaCreg.textContent = text || '—';
}

function renderSelects() {
  els.muniSelect.innerHTML = '';
  els.mesSelect.innerHTML = '';

  state.municipalities.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.code;
    opt.textContent = `${m.display_name || m.displayName || m.code} (${m.code})`;
    els.muniSelect.appendChild(opt);
  });

  state.meses.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    els.mesSelect.appendChild(opt);
  });

  if (!state.selectedMunicipio && state.municipalities.length) {
    state.selectedMunicipio = state.municipalities[0].code;
  }
  if (!state.selectedMes && state.meses.length) {
    state.selectedMes = state.meses[0];
  }

  els.muniSelect.value = state.selectedMunicipio;
  els.mesSelect.value = state.selectedMes;
  els.progressTitle.textContent = `Progreso de Revisión - ${state.selectedMes || 'Seleccione un mes'}`;
}

function renderProgress() {
  els.progressList.innerHTML = '';
  if (!state.municipalities.length) {
    els.progressList.innerHTML = '<li>Sin municipios cargados.</li>';
    return;
  }

  state.municipalities.forEach(m => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'municipality';
    name.textContent = m.display_name || m.displayName || m.code;

    const badge = document.createElement('span');
    badge.className = 'status';

    const muniProgress = state.progress[m.code] || {};
    const monthData = muniProgress[state.selectedMes] || { completed_steps: 0 };
    const steps = monthData.completed_steps || 0;
    const isDone = steps >= trackedProcesses.length;

    badge.textContent = isDone ? 'Completado' : `${steps}/${trackedProcesses.length}`;
    badge.classList.add(isDone ? 'completed' : 'in-progress');

    li.appendChild(name);
    li.appendChild(badge);
    els.progressList.appendChild(li);
  });
}

async function fetchConfig() {
  if (!state.backendUrl) {
    showMessage('Configura la URL del backend en localStorage["backendUrl"] o en window.BACKEND_URL antes de recargar.', true);
    return;
  }
  try {
    const res = await fetch(`${state.backendUrl}/api/config`, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.municipalities = data.municipalities || [];
    state.meses = data.meses || [];
    state.progress = data.progress || {};
    renderSelects();
    renderProgress();
    showMessage('Configuración sincronizada con éxito.');
  } catch (err) {
    console.error(err);
    showMessage(`No se pudo sincronizar: ${err.message}`, true);
  }
}

async function runProcess(processType) {
  if (!state.backendUrl) {
    showMessage('Configura la URL del backend en localStorage["backendUrl"] o en window.BACKEND_URL.', true);
    return;
  }
  const municipio = els.muniSelect.value;
  const mes = els.mesSelect.value;
  if (!municipio || !mes) {
    showMessage('Selecciona municipio y mes antes de ejecutar.', true);
    return;
  }
  if (state.loading) return;
  state.loading = true;
  try {
    const res = await fetch(`${state.backendUrl}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      body: JSON.stringify({ municipio, mes, process: processType }),
    });
    const data = await res.json();
    const ok = data.ok !== false && res.ok;
    showMessage(data.message || 'Proceso ejecutado.', !ok);
    updateRuta(data.ruta_creg);
    if (data.progress) {
      state.progress = data.progress;
      renderProgress();
    }
  } catch (err) {
    console.error(err);
    showMessage(`Error al ejecutar el proceso: ${err.message}`, true);
  } finally {
    state.loading = false;
  }
}

function bindEvents() {
  els.muniSelect.addEventListener('change', (e) => {
    state.selectedMunicipio = e.target.value;
    renderProgress();
  });

  els.mesSelect.addEventListener('change', (e) => {
    state.selectedMes = e.target.value;
    els.progressTitle.textContent = `Progreso de Revisión - ${state.selectedMes || 'Seleccione un mes'}`;
    renderProgress();
  });

  els.buttons.forEach(btn => {
    btn.addEventListener('click', () => runProcess(btn.dataset.process));
  });
}

function init() {
  bindEvents();
  fetchConfig();
}

init();
