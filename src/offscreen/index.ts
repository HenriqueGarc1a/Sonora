/// <reference path="../types/globals.d.ts" />
import { createCaptureSession } from "./captureSession";

const capture = createCaptureSession();

async function handleMessage(message: any) {
  switch (message.type) {
    case "START_CAPTURE":
      try {
        await capture.start(message.streamId, message.tabId, message.settings);
        return { active: true };
      } catch (error) {
        await capture.stop(false);
        throw error;
      }
    case "STOP_CAPTURE":
      await capture.stop(false);
      return { active: false };
    case "UPDATE_AUDIO_SETTINGS":
      capture.update(message.settings);
      return { active: capture.isActive() };
    default:
      throw new Error("Comando de áudio desconhecido.");
  }
}

chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
  if (message?.target !== "offscreen") return false;
  handleMessage(message)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      console.error("Sonora offscreen:", error);
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });
  return true;
});
