import { formatPresetDate } from "../../../shared/formatters";
import type { CustomPreset } from "../../../shared/types";

interface Props {
  presets: CustomPreset[];
  onDelete: (presetId: string) => void;
}

export function PresetsSettingsCard(props: Props): any {
  return (
    <section className="settings-card">
      <div className="settings-card-heading"><div><h2>Meus presets</h2></div><span className="count-badge">{props.presets.length}</span></div>
      <div className="saved-preset-list">
        {props.presets.map((preset) => (
          <div className="saved-preset" key={preset.id}>
            <span><strong>{preset.name}</strong><small>{formatPresetDate(preset.createdAt)}</small></span>
            <button className="delete-preset" type="button" aria-label={`Remover preset ${preset.name}`} title="Remover preset" onClick={() => props.onDelete(preset.id)}>×</button>
          </div>
        ))}
      </div>
      {props.presets.length === 0 && <p className="empty-state">Você ainda não criou nenhum preset.</p>}
    </section>
  );
}
