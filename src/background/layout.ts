import { DEFAULT_UI_PREFERENCES, PANEL_IDS } from "../shared/constants";
import { normalizePanelOrder, normalizePosition, normalizeUiPreferences } from "../shared/normalizers";
import type { PanelId, Position } from "../shared/types";
import { ensureContentController, hideAllFloatingPanels } from "./contentBridge";
import { getSettings, getTheme, getUiPreferences, setUiPreferences } from "./storage";

export async function updatePanelOrder(panelOrder: unknown) {
  const uiPreferences = await getUiPreferences();
  uiPreferences.panelOrder = normalizePanelOrder(panelOrder);
  await setUiPreferences(uiPreferences);
  return { uiPreferences };
}

export async function setPanelFloating(tabId: number | undefined, panelId: PanelId, floating: boolean) {
  if (!PANEL_IDS.includes(panelId)) throw new Error("Painel inválido.");
  const uiPreferences = await getUiPreferences();
  const previousPreferences = structuredClone(uiPreferences);
  const existing = uiPreferences.floatingPanels.find((panel) => panel.id === panelId);
  uiPreferences.floatingPanels = uiPreferences.floatingPanels.filter((panel) => panel.id !== panelId);
  if (floating) uiPreferences.floatingPanels.push(existing || { id: panelId });
  await setUiPreferences(uiPreferences);

  try {
    if (Number.isInteger(tabId)) {
      if (floating) {
        await ensureContentController(tabId!);
        await chrome.tabs.sendMessage(tabId, {
          target: "content",
          type: "SHOW_FLOATING_PANEL",
          panelId,
          position: existing?.position,
          settings: await getSettings(),
          theme: await getTheme(),
        });
      } else {
        await chrome.tabs.sendMessage(tabId, { target: "content", type: "HIDE_FLOATING_PANEL", panelId }).catch(() => undefined);
      }
    }
  } catch (error) {
    await setUiPreferences(previousPreferences);
    throw error;
  }
  return { uiPreferences };
}

export async function saveFloatingPosition(panelId: PanelId, position: Partial<Position>) {
  if (!PANEL_IDS.includes(panelId)) throw new Error("Painel inválido.");
  const uiPreferences = await getUiPreferences();
  const panel = uiPreferences.floatingPanels.find((item) => item.id === panelId);
  if (panel) {
    panel.position = normalizePosition(position);
    await setUiPreferences(uiPreferences);
  }
  return { uiPreferences };
}

export async function restoreFloatingPanels(tabId: number | undefined, providedSettings?: unknown, providedTheme?: unknown): Promise<void> {
  if (!Number.isInteger(tabId)) return;
  const uiPreferences = await getUiPreferences();
  if (!uiPreferences.floatingPanels.length) return;
  const settings = providedSettings || await getSettings();
  const theme = providedTheme || await getTheme();
  await ensureContentController(tabId!);
  for (const panel of uiPreferences.floatingPanels) {
    await chrome.tabs.sendMessage(tabId, {
      target: "content",
      type: "SHOW_FLOATING_PANEL",
      panelId: panel.id,
      position: panel.position,
      settings,
      theme,
    });
  }
}

export async function resetUiLayout(tabId: number | undefined) {
  const uiPreferences = normalizeUiPreferences(DEFAULT_UI_PREFERENCES);
  await setUiPreferences(uiPreferences);
  await hideAllFloatingPanels(tabId).catch(() => undefined);
  return { uiPreferences };
}
