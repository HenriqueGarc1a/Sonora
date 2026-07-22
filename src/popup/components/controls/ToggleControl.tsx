import type { BooleanSettingKey } from "../../../shared/types";

interface Props {
  settingKey: BooleanSettingKey;
  title: string;
  description?: string;
  checked: boolean;
  feature?: boolean;
  onChange: (key: BooleanSettingKey, value: boolean) => void;
}

export function ToggleControl(props: Props): any {
  return (
    <label className={`toggle-row${props.feature ? " feature-toggle" : ""}`} htmlFor={props.settingKey}>
      <span><strong>{props.title}</strong>{props.description && <small>{props.description}</small>}</span>
      <input
        id={props.settingKey}
        data-setting={props.settingKey}
        type="checkbox"
        checked={props.checked}
        onChange={(event: any) => props.onChange(props.settingKey, Boolean(event.currentTarget.checked))}
      />
      <span className="toggle" aria-hidden="true" />
    </label>
  );
}
