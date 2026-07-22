import type { PanelId, Position } from "../../shared/types";

export interface MovablePanelRecord {
  panelId: PanelId;
  host: HTMLElement;
  x: number;
  y: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

export function setPanelPosition(record: MovablePanelRecord, position: Partial<Position> = {}): void {
  const bounds = record.host.getBoundingClientRect();
  const width = bounds.width || 292;
  const height = bounds.height || 80;
  record.x = Math.round(clamp(Number(position.x), 8, Math.max(8, window.innerWidth - width - 8)));
  record.y = Math.round(clamp(Number(position.y), 8, Math.max(8, window.innerHeight - height - 8)));
  record.host.style.left = `${record.x}px`;
  record.host.style.top = `${record.y}px`;
}

export function bindPanelMovement(record: MovablePanelRecord, titlebar: HTMLElement): void {
  titlebar.addEventListener("pointerdown", (event: PointerEvent) => {
    if (event.button !== 0 || (event.target as Element).closest("button")) return;
    event.preventDefault();
    titlebar.setPointerCapture(event.pointerId);
    record.host.style.transition = "none";
    record.host.style.cursor = "grabbing";
    const start = { pointerX: event.clientX, pointerY: event.clientY, x: record.x, y: record.y };

    const move = (moveEvent: PointerEvent) => setPanelPosition(record, {
      x: start.x + moveEvent.clientX - start.pointerX,
      y: start.y + moveEvent.clientY - start.pointerY,
    });

    const finish = () => {
      titlebar.removeEventListener("pointermove", move as any);
      titlebar.removeEventListener("pointerup", finish);
      titlebar.removeEventListener("pointercancel", finish);
      record.host.style.cursor = "";
      chrome.runtime.sendMessage({
        target: "background",
        type: "SAVE_FLOATING_POSITION",
        panelId: record.panelId,
        position: { x: record.x, y: record.y },
      }).catch(() => undefined);
    };

    titlebar.addEventListener("pointermove", move as any);
    titlebar.addEventListener("pointerup", finish);
    titlebar.addEventListener("pointercancel", finish);
  });
}
