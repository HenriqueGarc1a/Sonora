import { AUDIO_PRESETS, DEFAULT_SETTINGS } from "../../shared/constants";
import { messageFrom } from "../../shared/errors";
import type {
  AudioSettings,
  BooleanSettingKey,
  CustomPreset,
  NumericSettingKey,
  SettingKey,
} from "../../shared/types";
import { sendToBackground } from "../services/backgroundClient";

type Notify = () => void;

export class AudioController {
  settings: AudioSettings = { ...DEFAULT_SETTINGS };
  private timer: number | null = null;

  constructor(
    private readonly notify: Notify,
    private readonly getActiveTabId: () => number | null,
    private readonly setError: (message: string) => void,
  ) {}

  setSettings = (next: AudioSettings): void => {
    this.settings = next;
    this.notify();
  };

  private queueUpdate = (delay = 65): void => {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(async () => {
      try {
        const response = await sendToBackground({
          type: "UPDATE_SETTINGS",
          tabId: this.getActiveTabId(),
          settings: this.settings,
        });
        if (response.settings) this.settings = { ...this.settings, ...response.settings };
        this.setError("");
        this.notify();
      } catch (error) {
        this.setError(messageFrom(error));
      }
    }, delay);
  };

  updateNumericSetting = (key: NumericSettingKey, value: number): void => {
    this.settings = { ...this.settings, [key]: value };
    this.notify();
    this.queueUpdate();
  };

  updateBooleanSetting = (key: BooleanSettingKey, value: boolean): void => {
    this.settings = { ...this.settings, [key]: value };
    this.notify();
    this.queueUpdate();
  };

  applyPreset = (presetName: string): void => {
    const preset = AUDIO_PRESETS[presetName];
    if (!preset) return;
    this.settings = { ...this.settings, ...preset.values };
    this.notify();
    this.queueUpdate(0);
  };

  applyCustomPreset = (preset: CustomPreset): void => {
    this.settings = { ...DEFAULT_SETTINGS, ...preset.values };
    this.notify();
    this.queueUpdate(0);
  };

  settingsMatch = (values: Partial<AudioSettings>): boolean => (
    Object.entries(values).every(([key, value]) => this.settings[key as SettingKey] === value)
  );

  dispose(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
  }
}
