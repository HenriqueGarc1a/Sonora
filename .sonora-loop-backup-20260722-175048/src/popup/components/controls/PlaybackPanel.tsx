import { formatDecimal } from "../../../shared/formatters";
import type { AudioSettings, BooleanSettingKey, NumericSettingKey } from "../../../shared/types";
import { RangeControl } from "./RangeControl";
import { ToggleControl } from "./ToggleControl";

interface Props {
  settings: AudioSettings;
  onNumericChange: (key: NumericSettingKey, value: number) => void;
  onBooleanChange: (key: BooleanSettingKey, value: boolean) => void;
}

export function PlaybackPanel(props: Props): any {
  return (
    <>
      <RangeControl
        settingKey="volume"
        label="Volume"
        value={props.settings.volume}
        min={0}
        max={300}
        step={1}
        edgeLeft="0%"
        edgeRight="300%"
        onChange={props.onNumericChange}
      />
      <RangeControl
        settingKey="speed"
        label="Velocidade"
        value={props.settings.speed}
        min={0.5}
        max={2}
        step={0.05}
        edgeLeft="0.5×"
        edgeRight="2×"
        onChange={props.onNumericChange}
      >
        <div className="speed-shortcuts" role="group" aria-label="Atalhos de velocidade">
          {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
            <button
              key={speed}
              type="button"
              className={Math.abs(props.settings.speed - speed) < 0.001 ? "active" : ""}
              aria-pressed={Math.abs(props.settings.speed - speed) < 0.001}
              onClick={() => props.onNumericChange("speed", speed)}
            >
              {formatDecimal(speed)}×
            </button>
          ))}
        </div>
      </RangeControl>
      <ToggleControl
        settingKey="preservePitch"
        title="Manter pitch original"
        checked={props.settings.preservePitch}
        onChange={props.onBooleanChange}
      />
    </>
  );
}
