import { AUDIO_PRESETS } from "../../../shared/constants";
import type { AudioSettings, CustomPreset } from "../../../shared/types";

interface Props {
  customPresets: CustomPreset[];
  settingsMatch: (values: Partial<AudioSettings>) => boolean;
  onApplyPreset: (name: string) => void;
  onApplyCustomPreset: (preset: CustomPreset) => void;
  onCreatePreset: () => void;
}

export function PresetsCard(props: Props): any {
  let activeLabel: string | null = null;
  Object.values(AUDIO_PRESETS).forEach((preset) => {
    if (props.settingsMatch(preset.values)) activeLabel = preset.label;
  });
  props.customPresets.forEach((preset) => {
    if (props.settingsMatch(preset.values)) activeLabel = preset.name;
  });

  return (
    <section className="preset-card" aria-labelledby="presetTitle">
      <div className="preset-header">
        <div><strong id="presetTitle">Presets</strong></div>
      </div>
      <div className="preset-list" role="group" aria-label="Presets de áudio">
        {Object.entries(AUDIO_PRESETS).map(([name, preset]) => (
          <button
            key={name}
            type="button"
            className={props.settingsMatch(preset.values) ? "active" : ""}
            aria-pressed={props.settingsMatch(preset.values)}
            onClick={() => props.onApplyPreset(name)}
          >
            {preset.label}
          </button>
        ))}
        {props.customPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={props.settingsMatch(preset.values) ? "active" : ""}
            aria-pressed={props.settingsMatch(preset.values)}
            onClick={() => props.onApplyCustomPreset(preset)}
          >
            {preset.name}
          </button>
        ))}
        <button className="add-preset" type="button" aria-label="Salvar ajustes como novo preset" title="Criar preset" onClick={props.onCreatePreset}>+</button>
      </div>
    </section>
  );
}
