/// <reference path="../types/globals.d.ts" />
import { friendlyError } from "../shared/errors";
import { applyPlaybackSettings, resetPlaybackSettings } from "./contentBridge";
import { restoreFloatingPanels } from "./layout";
import { handleMessage } from "./router";
import { getSettings, initializeStorage } from "./storage";

chrome.runtime.onInstalled.addListener(() => initializeStorage());

chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message?.target !== "background") return false;
  handleMessage(message, sender)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      console.error("Sonora:", error);
      sendResponse({ ok: false, error: friendlyError(error) });
    });
  return true;
});

chrome.tabCapture.onStatusChanged.addListener(async (info: any) => {
  if (info.status !== "stopped" && info.status !== "error") return;
  await resetPlaybackSettings(info.tabId).catch(() => undefined);
  const { capturedTabId } = await chrome.storage.session.get("capturedTabId");
  if (capturedTabId === info.tabId) await chrome.storage.session.remove("capturedTabId");
});

chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: any) => {
  if (changeInfo.status !== "complete") return;
  const { capturedTabId } = await chrome.storage.session.get("capturedTabId");
  if (capturedTabId !== tabId) return;
  const settings = await getSettings();
  await applyPlaybackSettings(tabId, settings).catch(() => undefined);
  await restoreFloatingPanels(tabId, settings).catch(() => undefined);
});
