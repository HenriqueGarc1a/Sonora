import { DEFAULT_SETTINGS, PANEL_IDS, SETTING_LIMITS } from "./constants";
import type { AudioSettings, CustomPreset, PanelId, Position, UiPreferences } from "./types";

export function normalizeSettings(settings: Partial<AudioSettings> = {}): AudioSettings {
  const result = { ...DEFAULT_SETTINGS } as AudioSettings;
  for (const [key, [minimum, maximum]] of Object.entries(SETTING_LIMITS)) {
    const value = Number(settings[key as keyof AudioSettings]);
    result[key as keyof AudioSettings] = (Number.isFinite(value)
      ? Math.min(maximum, Math.max(minimum, value))
      : DEFAULT_SETTINGS[key as keyof AudioSettings]) as never;
  }
  result.preservePitch = typeof settings.preservePitch === "boolean"
    ? settings.preservePitch
    : DEFAULT_SETTINGS.preservePitch;
  result.nightMode = typeof settings.nightMode === "boolean"
    ? settings.nightMode
    : DEFAULT_SETTINGS.nightMode;
  return result;
}

export function normalizePanelOrder(value: unknown): PanelId[] {
  const requested = Array.isArray(value) ? value : [];
  const unique = requested.filter(
    (id, index): id is PanelId => PANEL_IDS.includes(id as PanelId) && requested.indexOf(id) === index,
  );
  return [...unique, ...PANEL_IDS.filter((id) => !unique.includes(id))];
}

export function normalizePosition(position: Partial<Position> = {}): Position {
  const x = Number(position.x);
  const y = Number(position.y);
  return {
    x: Number.isFinite(x) ? Math.max(0, Math.round(x)) : 24,
    y: Number.isFinite(y) ? Math.max(0, Math.round(y)) : 24,
  };
}

export function normalizeUiPreferences(value: Partial<UiPreferences> = {}): UiPreferences {
  const floatingPanels = Array.isArray(value.floatingPanels)
    ? value.floatingPanels
        .flatMap((panel) => {
          if (!panel || !PANEL_IDS.includes(panel.id)) return [];
          return [{ id: panel.id, ...(panel.position ? { position: normalizePosition(panel.position) } : {}) }];
        })
        .filter((panel, index, list) => list.findIndex((item) => item.id === panel.id) === index)
    : [];
  return { panelOrder: normalizePanelOrder(value.panelOrder), floatingPanels };
}

export function normalizeCustomPresets(value: unknown): CustomPreset[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.slice(0, 30).flatMap((preset) => {
    const id = typeof preset?.id === "string" ? preset.id.slice(0, 80) : "";
    const name = typeof preset?.name === "string" ? preset.name.trim().slice(0, 24) : "";
    if (!id || !name || seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      name,
      values: normalizeSettings(preset.values),
      createdAt: typeof preset.createdAt === "string" ? preset.createdAt : "",
    }];
  });
}
