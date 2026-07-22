import type { AudioSettings } from "../shared/types";
import { CONTENT_PATH } from "./paths";

export async function ensureContentController(tabId: number): Promise<void> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { target: "content", type: "PING" });
    if (response?.ready) return;
  } catch {
    // O controlador ainda não foi injetado nesta navegação.
  }
  await chrome.scripting.executeScript({ target: { tabId }, files: [CONTENT_PATH] });
}

export async function applyPlaybackSettings(tabId: number, settings: AudioSettings): Promise<void> {
  await ensureContentController(tabId);
  await chrome.tabs.sendMessage(tabId, {
    target: "content",
    type: "APPLY_PLAYBACK_SETTINGS",
    speed: settings.speed,
    preservePitch: settings.preservePitch,
  });
}

export async function resetPlaybackSettings(tabId: number | null | undefined): Promise<void> {
  if (!Number.isInteger(tabId)) return;
  await chrome.tabs.sendMessage(tabId, { target: "content", type: "RESET_PLAYBACK_SETTINGS" });
}

export async function syncSettings(tabId: number, settings: AudioSettings): Promise<void> {
  await chrome.tabs.sendMessage(tabId, { target: "content", type: "SYNC_SONORA_SETTINGS", settings });
}

export async function syncTheme(tabId: number, theme: unknown): Promise<void> {
  await chrome.tabs.sendMessage(tabId, { target: "content", type: "SYNC_SONORA_THEME", theme });
}

export async function hideAllFloatingPanels(tabId: number | null | undefined): Promise<void> {
  if (!Number.isInteger(tabId)) return;
  await chrome.tabs.sendMessage(tabId, { target: "content", type: "HIDE_ALL_FLOATING_PANELS" });
}
