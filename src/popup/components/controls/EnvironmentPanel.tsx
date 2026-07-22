import type { AudioSettings, BooleanSettingKey, NumericSettingKey } from "../../../shared/types";
import { RangeControl } from "./RangeControl";
import { ToggleControl } from "./ToggleControl";

interface Props {
  settings: AudioSettings;
  onNumericChange: (key: NumericSettingKey, value: number) => void;
  onBooleanChange: (key: BooleanSettingKey, value: boolean) => void;
}

export function EnvironmentPanel(props: Props): any {
  return (
    <>
      <RangeControl
        settingKey="reverb"
        label="Reverb"
        value={props.settings.reverb}
        min={0}
        max={100}
        step={1}
        edgeLeft="Seco"
        edgeRight="Espacial"
        onChange={props.onNumericChange}
      />
      <ToggleControl
        settingKey="nightMode"
        title="Modo noturno"
        description="Equilibra sons baixos e segura picos muito altos"
        checked={props.settings.nightMode}
        feature={true}
        onChange={props.onBooleanChange}
      />
    </>
  );
}
