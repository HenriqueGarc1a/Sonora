const OFFSCREEN_PATH = "offscreen.html";

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
  const { settings } = await chrome.storage.local.get("settings");
  await chrome.storage.local.set({ settings: normalizeSettings(settings) });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "background") {
    return false;
  }

  handleMessage(message)
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
});

async function handleMessage(message) {
  switch (message.type) {
    case "GET_STATE":
      return getState(message.tabId);
    case "START_CAPTURE":
      return startCapture(message.tabId, message.settings);
    case "STOP_CAPTURE":
      return stopCapture();
    case "UPDATE_SETTINGS":
      return updateSettings(message.tabId, message.settings);
    case "CAPTURE_ENDED":
      await resetPlaybackSettings(message.tabId).catch(() => undefined);
      await chrome.storage.session.remove("capturedTabId");
      return { active: false };
    default:
      throw new Error("Comando desconhecido.");
  }
}

async function getState(tabId) {
  const [settings, capturedTabs] = await Promise.all([
    getSettings(),
    chrome.tabCapture.getCapturedTabs(),
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
  const streamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: tabId,
  });
  const { capturedTabId: previousTabId } =
    await chrome.storage.session.get("capturedTabId");

  // O MVP processa uma aba por vez. A troca é intencional e transparente.
  await sendToOffscreen({ type: "STOP_CAPTURE" }).catch(() => undefined);

  if (Number.isInteger(previousTabId) && previousTabId !== tabId) {
    await resetPlaybackSettings(previousTabId).catch(() => undefined);
  }

  await sendToOffscreen({
    type: "START_CAPTURE",
    streamId,
    tabId,
    settings,
  });

  await chrome.storage.session.set({ capturedTabId: tabId });
  await applyPlaybackSettings(tabId, settings).catch(() => undefined);

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
    await sendToOffscreen({
      type: "UPDATE_AUDIO_SETTINGS",
      settings,
    }).catch(() => undefined);
  }

  let playbackApplied = false;
  if (Number.isInteger(tabId)) {
    playbackApplied = await applyPlaybackSettings(tabId, settings)
      .then(() => true)
      .catch(() => false);
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
    files: ["content.js"],
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
  return chrome.runtime.sendMessage({
    ...message,
    target: "offscreen",
  }).then((response) => {
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

  result.preservePitch =
    typeof settings?.preservePitch === "boolean"
      ? settings.preservePitch
      : DEFAULT_SETTINGS.preservePitch;
  result.nightMode =
    typeof settings?.nightMode === "boolean"
      ? settings.nightMode
      : DEFAULT_SETTINGS.nightMode;

  return result;
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
