import { formatSettingValue } from "../../../shared/formatters";
import type { NumericSettingKey } from "../../../shared/types";

interface Props {
  settingKey: NumericSettingKey;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (key: NumericSettingKey, value: number) => void;
  edgeLeft?: string;
  edgeRight?: string;
  className?: string;
  last?: boolean;
  children?: any;
}

export function RangeControl(props: Props): any {
  const progress = ((props.value - props.min) / (props.max - props.min)) * 100;
  return (
    <div className={`control-row${props.last ? " last-control" : ""}`}>
      <div className="control-label">
        <label htmlFor={props.settingKey}>{props.label}</label>
        <output id={`${props.settingKey}Value`} htmlFor={props.settingKey}>
          {formatSettingValue(props.settingKey, props.value)}
        </output>
      </div>
      <input
        className={props.className || ""}
        id={props.settingKey}
        data-setting={props.settingKey}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        style={{ "--progress": `${progress}%` }}
        onChange={(event: any) => props.onChange(props.settingKey, Number(event.currentTarget.value))}
      />
      {props.edgeLeft !== undefined && (
        <div className="range-edge-labels"><span>{props.edgeLeft}</span><span>{props.edgeRight}</span></div>
      )}
      {props.children}
    </div>
  );
}
