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
  activationTitle: document.querySelector("#activationTitle"),
  autoActivation: document.querySelector("#autoActivation"),
  captureCard: document.querySelector("#captureCard"),
  captureHint: document.querySelector("#captureHint"),
  currentSite: document.querySelector("#currentSite"),
  errorMessage: document.querySelector("#errorMessage"),
  presetState: document.querySelector("#presetState"),
  statusChip: document.querySelector("#statusChip"),
  statusText: document.querySelector("#statusText"),
};

const controls = [...document.querySelectorAll("[data-setting]")];
const presetButtons = [...document.querySelectorAll("[data-preset]")];
const speedButtons = [...document.querySelectorAll("[data-speed]")];
let activeTabId = null;
let captureActive = false;
let capturedTabId = null;
let settings = { ...DEFAULT_SETTINGS };
let updateTimer = null;

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
  elements.currentSite.textContent = describeTab(tab);

  const response = await sendToBackground({
    type: "GET_STATE",
    tabId: activeTabId,
  });

  settings = { ...DEFAULT_SETTINGS, ...response.settings };
  captureActive = response.active;
  capturedTabId = response.capturedTabId;
  renderAll();
  await activateCurrentTab();
}

function bindEvents() {
  for (const control of controls) {
    const eventName = control.type === "checkbox" ? "change" : "input";
    control.addEventListener(eventName, () => {
      const key = control.dataset.setting;
      settings[key] =
        control.type === "checkbox" ? control.checked : Number(control.value);
      renderControl(control);
      renderQuickControls();
      queueSettingsUpdate();
    });
  }

  for (const button of presetButtons) {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  }

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
}

async function activateCurrentTab() {
  if (captureActive && capturedTabId === activeTabId) {
    renderCaptureState();
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

function queueSettingsUpdate(delay = 65) {
  window.clearTimeout(updateTimer);
  updateTimer = window.setTimeout(async () => {
    try {
      await sendToBackground({
        type: "UPDATE_SETTINGS",
        tabId: activeTabId,
        settings,
      });
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
  } else if (key === "bass" || key === "mid" || key === "treble") {
    const prefix = value > 0 ? "+" : "";
    output.textContent = `${prefix}${Math.round(value)} dB`;
  } else if (key === "stereoWidth") {
    output.textContent = describeStereoWidth(value);
  } else if (key === "pan") {
    output.textContent = describePan(value);
  }
}

function renderQuickControls() {
  for (const button of speedButtons) {
    const isActive = Math.abs(Number(button.dataset.speed) - settings.speed) < 0.001;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }

  let activePreset = null;
  for (const [name, preset] of Object.entries(AUDIO_PRESETS)) {
    const matches = Object.entries(preset.values).every(
      ([key, value]) => settings[key] === value,
    );
    const button = presetButtons.find((item) => item.dataset.preset === name);
    button?.classList.toggle("active", matches);
    button?.setAttribute("aria-pressed", String(matches));
    if (matches) {
      activePreset = preset;
    }
  }
  elements.presetState.textContent = activePreset?.label || "Personalizado";
}

function renderCaptureState() {
  const currentTabIsCaptured = captureActive && capturedTabId === activeTabId;
  elements.statusChip.classList.toggle("active", currentTabIsCaptured);
  elements.captureCard.classList.toggle("active", currentTabIsCaptured);
  elements.autoActivation.classList.toggle("active", currentTabIsCaptured);
  elements.autoActivation.classList.remove("error");

  if (currentTabIsCaptured) {
    elements.statusText.textContent = "Ativo nesta aba";
    elements.activationTitle.textContent = "Áudio ativo nesta aba";
    elements.captureHint.textContent =
      "Pode fechar o menu — encerra quando esta guia fechar";
  } else if (captureActive) {
    elements.statusText.textContent = "Transferindo…";
    elements.activationTitle.textContent = "Transferindo para esta guia…";
    elements.captureHint.textContent =
      "A guia anterior voltará ao áudio normal";
  } else {
    elements.statusText.textContent = "Ativando…";
    elements.activationTitle.textContent = "Ativando automaticamente…";
    elements.captureHint.textContent =
      "O áudio será processado localmente";
  }
}

function renderActivationPending() {
  elements.statusChip.classList.remove("active");
  elements.captureCard.classList.remove("active");
  elements.autoActivation.classList.remove("active", "error");
  elements.statusText.textContent = "Ativando…";
  elements.activationTitle.textContent = "Preparando esta guia…";
  elements.captureHint.textContent =
    "Isso acontece automaticamente ao abrir o menu";
}

function renderActivationError() {
  elements.statusChip.classList.remove("active");
  elements.captureCard.classList.remove("active");
  elements.autoActivation.classList.remove("active");
  elements.autoActivation.classList.add("error");
  elements.statusText.textContent = "Indisponível";
  elements.activationTitle.textContent = "Não foi possível ativar esta guia";
  elements.captureHint.textContent = "Tente em uma página com áudio";
}

function describeTab(tab) {
  if (!tab) {
    return "Aba indisponível";
  }

  try {
    const url = new URL(tab.url);
    return url.hostname.replace(/^www\./, "") || tab.title || "Aba atual";
  } catch {
    return tab.title || "Aba atual";
  }
}

function describeStereoWidth(value) {
  const rounded = Math.round(value);
  if (rounded === 0) {
    return "Mono";
  }
  if (rounded === 100) {
    return "Normal";
  }
  return `${rounded}%`;
}

function describePan(value) {
  const rounded = Math.round(value);
  if (rounded < 0) {
    return `E ${Math.abs(rounded)}%`;
  }
  if (rounded > 0) {
    return `D ${rounded}%`;
  }
  return "Centro";
}

function formatDecimal(value) {
  return Number(value).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

async function sendToBackground(message) {
  const response = await chrome.runtime.sendMessage({
    ...message,
    target: "background",
  });

  if (!response?.ok) {
    throw new Error(response?.error || "A extensão não respondeu.");
  }

  return response;
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.hidden = false;
}

function clearError() {
  elements.errorMessage.hidden = true;
  elements.errorMessage.textContent = "";
}
