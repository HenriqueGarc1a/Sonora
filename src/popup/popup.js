const DEFAULT_SETTINGS = Object.freeze({
  volume: 100,
  speed: 1,
  preservePitch: true,
  bass: 0,
  mid: 0,
  treble: 0,
  reverb: 0,
  stereoWidth: 100,
  pan: 0,
  nightMode: false,
});

const DEFAULT_PANEL_ORDER = Object.freeze([
  "playback",
  "equalizer",
  "environment",
  "stereo",
]);

const AUDIO_PRESETS = Object.freeze({
  neutral: {
    label: "Neutro",
    values: { ...DEFAULT_SETTINGS, preservePitch: false },
  },
  dialogue: {
    label: "Diálogo",
    values: { bass: -3, mid: 4, treble: 3, reverb: 0, stereoWidth: 80, pan: 0, nightMode: true },
  },
  bass: {
    label: "Graves+",
    values: { bass: 8, mid: -2, treble: 2, reverb: 0, stereoWidth: 115, pan: 0, nightMode: false },
  },
  cinema: {
    label: "Cinema",
    values: { bass: 5, mid: 0, treble: 4, reverb: 18, stereoWidth: 135, pan: 0, nightMode: false },
  },
  night: {
    label: "Madrugada",
    values: { bass: -4, mid: 2, treble: -3, reverb: 0, stereoWidth: 75, pan: 0, nightMode: true },
  },
});

const elements = {
  addPresetButton: document.querySelector("#addPresetButton"),
  cancelPresetButton: document.querySelector("#cancelPresetButton"),
  controlsView: document.querySelector("#controlsView"),
  customPresetCount: document.querySelector("#customPresetCount"),
  emptyPresetState: document.querySelector("#emptyPresetState"),
  errorMessage: document.querySelector("#errorMessage"),
  homeButton: document.querySelector("#homeButton"),
  panelList: document.querySelector("#panelList"),
  presetDialog: document.querySelector("#presetDialog"),
  presetForm: document.querySelector("#presetForm"),
  presetList: document.querySelector("#presetList"),
  presetName: document.querySelector("#presetName"),
  presetNameError: document.querySelector("#presetNameError"),
  presetState: document.querySelector("#presetState"),
  resetLayoutButton: document.querySelector("#resetLayoutButton"),
  savedPresetList: document.querySelector("#savedPresetList"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsView: document.querySelector("#settingsView"),
  statusChip: document.querySelector("#statusChip"),
  statusText: document.querySelector("#statusText"),
  toast: document.querySelector("#toast"),
};

const controls = [...document.querySelectorAll("[data-setting]")];
const speedButtons = [...document.querySelectorAll("[data-speed]")];
let activeTabId = null;
let captureActive = false;
let capturedTabId = null;
let customPresets = [];
let settings = { ...DEFAULT_SETTINGS };
let uiPreferences = {
  panelOrder: [...DEFAULT_PANEL_ORDER],
  floatingPanels: [],
};
let pendingPresetValues = null;
let updateTimer = null;
let toastTimer = null;
let dragState = null;

initialize().catch((error) => {
  captureActive = false;
  capturedTabId = null;
  renderActivationError();
  showError(error.message);
});

async function initialize() {
  bindEvents();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id ?? null;

  const response = await sendToBackground({ type: "GET_STATE", tabId: activeTabId });
  settings = { ...DEFAULT_SETTINGS, ...response.settings };
  captureActive = response.active;
  capturedTabId = response.capturedTabId;
  customPresets = Array.isArray(response.customPresets) ? response.customPresets : [];
  uiPreferences = normalizeUiPreferences(response.uiPreferences);

  applyPanelOrder();
  renderCustomPresets();
  renderAll();
  await activateCurrentTab();
}

function bindEvents() {
  for (const control of controls) {
    const eventName = control.type === "checkbox" ? "change" : "input";
    control.addEventListener(eventName, () => {
      const key = control.dataset.setting;
      settings[key] = control.type === "checkbox" ? control.checked : Number(control.value);
      renderControl(control);
      renderQuickControls();
      queueSettingsUpdate();
    });
  }

  elements.presetList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-preset], [data-custom-preset]");
    if (button?.dataset.preset) {
      applyPreset(button.dataset.preset);
    } else if (button?.dataset.customPreset) {
      applyCustomPreset(button.dataset.customPreset);
    }
  });

  for (const button of speedButtons) {
    button.addEventListener("click", () => {
      settings.speed = Number(button.dataset.speed);
      const speedControl = document.querySelector("#speed");
      speedControl.value = settings.speed;
      renderControl(speedControl);
      renderQuickControls();
      queueSettingsUpdate(0);
    });
  }

  elements.settingsButton.addEventListener("click", () => {
    showSettings(elements.settingsView.hidden);
  });
  elements.homeButton.addEventListener("click", () => showSettings(false));

  elements.addPresetButton.addEventListener("click", openPresetDialog);
  elements.cancelPresetButton.addEventListener("click", closePresetDialog);
  elements.presetForm.addEventListener("submit", saveCustomPreset);
  elements.presetName.addEventListener("input", () => setPresetNameError(""));
  elements.presetDialog.addEventListener("click", (event) => {
    if (event.target === elements.presetDialog) {
      closePresetDialog();
    }
  });

  elements.savedPresetList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-preset]");
    if (!button) {
      return;
    }
    await deleteCustomPreset(button.dataset.deletePreset);
  });

  elements.resetLayoutButton.addEventListener("click", resetLayout);

  for (const button of document.querySelectorAll("[data-float-panel]")) {
    button.addEventListener("click", () => toggleFloatingPanel(button.dataset.floatPanel));
  }

  for (const handle of document.querySelectorAll(".drag-handle")) {
    handle.addEventListener("dragstart", startPanelDrag);
    handle.addEventListener("dragend", finishPanelDrag);
  }
  elements.panelList.addEventListener("dragover", reorderPanelDuringDrag);
  elements.panelList.addEventListener("drop", dropPanelInsidePopup);
}

