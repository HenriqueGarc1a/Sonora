import { OFFSCREEN_PATH } from "./paths";

export async function hasOffscreenDocument(): Promise<boolean> {
  return chrome.offscreen.hasDocument();
}

export async function ensureOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ["USER_MEDIA"],
    justification: "Capturar e processar o áudio da aba selecionada pelo usuário.",
  });
}

export async function sendToOffscreen(message: Record<string, unknown>): Promise<any> {
  const response = await chrome.runtime.sendMessage({ ...message, target: "offscreen" });
  if (!response?.ok) {
    throw new Error(response?.error || "O processador de áudio não respondeu.");
  }
  return response;
}
