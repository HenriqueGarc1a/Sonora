import { PANEL_TITLES } from "../../shared/constants";
import { messageFrom } from "../../shared/errors";
import { normalizeUiPreferences } from "../../shared/normalizers";
import type { PanelId, UiPreferences } from "../../shared/types";
import { sendToBackground } from "../services/backgroundClient";

type Notify = () => void;

export class LayoutController {
  uiPreferences: UiPreferences = normalizeUiPreferences();
  draggingPanelId: PanelId | null = null;
  private dragOriginalOrder: PanelId[] | null = null;
  private dropCompleted = false;

  constructor(
    private readonly notify: Notify,
    private readonly getActiveTabId: () => number | null,
    private readonly setError: (message: string) => void,
    private readonly showToast: (message: string) => void,
  ) {}

  setUiPreferences = (value: UiPreferences): void => {
    this.uiPreferences = normalizeUiPreferences(value);
    this.notify();
  };

  isPanelFloating = (panelId: PanelId): boolean => (
    this.uiPreferences.floatingPanels.some((item) => item.id === panelId)
  );

  toggleFloatingPanel = async (panelId: PanelId): Promise<void> => {
    const floating = !this.isPanelFloating(panelId);
    const previous = normalizeUiPreferences(this.uiPreferences);
    const current = previous.floatingPanels.filter((item) => item.id !== panelId);
    if (floating) current.push(previous.floatingPanels.find((item) => item.id === panelId) || { id: panelId });
    this.uiPreferences = { ...previous, floatingPanels: current };
    this.notify();

    try {
      const response = await sendToBackground({
        type: "SET_PANEL_FLOATING",
        tabId: this.getActiveTabId(),
        panelId,
        floating,
      });
      this.setUiPreferences(normalizeUiPreferences(response.uiPreferences));
      this.setError("");
      this.showToast(`${PANEL_TITLES[panelId]} ${floating ? "fixado na página" : "removido da página"}.`);
    } catch (error) {
      this.uiPreferences = previous;
      this.notify();
      this.setError(messageFrom(error));
    }
  };

  resetLayout = async (): Promise<void> => {
    try {
      const response = await sendToBackground({ type: "RESET_UI_LAYOUT", tabId: this.getActiveTabId() });
      this.setUiPreferences(normalizeUiPreferences(response.uiPreferences));
      this.setError("");
      this.showToast("Layout padrão restaurado.");
    } catch (error) {
      this.setError(messageFrom(error));
    }
  };

  startPanelDrag = (panelId: PanelId, event: any): void => {
    this.dragOriginalOrder = [...this.uiPreferences.panelOrder];
    this.dropCompleted = false;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/sonora-panel", panelId);
    this.draggingPanelId = panelId;
    this.notify();
  };

  reorderPanelDuringDrag = (targetId: PanelId, event: any): void => {
    if (!this.draggingPanelId || this.draggingPanelId === targetId) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const insertAfter = event.clientY > bounds.top + bounds.height / 2;
    const order = this.uiPreferences.panelOrder.filter((id) => id !== this.draggingPanelId);
    let targetIndex = order.indexOf(targetId);
    if (insertAfter) targetIndex += 1;
    order.splice(targetIndex, 0, this.draggingPanelId);
    this.uiPreferences = { ...this.uiPreferences, panelOrder: order };
    this.notify();
  };

  dropPanel = async (event: any): Promise<void> => {
    if (!this.draggingPanelId) return;
    event.preventDefault();
    this.dropCompleted = true;
    try {
      const response = await sendToBackground({
        type: "UPDATE_PANEL_ORDER",
        panelOrder: this.uiPreferences.panelOrder,
      });
      this.setUiPreferences(normalizeUiPreferences(response.uiPreferences));
      this.setError("");
    } catch (error) {
      if (this.dragOriginalOrder) {
        this.uiPreferences = { ...this.uiPreferences, panelOrder: this.dragOriginalOrder };
        this.notify();
      }
      this.setError(messageFrom(error));
    }
  };

  finishPanelDrag = (): void => {
    if (!this.dropCompleted && this.dragOriginalOrder) {
      this.uiPreferences = { ...this.uiPreferences, panelOrder: this.dragOriginalOrder };
    }
    this.draggingPanelId = null;
    this.dragOriginalOrder = null;
    this.notify();
  };
}
