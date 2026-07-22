import type { AudioSettings, PanelId, PresetDefinition, Theme } from "./types";

export const VERSION = "0.7.2";

export const DEFAULT_SETTINGS: Readonly<AudioSettings> = Object.freeze({
  volume: 100,
  speed: 1,
  preservePitch: true,
  bass: 0,
  mid: 0,
  treble: 0,
  reverb: 0,
  stereoWidth: 100,
  pan: 0,
  nightMode: false,
});

export const PANEL_IDS: readonly PanelId[] = Object.freeze([
  "playback",
  "equalizer",
  "environment",
  "stereo",
]);

export const DEFAULT_UI_PREFERENCES = Object.freeze({
  panelOrder: [...PANEL_IDS],
  floatingPanels: [],
});

export const PANEL_TITLES: Readonly<Record<PanelId, string>> = Object.freeze({
  playback: "Reprodução",
  equalizer: "Equalizador",
  environment: "Ambiente",
  stereo: "Imagem estéreo",
});

export const AUDIO_PRESETS: Readonly<Record<string, PresetDefinition>> = Object.freeze({
  neutral: { label: "Neutro", values: { ...DEFAULT_SETTINGS, preservePitch: false } },
});

export const SETTING_LIMITS: Readonly<Record<string, readonly [number, number]>> = Object.freeze({
  volume: [0, 300],
  speed: [0.5, 2],
  bass: [-12, 12],
  mid: [-12, 12],
  treble: [-12, 12],
  reverb: [0, 100],
  stereoWidth: [0, 200],
  pan: [-100, 100],
});

export const DEFAULT_THEME: Readonly<Theme> = Object.freeze({
  background: "#0c0c0e",
  surface: "#151518",
  text: "#f6f4f2",
  accent: "#c8ff3d",
  danger: "#ff7b7b",
});
