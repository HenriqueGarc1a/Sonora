/// <reference path="../types/globals.d.ts" />
import type { PanelId } from "../shared/types";
import { createFloatingPanelManager } from "./floating/manager";
import { createPlaybackController } from "./playback/controller";

(() => {
  if ((globalThis as any).__sonoraPlaybackController) return;

  const playback = createPlaybackController();
  const floating = createFloatingPanelManager();

  (globalThis as any).__sonoraPlaybackController = {
    update: playback.update,
    release: playback.release,
    showFloatingPanel: floating.show,
    hideFloatingPanel: floating.hide,
  };

  chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
    if (message?.target !== "content") return false;

    switch (message.type) {
      case "PING":
        sendResponse({ ready: true });
        break;
      case "APPLY_PLAYBACK_SETTINGS":
        playback.update(message);
        sendResponse({ applied: true });
        break;
      case "RESET_PLAYBACK_SETTINGS":
        playback.release();
        sendResponse({ applied: true });
        break;
      case "SHOW_FLOATING_PANEL":
        floating.show(message.panelId as PanelId, message.settings, message.position, message.theme);
        sendResponse({ visible: true });
        break;
      case "HIDE_FLOATING_PANEL":
        floating.hide(message.panelId as PanelId);
        sendResponse({ visible: false });
        break;
      case "HIDE_ALL_FLOATING_PANELS":
        floating.hideAll();
        sendResponse({ visible: false });
        break;
      case "SYNC_SONORA_SETTINGS":
        floating.syncSettings(message.settings);
        sendResponse({ synced: true });
        break;
      case "SYNC_SONORA_THEME":
        floating.syncTheme(message.theme);
        sendResponse({ synced: true });
        break;
      default:
        return false;
    }
    return false;
  });

  window.addEventListener("resize", floating.keepInsideViewport);
  playback.discoverMedia();
})();
