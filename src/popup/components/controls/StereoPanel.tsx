import type { AudioSettings, NumericSettingKey } from "../../../shared/types";
import { RangeControl } from "./RangeControl";

interface Props {
  settings: AudioSettings;
  onChange: (key: NumericSettingKey, value: number) => void;
}

export function StereoPanel(props: Props): any {
  return (
    <>
      <RangeControl
        settingKey="stereoWidth"
        label="Largura"
        value={props.settings.stereoWidth}
        min={0}
        max={200}
        step={1}
        edgeLeft="Mono"
        edgeRight="Amplo"
        className="centered-range stereo-width-range"
        onChange={props.onChange}
      />
      <RangeControl
        settingKey="pan"
        label="Balanço"
        value={props.settings.pan}
        min={-100}
        max={100}
        step={1}
        edgeLeft="Esquerda"
        edgeRight="Direita"
        className="centered-range pan-range"
        last={true}
        onChange={props.onChange}
      />
    </>
  );
}
