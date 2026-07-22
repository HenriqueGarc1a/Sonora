import { formatSettingValue } from "../../../shared/formatters";
import type { NumericSettingKey } from "../../../shared/types";

interface Props {
  settingKey: "bass" | "mid" | "treble";
  label: string;
  value: number;
  onChange: (key: NumericSettingKey, value: number) => void;
}

export function CompactRange(props: Props): any {
  const progress = ((props.value + 12) / 24) * 100;
  return (
    <div className="compact-control">
      <div className="control-label">
        <label htmlFor={props.settingKey}>{props.label}</label>
        <output>{formatSettingValue(props.settingKey, props.value)}</output>
      </div>
      <input
        id={props.settingKey}
        data-setting={props.settingKey}
        type="range"
        min="-12"
        max="12"
        step="1"
        value={props.value}
        style={{ "--progress": `${progress}%` }}
        onChange={(event: any) => props.onChange(props.settingKey, Number(event.currentTarget.value))}
      />
    </div>
  );
}
