import { PANEL_TITLES } from "../../../shared/constants";
import type { PanelId } from "../../../shared/types";
import { FloatIcon } from "../common/Icons";
import { DragHandle } from "./DragHandle";

interface Props {
  panelId: PanelId;
  note?: string;
  dragging: boolean;
  onFloat: () => void;
  onDragStart: (event: any) => void;
  onDragEnd: () => void;
  onDragOver: (event: any) => void;
  onDrop: (event: any) => void;
  children?: any;
}

export function PanelFrame(props: Props): any {
  const title = PANEL_TITLES[props.panelId];
  return (
    <section
      className={`control-section${props.panelId === "stereo" ? " stereo-section" : ""}${props.dragging ? " dragging" : ""}`}
      data-panel-id={props.panelId}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
    >
      <div className="panel-content">
        <div className="section-heading">
          <div className="section-title">
            <DragHandle title={title} onDragStart={props.onDragStart} onDragEnd={props.onDragEnd} />
            <h2>{title}</h2>
          </div>
          <div className="section-actions">
            {props.note && <span className="section-note">{props.note}</span>}
            <button
              className="float-button"
              type="button"
              aria-label={`Fixar ${title} na página`}
              title="Fixar na página"
              onClick={props.onFloat}
            >
              <FloatIcon />
            </button>
          </div>
        </div>
        {props.children}
      </div>
    </section>
  );
}