async function activateCurrentTab() {
  if (captureActive && capturedTabId === activeTabId) {
    renderCaptureState();
    await sendToBackground({ type: "RESTORE_FLOATING_PANELS", tabId: activeTabId });
    return;
  }

  renderActivationPending();
  clearError();

  try {
    const response = await sendToBackground({
      type: "START_CAPTURE",
      tabId: activeTabId,
      settings,
    });
    settings = { ...settings, ...response.settings };
    captureActive = response.active;
    capturedTabId = response.capturedTabId;
    renderCaptureState();
  } catch (error) {
    captureActive = false;
    capturedTabId = null;
    renderActivationError();
    showError(error.message);
  }
}

function applyPreset(presetName) {
  const preset = AUDIO_PRESETS[presetName];
  if (!preset) {
    return;
  }
  settings = { ...settings, ...preset.values };
  renderAll();
  queueSettingsUpdate(0);
}

function applyCustomPreset(presetId) {
  const preset = customPresets.find((item) => item.id === presetId);
  if (!preset) {
    return;
  }
  settings = { ...DEFAULT_SETTINGS, ...preset.values };
  renderAll();
  queueSettingsUpdate(0);
}

function openPresetDialog() {
  pendingPresetValues = { ...settings };
  elements.presetForm.reset();
  setPresetNameError("");
  elements.presetDialog.showModal();
  window.setTimeout(() => elements.presetName.focus(), 0);
}

function closePresetDialog() {
  pendingPresetValues = null;
  elements.presetDialog.close();
}

async function saveCustomPreset(event) {
  event.preventDefault();
  const name = elements.presetName.value.trim().replace(/\s+/g, " ");

  if (!name) {
    setPresetNameError("Digite um nome para o preset.");
    elements.presetName.focus();
    return;
  }
  if (customPresets.some((preset) => preset.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
    setPresetNameError("Já existe um preset com esse nome.");
    elements.presetName.focus();
    return;
  }

  const submitButton = elements.presetForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    const response = await sendToBackground({
      type: "SAVE_CUSTOM_PRESET",
      name,
      settings: pendingPresetValues || settings,
    });
    customPresets = response.customPresets;
    renderCustomPresets();
    renderQuickControls();
    closePresetDialog();
    showToast(`Preset “${name}” criado.`);
  } catch (error) {
    setPresetNameError(error.message);
  } finally {
    submitButton.disabled = false;
  }
}

