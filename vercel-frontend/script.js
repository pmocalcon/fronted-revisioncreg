const state = {
  backendUrl: localStorage.getItem('backendUrl') || '',
  municipalities: [],
  meses: [],
  progress: {},
  selectedMunicipio: '',
  selectedMes: '',
  loading: false,
};

const els = {
  backendInput: document.getElementById('backend-url'),
  connectionStatus: document.getElementById('connection-status'),
  lastUpdate: document.getElementById('last-update'),
  saveBackend: document.getElementById('save-backend'),
  refreshConfig: document.getElementById('refresh-config'),
  refreshProgress: document.getElementById('refresh-progress'),
  muniSelect: document.getElementById('municipio'),
  mesSelect: document.getElementById('mes'),
  buttons: Array.from(document.querySelectorAll('[data-process]')),
  resultMessage: document.getElementById('result-message'),
  rutaCreg: document.getElementById('ruta-creg'),
  progressList: document.getElementById('progress-list'),
};

const trackedProcesses = [
  'boton1', 'boton2', 'boton5', 'boton6', 'boton7',
  'boton8', 'boton12', 'boton9', 'boton10', 'boton11', 'boton13',
];

function setStatus(text, variant = 'idle') {
  els.connectionStatus.textContent = text;
  els.connectionStatus.classList.remove('ok', 'error');
  if (variant === 'ok') els.connectionStatus.classList.add('ok');
  if (variant === 'error') els.connectionStatus.classList.add('error');
}

function showMessage(message, isError = false) {
  els.resultMessage.textContent = message;
  els.resultMessage.classList.toggle('error', isError);
  els.resultMessage.classList.toggle('success', !isError);
}

function updateRuta(text) {
  els.rutaCreg.textContent = text || '—';
}

function setBackendUrl(url) {
  if (!url) return;
  const clean = url.trim().replace(/\/+$/, '');
  state.backendUrl = clean;
  localStorage.setItem('backendUrl', clean);
  els.backendInput.value = clean;
}

function toggleLoading(isLoading) {
  state.loading = isLoading;
  els.buttons.forEach(btn => btn.disabled = isLoading);
  els.saveBackend.disabled = isLoading;
  els.refreshConfig.disabled = isLoading;
  els.refreshProgress.disabled = isLoading;
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
}

function renderProgress() {
  els.progressList.innerHTML = '';
  if (!state.municipalities.length) {
    const li = document.createElement('li');
    li.textContent = 'Sin municipios cargados.';
    li.className = 'progress-item';
    els.progressList.appendChild(li);
    return;
  }

  state.municipalities.forEach(m => {
    const li = document.createElement('li');
    li.className = 'progress-item';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = m.display_name || m.displayName || m.code;

    const badge = document.createElement('span');
    badge.className = 'badge';

    const muniProgress = state.progress[m.code] || {};
    const monthData = muniProgress[state.selectedMes] || { completed_steps: 0 };
    const steps = monthData.completed_steps || 0;
    const isDone = steps >= trackedProcesses.length;

    badge.textContent = isDone ? 'Completado' : `${steps}/${trackedProcesses.length}`;
    badge.classList.add(isDone ? 'ok' : 'pending');

    li.appendChild(name);
    li.appendChild(badge);
    els.progressList.appendChild(li);
  });
}

async function fetchConfig() {
  if (!state.backendUrl) {
    showMessage('Configura primero la URL del backend.', true);
    setStatus('Sin backend', 'error');
    return;
  }

  toggleLoading(true);
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
    setStatus('Conectado', 'ok');
    els.lastUpdate.textContent = `Actualizado: ${new Date().toLocaleString()}`;
  } catch (err) {
    console.error(err);
    showMessage(`No se pudo sincronizar: ${err.message}`, true);
    setStatus('Sin conexión', 'error');
  } finally {
    toggleLoading(false);
  }
}

async function runProcess(processType) {
  if (!state.backendUrl) {
    showMessage('Configura primero la URL del backend.', true);
    return;
  }
  if (!state.selectedMunicipio || !state.selectedMes) {
    showMessage('Selecciona municipio y mes antes de ejecutar.', true);
    return;
  }

  toggleLoading(true);
  try {
    const res = await fetch(`${state.backendUrl}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      body: JSON.stringify({
        municipio: state.selectedMunicipio,
        mes: state.selectedMes,
        process: processType,
      }),
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
    toggleLoading(false);
  }
}

function bindEvents() {
  els.backendInput.addEventListener('input', (e) => {
    state.backendUrl = e.target.value;
  });

  els.saveBackend.addEventListener('click', () => {
    setBackendUrl(els.backendInput.value);
    fetchConfig();
  });

  els.refreshConfig.addEventListener('click', fetchConfig);
  els.refreshProgress.addEventListener('click', fetchConfig);

  els.muniSelect.addEventListener('change', (e) => {
    state.selectedMunicipio = e.target.value;
    renderProgress();
  });

  els.mesSelect.addEventListener('change', (e) => {
    state.selectedMes = e.target.value;
    renderProgress();
  });

  els.buttons.forEach(btn => {
    btn.addEventListener('click', () => runProcess(btn.dataset.process));
  });
}

function init() {
  bindEvents();
  if (state.backendUrl) {
    els.backendInput.value = state.backendUrl;
    fetchConfig();
  } else {
    showMessage('Define la URL de tu backend Flask y presiona "Guardar y probar".');
  }
}

init();
