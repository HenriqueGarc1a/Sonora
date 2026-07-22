import { DEFAULT_SETTINGS } from "../../shared/constants";
import { formatSettingValue } from "../../shared/formatters";
import { applyTheme, normalizeTheme } from "../../shared/theme";
import type { AudioSettings, PanelId, Position, Theme } from "../../shared/types";
import { PANEL_DEFINITIONS, type PanelDefinition } from "./definitions";
import { createFieldMarkup } from "./markup";
import { bindPanelMovement, setPanelPosition, type MovablePanelRecord } from "./movement";
import { floatingPanelStyles } from "./styles";

interface FloatingPanelRecord extends MovablePanelRecord {
  definition: PanelDefinition;
  root: ShadowRoot;
}

export function createFloatingPanelManager() {
  const panels = new Map<PanelId, FloatingPanelRecord>();
  let audioSettings = { ...DEFAULT_SETTINGS } as AudioSettings;
  let uiTheme = normalizeTheme();
  let updateTimer: number | null = null;

  const updatePanel = (record: FloatingPanelRecord) => {
    for (const field of record.definition.fields) {
      const control = record.root.querySelector<HTMLInputElement>(`[data-setting="${field.key}"]`);
      if (!control) continue;
      if (field.type === "checkbox") {
        control.checked = Boolean(audioSettings[field.key]);
      } else {
        const value = Number(audioSettings[field.key]);
        control.value = String(value);
        const progress = ((value - field.min) / (field.max - field.min)) * 100;
        control.style.setProperty("--progress", `${progress}%`);
        const output = record.root.querySelector<HTMLOutputElement>(`[data-output="${field.key}"]`);
        if (output) output.textContent = formatSettingValue(field.key, value);
      }
    }
  };

  const updateAll = () => panels.forEach(updatePanel);

  const syncSettings = (incomingSettings: Partial<AudioSettings> = {}) => {
    audioSettings = { ...DEFAULT_SETTINGS, ...audioSettings, ...incomingSettings };
    updateAll();
  };

  const syncTheme = (incomingTheme: Partial<Theme> = uiTheme) => {
    uiTheme = normalizeTheme(incomingTheme);
    panels.forEach((record) => applyTheme(record.host, uiTheme));
  };

  const queueSettingsUpdate = () => {
    if (updateTimer !== null) window.clearTimeout(updateTimer);
    updateTimer = window.setTimeout(async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          target: "background",
          type: "UPDATE_SETTINGS",
          settings: audioSettings,
        });
        if (response?.ok && response.settings) syncSettings(response.settings);
      } catch {
        // A extensão pode ter sido recarregada enquanto o painel estava aberto.
      }
    }, 65);
  };

  const hide = (panelId: PanelId) => {
    const record = panels.get(panelId);
    if (!record) return;
    record.host.remove();
    panels.delete(panelId);
  };

  const hideAll = () => [...panels.keys()].forEach(hide);

  const bindControls = (record: FloatingPanelRecord) => {
    record.root.querySelector<HTMLButtonElement>(".close")?.addEventListener("click", () => {
      hide(record.panelId);
      chrome.runtime.sendMessage({
        target: "background",
        type: "SET_PANEL_FLOATING",
        panelId: record.panelId,
        floating: false,
      }).catch(() => undefined);
    });

    for (const field of record.definition.fields) {
      const control = record.root.querySelector<HTMLInputElement>(`[data-setting="${field.key}"]`);
      if (!control) continue;
      const eventName = field.type === "checkbox" ? "change" : "input";
      control.addEventListener(eventName, () => {
        (audioSettings as any)[field.key] = field.type === "checkbox" ? control.checked : Number(control.value);
        updateAll();
        queueSettingsUpdate();
      });
    }

    const titlebar = record.root.querySelector<HTMLElement>(".titlebar");
    if (titlebar) bindPanelMovement(record, titlebar);
  };

  const show = (
    panelId: PanelId,
    incomingSettings?: Partial<AudioSettings>,
    savedPosition?: Partial<Position>,
    incomingTheme?: Partial<Theme>,
  ) => {
    const definition = PANEL_DEFINITIONS[panelId];
    if (!definition) return;
    syncSettings(incomingSettings);
    syncTheme(incomingTheme);

    const existing = panels.get(panelId);
    if (existing) {
      if (savedPosition) setPanelPosition(existing, savedPosition);
      updatePanel(existing);
      return;
    }

    const host = document.createElement("div");
    host.id = `sonora-floating-${panelId}`;
    host.setAttribute("data-sonora-panel", panelId);
    Object.assign(host.style, {
      position: "fixed",
      zIndex: "2147483647",
      display: "block",
      width: "292px",
      margin: "0",
      padding: "0",
      border: "0",
      background: "transparent",
      colorScheme: "dark",
    });

    applyTheme(host, uiTheme);
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>${floatingPanelStyles()}</style>
      <section class="panel" aria-label="Controles Sonora: ${definition.title}">
        <header class="titlebar">
          <span class="brand"><i></i><strong>SONORA</strong></span>
          <button class="close" type="button" aria-label="Fechar painel ${definition.title}" title="Remover da página">×</button>
        </header>
        <div class="fields">${definition.fields.map(createFieldMarkup).join("")}</div>
      </section>
    `;
    document.documentElement.append(host);

    const record: FloatingPanelRecord = { panelId, definition, host, root, x: 0, y: 0 };
    panels.set(panelId, record);
    const fallbackPosition = {
      x: Math.max(12, window.innerWidth - 316),
      y: Math.min(Math.max(18, 18 + (panels.size - 1) * 34), Math.max(18, window.innerHeight - 90)),
    };
    setPanelPosition(record, savedPosition || fallbackPosition);
    bindControls(record);
    updatePanel(record);
  };

  const keepInsideViewport = () => {
    panels.forEach((record) => setPanelPosition(record, { x: record.x, y: record.y }));
  };

  return { show, hide, hideAll, syncSettings, syncTheme, keepInsideViewport };
}