async function deleteCustomPreset(presetId) {
  const preset = customPresets.find((item) => item.id === presetId);
  if (!preset) {
    return;
  }
  try {
    const response = await sendToBackground({ type: "DELETE_CUSTOM_PRESET", presetId });
    customPresets = response.customPresets;
    renderCustomPresets();
    renderQuickControls();
    showToast(`Preset “${preset.name}” removido.`);
  } catch (error) {
    showError(error.message);
  }
}

function renderCustomPresets() {
  for (const button of elements.presetList.querySelectorAll("[data-custom-preset]")) {
    button.remove();
  }

  for (const preset of customPresets) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.customPreset = preset.id;
    button.textContent = preset.name;
    elements.presetList.insertBefore(button, elements.addPresetButton);
  }

  elements.savedPresetList.replaceChildren();
  for (const preset of customPresets) {
    const row = document.createElement("div");
    row.className = "saved-preset";

    const copy = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = preset.name;
    const date = document.createElement("small");
    date.textContent = formatPresetDate(preset.createdAt);
    copy.append(name, date);

    const removeButton = document.createElement("button");
    removeButton.className = "delete-preset";
    removeButton.type = "button";
    removeButton.dataset.deletePreset = preset.id;
    removeButton.setAttribute("aria-label", `Remover preset ${preset.name}`);
    removeButton.title = "Remover preset";
    removeButton.textContent = "×";
    row.append(copy, removeButton);
    elements.savedPresetList.append(row);
  }

  elements.customPresetCount.textContent = String(customPresets.length);
  elements.emptyPresetState.hidden = customPresets.length > 0;
}

function startPanelDrag(event) {
  const panel = event.currentTarget.closest("[data-panel-id]");
  if (!panel) {
    return;
  }
  const panelId = panel.dataset.panelId;
  const wasFloating = isPanelFloating(panelId);
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/sonora-panel", panelId);
  panel.classList.add("dragging");

  dragState = {
    panel,
    panelId,
    wasFloating,
    droppedInside: false,
    floatPromise: setPanelFloating(panelId, true, { quiet: true }),
  };
}

