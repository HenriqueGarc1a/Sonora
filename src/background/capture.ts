import type { AudioSettings } from "../shared/types";
import { applyPlaybackSettings, hideAllFloatingPanels, resetPlaybackSettings, syncSettings } from "./contentBridge";
import { ensureOffscreenDocument, hasOffscreenDocument, sendToOffscreen } from "./offscreen";
import { restoreFloatingPanels } from "./layout";
import { getCustomPresets, getSettings, getTheme, getUiPreferences, saveSettings } from "./storage";

export async function getState(tabId: number | undefined) {
  const [settings, capturedTabs, customPresets, uiPreferences, theme] = await Promise.all([
    getSettings(),
    chrome.tabCapture.getCapturedTabs(),
    getCustomPresets(),
    getUiPreferences(),
    getTheme(),
  ]);
  const capture = capturedTabs.find((item: any) => item.status === "active" || item.status === "pending");

  if (capture) await chrome.storage.session.set({ capturedTabId: capture.tabId });
  else await chrome.storage.session.remove("capturedTabId");

  return {
    settings,
    customPresets,
    uiPreferences,
    theme,
    active: Boolean(capture),
    capturedTabId: capture?.tabId ?? null,
    currentTabActive: Boolean(capture && capture.tabId === tabId),
  };
}

export async function startCapture(tabId: number | undefined, incomingSettings: Partial<AudioSettings>) {
  if (!Number.isInteger(tabId)) throw new Error("Não encontrei uma aba válida para capturar.");

  const settings = await saveSettings(incomingSettings);
  await ensureOffscreenDocument();
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  const { capturedTabId: previousTabId } = await chrome.storage.session.get("capturedTabId");

  await sendToOffscreen({ type: "STOP_CAPTURE" }).catch(() => undefined);
  if (Number.isInteger(previousTabId) && previousTabId !== tabId) {
    await resetPlaybackSettings(previousTabId).catch(() => undefined);
    await hideAllFloatingPanels(previousTabId).catch(() => undefined);
  }

  await sendToOffscreen({ type: "START_CAPTURE", streamId, tabId, settings });
  await chrome.storage.session.set({ capturedTabId: tabId });
  await applyPlaybackSettings(tabId!, settings).catch(() => undefined);
  await restoreFloatingPanels(tabId, settings).catch(() => undefined);
  return { active: true, capturedTabId: tabId, settings };
}

export async function stopCapture() {
  const { capturedTabId } = await chrome.storage.session.get("capturedTabId");
  if (await hasOffscreenDocument()) {
    await sendToOffscreen({ type: "STOP_CAPTURE" }).catch(() => undefined);
  }
  await resetPlaybackSettings(capturedTabId).catch(() => undefined);
  await chrome.storage.session.remove("capturedTabId");
  return { active: false, capturedTabId: null };
}

export async function updateSettings(tabId: number | undefined, incomingSettings: Partial<AudioSettings>) {
  const settings = await saveSettings(incomingSettings);
  if (await hasOffscreenDocument()) {
    await sendToOffscreen({ type: "UPDATE_AUDIO_SETTINGS", settings }).catch(() => undefined);
  }

  let playbackApplied = false;
  if (Number.isInteger(tabId)) {
    playbackApplied = await applyPlaybackSettings(tabId!, settings).then(() => true).catch(() => false);
    await syncSettings(tabId!, settings).catch(() => undefined);
  }
  return { settings, playbackApplied };
}
