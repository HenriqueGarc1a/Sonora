import type { BooleanSettingKey, NumericSettingKey, PanelId } from "../../shared/types";

type RangeField = {
  key: NumericSettingKey;
  label: string;
  type: "range";
  min: number;
  max: number;
  step: number;
};

type CheckboxField = {
  key: BooleanSettingKey;
  label: string;
  type: "checkbox";
};

export type PanelField = RangeField | CheckboxField;
export interface PanelDefinition { title: string; fields: PanelField[]; }

export const PANEL_DEFINITIONS: Readonly<Record<PanelId, PanelDefinition>> = Object.freeze({
  playback: {
    title: "Reprodução",
    fields: [
      { key: "volume", label: "Volume", type: "range", min: 0, max: 300, step: 1 },
      { key: "speed", label: "Velocidade", type: "range", min: 0.5, max: 2, step: 0.05 },
      { key: "preservePitch", label: "Manter pitch original", type: "checkbox" },
    ],
  },
  equalizer: {
    title: "Equalizador",
    fields: [
      { key: "bass", label: "Graves", type: "range", min: -12, max: 12, step: 1 },
      { key: "mid", label: "Médios", type: "range", min: -12, max: 12, step: 1 },
      { key: "treble", label: "Agudos", type: "range", min: -12, max: 12, step: 1 },
    ],
  },
  environment: {
    title: "Ambiente",
    fields: [
      { key: "reverb", label: "Reverb", type: "range", min: 0, max: 100, step: 1 },
      { key: "nightMode", label: "Modo noturno", type: "checkbox" },
    ],
  },
  stereo: {
    title: "Imagem estéreo",
    fields: [
      { key: "stereoWidth", label: "Largura", type: "range", min: 0, max: 200, step: 1 },
      { key: "pan", label: "Balanço", type: "range", min: -100, max: 100, step: 1 },
    ],
  },
});