function reorderPanelDuringDrag(event) {
  if (!dragState) {
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const target = event.target.closest("[data-panel-id]");
  if (!target || target === dragState.panel) {
    return;
  }
  const bounds = target.getBoundingClientRect();
  const insertAfter = event.clientY > bounds.top + bounds.height / 2;
  elements.panelList.insertBefore(dragState.panel, insertAfter ? target.nextSibling : target);
}

async function dropPanelInsidePopup(event) {
  if (!dragState) {
    return;
  }
  const currentDrag = dragState;
  event.preventDefault();
  currentDrag.droppedInside = true;
  await currentDrag.floatPromise.catch(() => undefined);
  if (!currentDrag.wasFloating) {
    await setPanelFloating(currentDrag.panelId, false, { quiet: true });
  }
  await savePanelOrder();
}

function finishPanelDrag() {
  if (!dragState) {
    return;
  }
  dragState.panel.classList.remove("dragging");
  for (const panel of elements.panelList.children) {
    panel.classList.remove("drag-over");
  }
  if (!dragState.droppedInside) {
    showToast(`${panelTitle(dragState.panelId)} foi fixado na página.`);
  }
  dragState = null;
}

async function savePanelOrder() {
  const panelOrder = [...elements.panelList.querySelectorAll("[data-panel-id]")].map((panel) => panel.dataset.panelId);
  uiPreferences.panelOrder = panelOrder;
  try {
    const response = await sendToBackground({ type: "UPDATE_PANEL_ORDER", panelOrder });
    uiPreferences = normalizeUiPreferences(response.uiPreferences);
  } catch (error) {
    showError(error.message);
  }
}

async function toggleFloatingPanel(panelId) {
  const shouldFloat = !isPanelFloating(panelId);
  await setPanelFloating(panelId, shouldFloat);
  showToast(`${panelTitle(panelId)} ${shouldFloat ? "fixado na página" : "removido da página"}.`);
}

async function setPanelFloating(panelId, floating, options = {}) {
  const previousPreferences = structuredClone(uiPreferences);
  const current = uiPreferences.floatingPanels.filter((item) => item.id !== panelId);
  if (floating) {
    const previousPanel = previousPreferences.floatingPanels.find((item) => item.id === panelId);
    current.push(previousPanel || { id: panelId });
  }
  uiPreferences.floatingPanels = current;
  renderFloatingPanels();

  try {
    const response = await sendToBackground({
      type: "SET_PANEL_FLOATING",
      tabId: activeTabId,
      panelId,
      floating,
    });
    uiPreferences = normalizeUiPreferences(response.uiPreferences);
    renderFloatingPanels();
  } catch (error) {
    uiPreferences = previousPreferences;
    renderFloatingPanels();
    if (!options.quiet) {
      showError(error.message);
    }
    throw error;
  }
}

async function resetLayout() {
  try {
    const response = await sendToBackground({ type: "RESET_UI_LAYOUT", tabId: activeTabId });
    uiPreferences = normalizeUiPreferences(response.uiPreferences);
    applyPanelOrder();
    renderFloatingPanels();
    showToast("Layout padrão restaurado.");
  } catch (error) {
    showError(error.message);
  }
}

function applyPanelOrder() {
  for (const panelId of uiPreferences.panelOrder) {
    const panel = elements.panelList.querySelector(`[data-panel-id="${panelId}"]`);
    if (panel) {
      elements.panelList.append(panel);
    }
  }
}

function renderFloatingPanels() {
  for (const panel of elements.panelList.querySelectorAll("[data-panel-id]")) {
    const floating = isPanelFloating(panel.dataset.panelId);
    panel.classList.toggle("is-floating", floating);
    const button = panel.querySelector("[data-float-panel]");
    button?.classList.toggle("active", floating);
    button?.setAttribute("aria-pressed", String(floating));
    button?.setAttribute("title", floating ? "Remover da página" : "Fixar na página");
  }
}

function isPanelFloating(panelId) {
  return uiPreferences.floatingPanels.some((item) => item.id === panelId);
}

function queueSettingsUpdate(delay = 65) {
  window.clearTimeout(updateTimer);
  updateTimer = window.setTimeout(async () => {
    try {
      const response = await sendToBackground({
        type: "UPDATE_SETTINGS",
        tabId: activeTabId,
        settings,
      });
      settings = { ...settings, ...response.settings };
      clearError();
    } catch (error) {
      showError(error.message);
    }
  }, delay);
}

function renderAll() {
  for (const control of controls) {
    const key = control.dataset.setting;
    if (control.type === "checkbox") {
      control.checked = Boolean(settings[key]);
    } else {
      control.value = settings[key];
    }
    renderControl(control);
  }
  renderCaptureState();
  renderQuickControls();
  renderFloatingPanels();
}

function renderControl(control) {
  if (control.type !== "checkbox") {
    const minimum = Number(control.min);
    const maximum = Number(control.max);
    const value = Number(control.value);
    const progress = ((value - minimum) / (maximum - minimum)) * 100;
    control.style.setProperty("--progress", `${progress}%`);
  }

  const key = control.dataset.setting;
  const output = document.querySelector(`#${key}Value`);
  if (!output) {
    return;
  }

  const value = settings[key];
  if (key === "volume" || key === "reverb") {
    output.textContent = `${Math.round(value)}%`;
  } else if (key === "speed") {
    output.textContent = `${formatDecimal(value)}×`;
  } else if (["bass", "mid", "treble"].includes(key)) {
    output.textContent = `${value > 0 ? "+" : ""}${Math.round(value)} dB`;
  } else if (key === "stereoWidth") {
    output.textContent = describeStereoWidth(value);
  } else if (key === "pan") {
    output.textContent = describePan(value);
  }
}

function renderQuickControls() {
  for (const button of speedButtons) {
    const active = Math.abs(Number(button.dataset.speed) - settings.speed) < 0.001;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  let activeLabel = null;
  for (const [name, preset] of Object.entries(AUDIO_PRESETS)) {
    const matches = settingsMatch(preset.values);
    const button = elements.presetList.querySelector(`[data-preset="${name}"]`);
    button?.classList.toggle("active", matches);
    button?.setAttribute("aria-pressed", String(matches));
    if (matches) {
      activeLabel = preset.label;
    }
  }

  for (const preset of customPresets) {
    const matches = settingsMatch(preset.values);
    const button = elements.presetList.querySelector(`[data-custom-preset="${CSS.escape(preset.id)}"]`);
    button?.classList.toggle("active", matches);
    button?.setAttribute("aria-pressed", String(matches));
    if (matches) {
      activeLabel = preset.name;
    }
  }
  elements.presetState.textContent = activeLabel || "Personalizado";
}

function settingsMatch(values) {
  return Object.entries(values).every(([key, value]) => settings[key] === value);
}

function renderCaptureState() {
  const currentTabIsCaptured = captureActive && capturedTabId === activeTabId;
  elements.statusChip.classList.toggle("active", currentTabIsCaptured);
  if (currentTabIsCaptured) {
    elements.statusText.textContent = "Ativo";
  } else if (captureActive) {
    elements.statusText.textContent = "Transferindo…";
  } else {
    elements.statusText.textContent = "Ativando…";
  }
}

function renderActivationPending() {
  elements.statusChip.classList.remove("active");
  elements.statusText.textContent = "Ativando…";
}

function renderActivationError() {
  elements.statusChip.classList.remove("active");
  elements.statusText.textContent = "Indisponível";
}

function showSettings(show) {
  elements.controlsView.hidden = show;
  elements.settingsView.hidden = !show;
  elements.settingsButton.classList.toggle("active", show);
  elements.settingsButton.setAttribute("aria-pressed", String(show));
  elements.settingsButton.setAttribute("aria-label", show ? "Voltar aos controles" : "Abrir configurações");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function normalizeUiPreferences(value = {}) {
  const order = Array.isArray(value.panelOrder) ? value.panelOrder : [];
  const panelOrder = [
    ...order.filter((id) => DEFAULT_PANEL_ORDER.includes(id)),
    ...DEFAULT_PANEL_ORDER.filter((id) => !order.includes(id)),
  ];
  const floatingPanels = Array.isArray(value.floatingPanels)
    ? value.floatingPanels.filter((item) => item && DEFAULT_PANEL_ORDER.includes(item.id))
    : [];
  return { panelOrder, floatingPanels };
}

function panelTitle(panelId) {
  return {
    playback: "Reprodução",
    equalizer: "Equalizador",
    environment: "Ambiente",
    stereo: "Imagem estéreo",
  }[panelId] || "Painel";
}

function describeStereoWidth(value) {
  const rounded = Math.round(value);
  if (rounded === 0) return "Mono";
  if (rounded === 100) return "Normal";
  return `${rounded}%`;
}

function describePan(value) {
  const rounded = Math.round(value);
  if (rounded < 0) return `E ${Math.abs(rounded)}%`;
  if (rounded > 0) return `D ${rounded}%`;
  return "Centro";
}

function formatDecimal(value) {
  return Number(value).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatPresetDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Configuração personalizada";
  }
  return `Criado em ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date)}`;
}

async function sendToBackground(message) {
  const response = await chrome.runtime.sendMessage({ ...message, target: "background" });
  if (!response?.ok) {
    throw new Error(response?.error || "A extensão não respondeu.");
  }
  return response;
}

function setPresetNameError(message) {
  elements.presetNameError.textContent = message;
  elements.presetNameError.hidden = !message;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2200);
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.hidden = false;
}

function clearError() {
  elements.errorMessage.hidden = true;
  elements.errorMessage.textContent = "";
}
