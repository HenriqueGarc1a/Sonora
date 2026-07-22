const OFFSCREEN_PATH = "src/audio/offscreen.html";
const CONTENT_PATH = "src/runtime/content.js";

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

const PANEL_IDS = Object.freeze([
  "playback",
  "equalizer",
  "environment",
  "stereo",
]);

const DEFAULT_UI_PREFERENCES = Object.freeze({
  panelOrder: PANEL_IDS,
  floatingPanels: [],
});

const limits = {
  volume: [0, 300],
  speed: [0.5, 2],
  bass: [-12, 12],
  mid: [-12, 12],
  treble: [-12, 12],
  reverb: [0, 100],
  stereoWidth: [0, 200],
  pan: [-100, 100],
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get([
    "settings",
    "customPresets",
    "uiPreferences",
  ]);
  await chrome.storage.local.set({
    settings: normalizeSettings(stored.settings),
    customPresets: normalizeCustomPresets(stored.customPresets),
    uiPreferences: normalizeUiPreferences(stored.uiPreferences),
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target !== "background") {
    return false;
  }

  handleMessage(message, sender)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      console.error("Sonora:", error);
      sendResponse({ ok: false, error: friendlyError(error) });
    });

  return true;
});

chrome.tabCapture.onStatusChanged.addListener(async (info) => {
  if (info.status !== "stopped" && info.status !== "error") {
    return;
  }

  await resetPlaybackSettings(info.tabId).catch(() => undefined);
  const { capturedTabId } = await chrome.storage.session.get("capturedTabId");
  if (capturedTabId === info.tabId) {
    await chrome.storage.session.remove("capturedTabId");
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== "complete") {
    return;
  }

  const { capturedTabId } = await chrome.storage.session.get("capturedTabId");
  if (capturedTabId !== tabId) {
    return;
  }

  const settings = await getSettings();
  await applyPlaybackSettings(tabId, settings).catch(() => undefined);
  await restoreFloatingPanels(tabId, settings).catch(() => undefined);
});

async function handleMessage(message, sender) {
  const senderTabId = sender.tab?.id;
  const tabId = Number.isInteger(message.tabId) ? message.tabId : senderTabId;

  switch (message.type) {
    case "GET_STATE":
      return getState(tabId);
    case "START_CAPTURE":
      return startCapture(tabId, message.settings);
    case "STOP_CAPTURE":
      return stopCapture();
    case "UPDATE_SETTINGS":
      return updateSettings(tabId, message.settings);
    case "SAVE_CUSTOM_PRESET":
      return saveCustomPreset(message.name, message.settings);
    case "DELETE_CUSTOM_PRESET":
      return deleteCustomPreset(message.presetId);
    case "UPDATE_PANEL_ORDER":
      return updatePanelOrder(message.panelOrder);
    case "SET_PANEL_FLOATING":
      return setPanelFloating(tabId, message.panelId, message.floating);
    case "SAVE_FLOATING_POSITION":
      return saveFloatingPosition(message.panelId, message.position);
    case "RESTORE_FLOATING_PANELS":
      await restoreFloatingPanels(tabId);
      return { uiPreferences: await getUiPreferences() };
    case "RESET_UI_LAYOUT":
      return resetUiLayout(tabId);
    case "CAPTURE_ENDED":
      await resetPlaybackSettings(tabId).catch(() => undefined);
      await chrome.storage.session.remove("capturedTabId");
      return { active: false };
    default:
      throw new Error("Comando desconhecido.");
  }
}

async function getState(tabId) {
  const [settings, capturedTabs, customPresets, uiPreferences] = await Promise.all([
    getSettings(),
    chrome.tabCapture.getCapturedTabs(),
    getCustomPresets(),
    getUiPreferences(),
  ]);
  const capture = capturedTabs.find(
    (item) => item.status === "active" || item.status === "pending",
  );

  if (capture) {
    await chrome.storage.session.set({ capturedTabId: capture.tabId });
  } else {
    await chrome.storage.session.remove("capturedTabId");
  }

  return {
    settings,
    customPresets,
    uiPreferences,
    active: Boolean(capture),
    capturedTabId: capture?.tabId ?? null,
    currentTabActive: Boolean(capture && capture.tabId === tabId),
  };
}

async function startCapture(tabId, incomingSettings) {
  if (!Number.isInteger(tabId)) {
    throw new Error("Não encontrei uma aba válida para capturar.");
  }

  const settings = await saveSettings(incomingSettings);
  await ensureOffscreenDocument();

  // Valida a nova guia antes de interromper uma captura que já esteja ativa.
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  const { capturedTabId: previousTabId } = await chrome.storage.session.get("capturedTabId");

  await sendToOffscreen({ type: "STOP_CAPTURE" }).catch(() => undefined);

  if (Number.isInteger(previousTabId) && previousTabId !== tabId) {
    await resetPlaybackSettings(previousTabId).catch(() => undefined);
    await hideAllFloatingPanels(previousTabId).catch(() => undefined);
  }

  await sendToOffscreen({ type: "START_CAPTURE", streamId, tabId, settings });
  await chrome.storage.session.set({ capturedTabId: tabId });
  await applyPlaybackSettings(tabId, settings).catch(() => undefined);
  await restoreFloatingPanels(tabId, settings).catch(() => undefined);

  return { active: true, capturedTabId: tabId, settings };
}

