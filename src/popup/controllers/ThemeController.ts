import { DEFAULT_THEME } from "../../shared/constants";
import { messageFrom } from "../../shared/errors";
import { applyTheme } from "../../shared/theme";
import type { Theme, ThemeKey } from "../../shared/types";
import { sendToBackground } from "../services/backgroundClient";

type Notify = () => void;

export class ThemeController {
  theme: Theme = { ...DEFAULT_THEME };
  private timer: number | null = null;

  constructor(
    private readonly notify: Notify,
    private readonly getActiveTabId: () => number | null,
    private readonly setError: (message: string) => void,
    private readonly showToast: (message: string) => void,
  ) {}

  setTheme = (nextTheme: Partial<Theme>): void => {
    this.theme = applyTheme(document.documentElement, nextTheme);
    this.notify();
  };

  private queueThemeUpdate = (delay = 65): void => {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(async () => {
      try {
        const response = await sendToBackground({
          type: "UPDATE_THEME",
          tabId: this.getActiveTabId(),
          theme: this.theme,
        });
        this.setTheme(response.theme || this.theme);
        this.setError("");
      } catch (error) {
        this.setError(messageFrom(error));
      }
    }, delay);
  };

  updateTheme = (key: ThemeKey, value: string): void => {
    this.theme = applyTheme(document.documentElement, { ...this.theme, [key]: value });
    this.notify();
    this.queueThemeUpdate();
  };

  resetTheme = (): void => {
    this.setTheme(DEFAULT_THEME);
    this.queueThemeUpdate(0);
    this.showToast("Cores padrão restauradas.");
  };

  dispose(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
  }
}
