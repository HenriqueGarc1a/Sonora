import { DEFAULT_SETTINGS, DEFAULT_THEME } from "../../shared/constants";
import { messageFrom } from "../../shared/errors";
import { normalizeUiPreferences } from "../../shared/normalizers";
import type { ActivationState, AppView, AudioSettings, SettingsTab } from "../../shared/types";
import { getActiveTabId, sendToBackground } from "../services/backgroundClient";
import { useAudioSettings } from "./useAudioSettings";
import { useCustomPresets } from "./useCustomPresets";
import { usePanelLayout } from "./usePanelLayout";
import { useThemeSettings } from "./useThemeSettings";
import { useToast } from "./useToast";

export function useSonoraController() {
  const [activeTabId, setActiveTabId] = React.useState(null as number | null);
  const [captureActive, setCaptureActive] = React.useState(false);
  const [capturedTabId, setCapturedTabId] = React.useState(null as number | null);
  const [activationState, setActivationState] = React.useState("pending" as ActivationState);
  const [view, setView] = React.useState("controls" as AppView);
  const [settingsTab, setSettingsTab] = React.useState("general" as SettingsTab);
  const [error, setError] = React.useState("");
  const { toast, showToast } = useToast();

  const audio = useAudioSettings({ activeTabId, setError });
  const theme = useThemeSettings({ activeTabId, setError, showToast });
  const layout = usePanelLayout({ activeTabId, setError, showToast });
  const presets = useCustomPresets({ settingsRef: audio.settingsRef, setError, showToast });

  React.useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const tabId = await getActiveTabId();
        const response = await sendToBackground({ type: "GET_STATE", tabId });
        if (cancelled) return;

        const initialSettings = { ...DEFAULT_SETTINGS, ...(response.settings || {}) } as AudioSettings;
        setActiveTabId(tabId);
        audio.setSettings(initialSettings);
        presets.setCustomPresets(response.customPresets || []);
        layout.setUiPreferences(normalizeUiPreferences(response.uiPreferences));
        theme.setTheme(response.theme || DEFAULT_THEME);
        setCaptureActive(Boolean(response.active));
        setCapturedTabId(response.capturedTabId ?? null);
        setError("");

        if (response.active && response.capturedTabId === tabId) {
          setActivationState("ready");
          await sendToBackground({ type: "RESTORE_FLOATING_PANELS", tabId });
          return;
        }

        setActivationState("pending");
        const capture = await sendToBackground({ type: "START_CAPTURE", tabId, settings: initialSettings });
        if (cancelled) return;
        if (capture.settings) audio.setSettings({ ...initialSettings, ...capture.settings });
        setCaptureActive(Boolean(capture.active));
        setCapturedTabId(capture.capturedTabId ?? null);
        setActivationState("ready");
      } catch (caught) {
        if (cancelled) return;
        setCaptureActive(false);
        setCapturedTabId(null);
        setActivationState("error");
        setError(messageFrom(caught));
      }
    };

    initialize();
    return () => { cancelled = true; };
  }, []);

  const toggleSettings = React.useCallback(() => {
    setView((current: AppView) => current === "settings" ? "controls" : "settings");
    setSettingsTab("general");
  }, []);

  const statusText = activationState === "error"
    ? "Indisponível"
    : captureActive && capturedTabId === activeTabId
      ? "Ativo"
      : captureActive
        ? "Transferindo…"
        : "Ativando…";

  return {
    activeTabId,
    currentTabIsCaptured: captureActive && capturedTabId === activeTabId,
    activationState,
    statusText,
    view,
    setView,
    settingsTab,
    setSettingsTab,
    toggleSettings,
    error,
    toast,
    showToast,
    audio,
    theme,
    layout,
    presets,
  };
}