async function stopCapture() {
  const { capturedTabId } = await chrome.storage.session.get("capturedTabId");
  if (await hasOffscreenDocument()) {
    await sendToOffscreen({ type: "STOP_CAPTURE" }).catch(() => undefined);
  }
  await resetPlaybackSettings(capturedTabId).catch(() => undefined);
  await chrome.storage.session.remove("capturedTabId");
  return { active: false, capturedTabId: null };
}

async function updateSettings(tabId, incomingSettings) {
  const settings = await saveSettings(incomingSettings);

  if (await hasOffscreenDocument()) {
    await sendToOffscreen({ type: "UPDATE_AUDIO_SETTINGS", settings }).catch(() => undefined);
  }

  let playbackApplied = false;
  if (Number.isInteger(tabId)) {
    playbackApplied = await applyPlaybackSettings(tabId, settings)
      .then(() => true)
      .catch(() => false);
    await chrome.tabs.sendMessage(tabId, {
      target: "content",
      type: "SYNC_SONORA_SETTINGS",
      settings,
    }).catch(() => undefined);
  }

  return { settings, playbackApplied };
}

async function applyPlaybackSettings(tabId, settings) {
  await ensureContentController(tabId);
  await chrome.tabs.sendMessage(tabId, {
    target: "content",
    type: "APPLY_PLAYBACK_SETTINGS",
    speed: settings.speed,
    preservePitch: settings.preservePitch,
  });
}

async function resetPlaybackSettings(tabId) {
  if (!Number.isInteger(tabId)) {
    return;
  }
  await chrome.tabs.sendMessage(tabId, {
    target: "content",
    type: "RESET_PLAYBACK_SETTINGS",
  });
}

async function ensureContentController(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      target: "content",
      type: "PING",
    });
    if (response?.ready) {
      return;
    }
  } catch {
    // O controlador ainda não foi injetado nesta navegação.
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: [CONTENT_PATH],
  });
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ["USER_MEDIA"],
    justification: "Capturar e processar o áudio da aba selecionada pelo usuário.",
  });
}

async function hasOffscreenDocument() {
  return chrome.offscreen.hasDocument();
}

function sendToOffscreen(message) {
  return chrome.runtime.sendMessage({ ...message, target: "offscreen" }).then((response) => {
    if (!response?.ok) {
      throw new Error(response?.error || "O processador de áudio não respondeu.");
    }
    return response;
  });
}

async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return normalizeSettings(settings);
}

async function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  await chrome.storage.local.set({ settings: normalized });
  return normalized;
}

function normalizeSettings(settings = {}) {
  const result = { ...DEFAULT_SETTINGS };
  for (const [key, [minimum, maximum]] of Object.entries(limits)) {
    const value = Number(settings?.[key]);
    result[key] = Number.isFinite(value)
      ? Math.min(maximum, Math.max(minimum, value))
      : DEFAULT_SETTINGS[key];
  }
  result.preservePitch = typeof settings?.preservePitch === "boolean"
    ? settings.preservePitch
    : DEFAULT_SETTINGS.preservePitch;
  result.nightMode = typeof settings?.nightMode === "boolean"
    ? settings.nightMode
    : DEFAULT_SETTINGS.nightMode;
  return result;
}

async function getCustomPresets() {
  const { customPresets } = await chrome.storage.local.get("customPresets");
  return normalizeCustomPresets(customPresets);
}

