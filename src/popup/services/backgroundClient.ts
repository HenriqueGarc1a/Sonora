import type { BackgroundResponse } from "../../shared/types";

export async function getActiveTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return Number.isInteger(tab?.id) ? tab.id : null;
}

export async function sendToBackground(
  message: Record<string, unknown>,
): Promise<BackgroundResponse> {
  const response = await chrome.runtime.sendMessage({ ...message, target: "background" }) as BackgroundResponse;
  if (!response?.ok) throw new Error(response?.error || "A extensão não respondeu.");
  return response;
}
