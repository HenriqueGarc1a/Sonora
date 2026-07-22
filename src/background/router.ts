import { getState, startCapture, stopCapture, updateSettings } from "./capture";
import { resetPlaybackSettings } from "./contentBridge";
import { deleteCustomPreset, saveCustomPreset } from "./presets";
import { resetUiLayout, restoreFloatingPanels, saveFloatingPosition, setPanelFloating, updatePanelOrder } from "./layout";
import { getUiPreferences } from "./storage";
import { updateTheme } from "./themeActions";

export async function handleMessage(message: any, sender: any): Promise<any> {
  const senderTabId = sender.tab?.id;
  const tabId = Number.isInteger(message.tabId) ? message.tabId : senderTabId;

  switch (message.type) {
    case "GET_STATE": return getState(tabId);
    case "START_CAPTURE": return startCapture(tabId, message.settings);
    case "STOP_CAPTURE": return stopCapture();
    case "UPDATE_SETTINGS": return updateSettings(tabId, message.settings);
    case "UPDATE_THEME": return updateTheme(tabId, message.theme);
    case "SAVE_CUSTOM_PRESET": return saveCustomPreset(message.name, message.settings);
    case "DELETE_CUSTOM_PRESET": return deleteCustomPreset(message.presetId);
    case "UPDATE_PANEL_ORDER": return updatePanelOrder(message.panelOrder);
    case "SET_PANEL_FLOATING": return setPanelFloating(tabId, message.panelId, message.floating);
    case "SAVE_FLOATING_POSITION": return saveFloatingPosition(message.panelId, message.position);
    case "RESTORE_FLOATING_PANELS":
      await restoreFloatingPanels(tabId);
      return { uiPreferences: await getUiPreferences() };
    case "RESET_UI_LAYOUT": return resetUiLayout(tabId);
    case "CAPTURE_ENDED":
      await resetPlaybackSettings(tabId).catch(() => undefined);
      await chrome.storage.session.remove("capturedTabId");
      return { active: false };
    default:
      throw new Error("Comando desconhecido.");
  }
}
