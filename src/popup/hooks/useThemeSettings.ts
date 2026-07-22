import { DEFAULT_THEME } from "../../shared/constants";
import { messageFrom } from "../../shared/errors";
import { applyTheme } from "../../shared/theme";
import type { Theme, ThemeKey } from "../../shared/types";
import { sendToBackground } from "../services/backgroundClient";

interface Options {
  activeTabId: number | null;
  setError: (message: string) => void;
  showToast: (message: string) => void;
}

export function useThemeSettings({ activeTabId, setError, showToast }: Options) {
  const [theme, setThemeState] = React.useState({ ...DEFAULT_THEME } as Theme);
  const themeRef = React.useRef(theme);
  const timerRef = React.useRef(null as number | null);

  React.useEffect(() => { themeRef.current = theme; }, [theme]);
  React.useEffect(() => {
    applyTheme(document.documentElement, theme);
  }, [theme]);
  React.useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const setTheme = React.useCallback((nextTheme: Partial<Theme>) => {
    const normalized = applyTheme(document.documentElement, nextTheme);
    themeRef.current = normalized;
    setThemeState(normalized);
  }, []);

  const queueThemeUpdate = React.useCallback((delay = 65) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      try {
        const response = await sendToBackground({
          type: "UPDATE_THEME",
          tabId: activeTabId,
          theme: themeRef.current,
        });
        setTheme(response.theme || themeRef.current);
        setError("");
      } catch (error) {
        setError(messageFrom(error));
      }
    }, delay);
  }, [activeTabId, setError, setTheme]);

  const updateTheme = React.useCallback((key: ThemeKey, value: string) => {
    const normalized = applyTheme(document.documentElement, { ...themeRef.current, [key]: value });
    themeRef.current = normalized;
    setThemeState(normalized);
    queueThemeUpdate();
  }, [queueThemeUpdate]);

  const resetTheme = React.useCallback(() => {
    setTheme(DEFAULT_THEME);
    queueThemeUpdate(0);
    showToast("Cores padrão restauradas.");
  }, [queueThemeUpdate, setTheme, showToast]);

  return { theme, setTheme, updateTheme, resetTheme };
}
