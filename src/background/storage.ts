import { normalizeCustomPresets, normalizeSettings, normalizeUiPreferences } from "../shared/normalizers";
import { normalizeTheme } from "../shared/theme";
import type { AudioSettings, CustomPreset, Theme, UiPreferences } from "../shared/types";

export async function initializeStorage(): Promise<void> {
  const stored = await chrome.storage.local.get(["settings", "customPresets", "uiPreferences", "theme"]);
  await chrome.storage.local.set({
    settings: normalizeSettings(stored.settings),
    customPresets: normalizeCustomPresets(stored.customPresets),
    uiPreferences: normalizeUiPreferences(stored.uiPreferences),
    theme: normalizeTheme(stored.theme),
  });
}

export async function getSettings(): Promise<AudioSettings> {
  const { settings } = await chrome.storage.local.get("settings");
  return normalizeSettings(settings);
}

export async function saveSettings(settings: Partial<AudioSettings>): Promise<AudioSettings> {
  const normalized = normalizeSettings(settings);
  await chrome.storage.local.set({ settings: normalized });
  return normalized;
}

export async function getTheme(): Promise<Theme> {
  const { theme } = await chrome.storage.local.get("theme");
  return normalizeTheme(theme);
}

export async function saveTheme(theme: Partial<Theme>): Promise<Theme> {
  const normalized = normalizeTheme(theme);
  await chrome.storage.local.set({ theme: normalized });
  return normalized;
}

export async function getCustomPresets(): Promise<CustomPreset[]> {
  const { customPresets } = await chrome.storage.local.get("customPresets");
  return normalizeCustomPresets(customPresets);
}

export async function setCustomPresets(customPresets: CustomPreset[]): Promise<void> {
  await chrome.storage.local.set({ customPresets });
}

export async function getUiPreferences(): Promise<UiPreferences> {
  const { uiPreferences } = await chrome.storage.local.get("uiPreferences");
  return normalizeUiPreferences(uiPreferences);
}

export async function setUiPreferences(uiPreferences: UiPreferences): Promise<void> {
  await chrome.storage.local.set({ uiPreferences: normalizeUiPreferences(uiPreferences) });
}