async function saveCustomPreset(rawName, incomingSettings) {
  const name = String(rawName || "").trim().replace(/\s+/g, " ").slice(0, 24);
  if (!name) {
    throw new Error("Digite um nome para o preset.");
  }

  const customPresets = await getCustomPresets();
  if (customPresets.some((preset) => preset.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
    throw new Error("Já existe um preset com esse nome.");
  }
  if (customPresets.length >= 30) {
    throw new Error("Você pode salvar até 30 presets personalizados.");
  }

  customPresets.push({
    id: `custom-${crypto.randomUUID()}`,
    name,
    values: normalizeSettings(incomingSettings),
    createdAt: new Date().toISOString(),
  });
  await chrome.storage.local.set({ customPresets });
  return { customPresets };
}

async function deleteCustomPreset(presetId) {
  const customPresets = (await getCustomPresets()).filter((preset) => preset.id !== presetId);
  await chrome.storage.local.set({ customPresets });
  return { customPresets };
}

function normalizeCustomPresets(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  return value.slice(0, 30).flatMap((preset) => {
    const id = typeof preset?.id === "string" ? preset.id.slice(0, 80) : "";
    const name = typeof preset?.name === "string" ? preset.name.trim().slice(0, 24) : "";
    if (!id || !name || seen.has(id)) {
      return [];
    }
    seen.add(id);
    return [{
      id,
      name,
      values: normalizeSettings(preset.values),
      createdAt: typeof preset.createdAt === "string" ? preset.createdAt : "",
    }];
  });
}

async function getUiPreferences() {
  const { uiPreferences } = await chrome.storage.local.get("uiPreferences");
  return normalizeUiPreferences(uiPreferences);
}

async function updatePanelOrder(panelOrder) {
  const uiPreferences = await getUiPreferences();
  uiPreferences.panelOrder = normalizePanelOrder(panelOrder);
  await chrome.storage.local.set({ uiPreferences });
  return { uiPreferences };
}

async function setPanelFloating(tabId, panelId, floating) {
  if (!PANEL_IDS.includes(panelId)) {
    throw new Error("Painel inválido.");
  }
  const uiPreferences = await getUiPreferences();
  const previousPreferences = structuredClone(uiPreferences);
  const existing = uiPreferences.floatingPanels.find((panel) => panel.id === panelId);
  uiPreferences.floatingPanels = uiPreferences.floatingPanels.filter((panel) => panel.id !== panelId);
  if (floating) {
    uiPreferences.floatingPanels.push(existing || { id: panelId });
  }
  await chrome.storage.local.set({ uiPreferences });

  try {
    if (Number.isInteger(tabId)) {
      if (floating) {
        await ensureContentController(tabId);
        await chrome.tabs.sendMessage(tabId, {
          target: "content",
          type: "SHOW_FLOATING_PANEL",
          panelId,
          position: existing?.position,
          settings: await getSettings(),
        });
      } else {
        await chrome.tabs.sendMessage(tabId, {
          target: "content",
          type: "HIDE_FLOATING_PANEL",
          panelId,
        }).catch(() => undefined);
      }
    }
  } catch (error) {
    await chrome.storage.local.set({ uiPreferences: previousPreferences });
    throw error;
  }
  return { uiPreferences };
}

async function saveFloatingPosition(panelId, position) {
  if (!PANEL_IDS.includes(panelId)) {
    throw new Error("Painel inválido.");
  }
  const uiPreferences = await getUiPreferences();
  const panel = uiPreferences.floatingPanels.find((item) => item.id === panelId);
  if (panel) {
    panel.position = normalizePosition(position);
    await chrome.storage.local.set({ uiPreferences });
  }
  return { uiPreferences };
}

async function restoreFloatingPanels(tabId, providedSettings) {
  if (!Number.isInteger(tabId)) {
    return;
  }
  const uiPreferences = await getUiPreferences();
  if (!uiPreferences.floatingPanels.length) {
    return;
  }
  const settings = providedSettings || await getSettings();
  await ensureContentController(tabId);
  for (const panel of uiPreferences.floatingPanels) {
    await chrome.tabs.sendMessage(tabId, {
      target: "content",
      type: "SHOW_FLOATING_PANEL",
      panelId: panel.id,
      position: panel.position,
      settings,
    });
  }
}

async function hideAllFloatingPanels(tabId) {
  if (!Number.isInteger(tabId)) {
    return;
  }
  await chrome.tabs.sendMessage(tabId, {
    target: "content",
    type: "HIDE_ALL_FLOATING_PANELS",
  });
}

async function resetUiLayout(tabId) {
  const uiPreferences = normalizeUiPreferences(DEFAULT_UI_PREFERENCES);
  await chrome.storage.local.set({ uiPreferences });
  await hideAllFloatingPanels(tabId).catch(() => undefined);
  return { uiPreferences };
}

function normalizeUiPreferences(value = {}) {
  const panelOrder = normalizePanelOrder(value?.panelOrder);
  const floatingPanels = Array.isArray(value?.floatingPanels)
    ? value.floatingPanels.flatMap((panel) => {
      if (!panel || !PANEL_IDS.includes(panel.id)) {
        return [];
      }
      const normalized = { id: panel.id };
      if (panel.position) {
        normalized.position = normalizePosition(panel.position);
      }
      return [normalized];
    }).filter((panel, index, list) => list.findIndex((item) => item.id === panel.id) === index)
    : [];
  return { panelOrder, floatingPanels };
}

function normalizePanelOrder(value) {
  const requested = Array.isArray(value) ? value : [];
  const unique = requested.filter((id, index) => PANEL_IDS.includes(id) && requested.indexOf(id) === index);
  return [...unique, ...PANEL_IDS.filter((id) => !unique.includes(id))];
}

function normalizePosition(position = {}) {
  const x = Number(position.x);
  const y = Number(position.y);
  return {
    x: Number.isFinite(x) ? Math.max(0, Math.round(x)) : 24,
    y: Number.isFinite(y) ? Math.max(0, Math.round(y)) : 24,
  };
}

function friendlyError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/cannot access|chrome:\/\/|edge:\/\/|extensions gallery/i.test(message)) {
    return "O Chrome não permite controlar o áudio desta página interna.";
  }
  if (/activeTab|permission|not been invoked|gesture/i.test(message)) {
    return "Feche e abra a Sonora novamente nesta guia.";
  }
  if (/capture|stream|media/i.test(message)) {
    return "Não consegui capturar esta guia. Confirme que ela está reproduzindo áudio e reabra a Sonora.";
  }
  return message || "Ocorreu um erro ao iniciar o áudio.";
}
