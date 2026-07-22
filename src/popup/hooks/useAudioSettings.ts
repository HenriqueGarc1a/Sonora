import { AUDIO_PRESETS, DEFAULT_SETTINGS } from "../../shared/constants";
import type { AudioSettings, BooleanSettingKey, CustomPreset, NumericSettingKey, SettingKey } from "../../shared/types";
import { sendToBackground } from "../services/backgroundClient";
import { messageFrom } from "../../shared/errors";

interface Options {
  activeTabId: number | null;
  setError: (message: string) => void;
}

export function useAudioSettings({ activeTabId, setError }: Options) {
  const [settings, setSettings] = React.useState({ ...DEFAULT_SETTINGS } as AudioSettings);
  const settingsRef = React.useRef(settings);
  const timerRef = React.useRef(null as number | null);

  React.useEffect(() => { settingsRef.current = settings; }, [settings]);

  const replaceSettings = React.useCallback((next: AudioSettings) => {
    settingsRef.current = next;
    setSettings(next);
  }, []);
  React.useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const queueUpdate = React.useCallback((delay = 65) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      try {
        const response = await sendToBackground({
          type: "UPDATE_SETTINGS",
          tabId: activeTabId,
          settings: settingsRef.current,
        });
        if (response.settings) setSettings((current: AudioSettings) => ({ ...current, ...response.settings }));
        setError("");
      } catch (error) {
        setError(messageFrom(error));
      }
    }, delay);
  }, [activeTabId, setError]);

  const updateNumericSetting = React.useCallback((key: NumericSettingKey, value: number) => {
    const next = { ...settingsRef.current, [key]: value };
    settingsRef.current = next;
    setSettings(next);
    queueUpdate();
  }, [queueUpdate]);

  const updateBooleanSetting = React.useCallback((key: BooleanSettingKey, value: boolean) => {
    const next = { ...settingsRef.current, [key]: value };
    settingsRef.current = next;
    setSettings(next);
    queueUpdate();
  }, [queueUpdate]);

  const applyPreset = React.useCallback((presetName: string) => {
    const preset = AUDIO_PRESETS[presetName];
    if (!preset) return;
    const next = { ...settingsRef.current, ...preset.values };
    settingsRef.current = next;
    setSettings(next);
    queueUpdate(0);
  }, [queueUpdate]);

  const applyCustomPreset = React.useCallback((preset: CustomPreset) => {
    const next = { ...DEFAULT_SETTINGS, ...preset.values };
    settingsRef.current = next;
    setSettings(next);
    queueUpdate(0);
  }, [queueUpdate]);

  const settingsMatch = React.useCallback((values: Partial<AudioSettings>) => (
    Object.entries(values).every(([key, value]) => settings[key as SettingKey] === value)
  ), [settings]);

  return {
    settings,
    settingsRef,
    setSettings: replaceSettings,
    updateNumericSetting,
    updateBooleanSetting,
    applyPreset,
    applyCustomPreset,
    settingsMatch,
  };
}
