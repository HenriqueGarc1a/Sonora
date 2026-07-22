import { DEFAULT_SETTINGS, DEFAULT_THEME } from "../../shared/constants";
import { messageFrom } from "../../shared/errors";
import { normalizeUiPreferences } from "../../shared/normalizers";
import type { ActivationState, AppView, AudioSettings, SettingsTab } from "../../shared/types";
import { getActiveTabId, sendToBackground } from "../services/backgroundClient";
import { AudioController } from "./AudioController";
import { LayoutController } from "./LayoutController";
import { PresetController } from "./PresetController";
import { ThemeController } from "./ThemeController";

type Notify = () => void;

export class SonoraController {
  activeTabId: number | null = null;
  captureActive = false;
  capturedTabId: number | null = null;
  activationState: ActivationState = "pending";
  view: AppView = "controls";
  settingsTab: SettingsTab = "general";
  error = "";
  toast = "";

  readonly audio: AudioController;
  readonly theme: ThemeController;
  readonly layout: LayoutController;
  readonly presets: PresetController;

  private disposed = false;
  private toastTimer: number | null = null;

  constructor(private readonly notify: Notify) {
    const getTabId = () => this.activeTabId;
    this.audio = new AudioController(notify, getTabId, this.setError);
    this.theme = new ThemeController(notify, getTabId, this.setError, this.showToast);
    this.layout = new LayoutController(notify, getTabId, this.setError, this.showToast);
    this.presets = new PresetController(notify, () => this.audio.settings, this.setError, this.showToast);
  }

  get currentTabIsCaptured(): boolean {
    return this.captureActive && this.capturedTabId === this.activeTabId;
  }

  get statusText(): string {
    if (this.activationState === "error") return "Indisponível";
    if (this.currentTabIsCaptured) return "Ativo";
    if (this.captureActive) return "Transferindo…";
    return "Ativando…";
  }

  setError = (message: string): void => {
    this.error = message;
    this.notify();
  };

  showToast = (message: string): void => {
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toast = message;
    this.notify();
    this.toastTimer = window.setTimeout(() => {
      this.toast = "";
      this.notify();
    }, 2200);
  };

  setView = (view: AppView): void => {
    this.view = view;
    this.notify();
  };

  setSettingsTab = (tab: SettingsTab): void => {
    this.settingsTab = tab;
    this.notify();
  };

  toggleSettings = (): void => {
    this.view = this.view === "settings" ? "controls" : "settings";
    this.settingsTab = "general";
    this.notify();
  };

  async initialize(): Promise<void> {
    try {
      const tabId = await getActiveTabId();
      const response = await sendToBackground({ type: "GET_STATE", tabId });
      if (this.disposed) return;

      const initialSettings = { ...DEFAULT_SETTINGS, ...(response.settings || {}) } as AudioSettings;
      this.activeTabId = tabId;
      this.audio.settings = initialSettings;
      this.presets.customPresets = response.customPresets || [];
      this.layout.uiPreferences = normalizeUiPreferences(response.uiPreferences);
      this.theme.setTheme(response.theme || DEFAULT_THEME);
      this.captureActive = Boolean(response.active);
      this.capturedTabId = response.capturedTabId ?? null;
      this.error = "";
      this.notify();

      if (response.active && response.capturedTabId === tabId) {
        this.activationState = "ready";
        this.notify();
        await sendToBackground({ type: "RESTORE_FLOATING_PANELS", tabId });
        return;
      }

      this.activationState = "pending";
      this.notify();
      const capture = await sendToBackground({ type: "START_CAPTURE", tabId, settings: initialSettings });
      if (this.disposed) return;
      if (capture.settings) this.audio.settings = { ...initialSettings, ...capture.settings };
      this.captureActive = Boolean(capture.active);
      this.capturedTabId = capture.capturedTabId ?? null;
      this.activationState = "ready";
      this.notify();
    } catch (error) {
      if (this.disposed) return;
      this.captureActive = false;
      this.capturedTabId = null;
      this.activationState = "error";
      this.error = messageFrom(error);
      this.notify();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.audio.dispose();
    this.theme.dispose();
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
  }
}
