import type { Theme } from "../shared/types";
import { syncTheme } from "./contentBridge";
import { saveTheme } from "./storage";

export async function updateTheme(tabId: number | undefined, incomingTheme: Partial<Theme>) {
  const theme = await saveTheme(incomingTheme);
  if (Number.isInteger(tabId)) {
    await syncTheme(tabId!, theme).catch(() => undefined);
  }
  return { theme };
}
