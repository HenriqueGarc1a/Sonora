export type NumericSettingKey =
  | "volume"
  | "speed"
  | "bass"
  | "mid"
  | "treble"
  | "reverb"
  | "stereoWidth"
  | "pan";

export type BooleanSettingKey = "preservePitch" | "nightMode";
export type SettingKey = NumericSettingKey | BooleanSettingKey;
export type PanelId = "playback" | "equalizer" | "environment" | "stereo";
export type SettingsTab = "general" | "styles";
export type AppView = "controls" | "settings";
export type ActivationState = "pending" | "ready" | "error";

export interface AudioSettings {
  volume: number;
  speed: number;
  preservePitch: boolean;
  bass: number;
  mid: number;
  treble: number;
  reverb: number;
  stereoWidth: number;
  pan: number;
  nightMode: boolean;
}

export interface CustomPreset {
  id: string;
  name: string;
  values: AudioSettings;
  createdAt: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface FloatingPanel {
  id: PanelId;
  position?: Position;
}

export interface UiPreferences {
  panelOrder: PanelId[];
  floatingPanels: FloatingPanel[];
}

export interface PresetDefinition {
  label: string;
  values: Partial<AudioSettings>;
}

export type ThemeKey = "background" | "surface" | "text" | "accent" | "danger";
export type Theme = Record<ThemeKey, string>;

export interface ThemeField {
  key: ThemeKey;
  label: string;
  description: string;
}

export interface BackgroundResponse {
  ok: boolean;
  error?: string;
  settings?: AudioSettings;
  customPresets?: CustomPreset[];
  uiPreferences?: UiPreferences;
  theme?: Theme;
  active?: boolean;
  capturedTabId?: number | null;
  currentTabActive?: boolean;
  playbackApplied?: boolean;
}
