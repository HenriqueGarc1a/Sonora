import type { AudioSettings, BooleanSettingKey, NumericSettingKey, PanelId } from "../../../shared/types";
import { EnvironmentPanel } from "./EnvironmentPanel";
import { EqualizerPanel } from "./EqualizerPanel";
import { PanelFrame } from "./PanelFrame";
import { PlaybackPanel } from "./PlaybackPanel";
import { StereoPanel } from "./StereoPanel";

interface Props {
  key?: any;
  panelId: PanelId;
  settings: AudioSettings;
  dragging: boolean;
  onNumericChange: (key: NumericSettingKey, value: number) => void;
  onBooleanChange: (key: BooleanSettingKey, value: boolean) => void;
  onFloat: () => void;
  onDragStart: (event: any) => void;
  onDragEnd: () => void;
  onDragOver: (event: any) => void;
  onDrop: (event: any) => void;
}

export function ControlPanel(props: Props): any {
  const note = props.panelId === "equalizer" ? "±12 dB" : undefined;
  let content: any;

  if (props.panelId === "playback") {
    content = <PlaybackPanel settings={props.settings} onNumericChange={props.onNumericChange} onBooleanChange={props.onBooleanChange} />;
  } else if (props.panelId === "equalizer") {
    content = <EqualizerPanel settings={props.settings} onChange={props.onNumericChange} />;
  } else if (props.panelId === "environment") {
    content = <EnvironmentPanel settings={props.settings} onNumericChange={props.onNumericChange} onBooleanChange={props.onBooleanChange} />;
  } else {
    content = <StereoPanel settings={props.settings} onChange={props.onNumericChange} />;
  }

  return <PanelFrame {...props} note={note}>{content}</PanelFrame>;
}
