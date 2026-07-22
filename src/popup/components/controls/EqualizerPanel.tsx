import type { AudioSettings, NumericSettingKey } from "../../../shared/types";
import { CompactRange } from "./CompactRange";

interface Props {
  settings: AudioSettings;
  onChange: (key: NumericSettingKey, value: number) => void;
}

export function EqualizerPanel(props: Props): any {
  return (
    <div className="eq-grid">
      <CompactRange settingKey="bass" label="Graves" value={props.settings.bass} onChange={props.onChange} />
      <CompactRange settingKey="mid" label="Médios" value={props.settings.mid} onChange={props.onChange} />
      <CompactRange settingKey="treble" label="Agudos" value={props.settings.treble} onChange={props.onChange} />
    </div>
  );
}
