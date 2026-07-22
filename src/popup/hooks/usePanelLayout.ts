import { PANEL_TITLES } from "../../shared/constants";
import { messageFrom } from "../../shared/errors";
import { normalizeUiPreferences } from "../../shared/normalizers";
import type { PanelId, UiPreferences } from "../../shared/types";
import { sendToBackground } from "../services/backgroundClient";

interface Options {
  activeTabId: number | null;
  setError: (message: string) => void;
  showToast: (message: string) => void;
}

export function usePanelLayout({ activeTabId, setError, showToast }: Options) {
  const [uiPreferences, setUiPreferences] = React.useState(normalizeUiPreferences());
  const [draggingPanelId, setDraggingPanelId] = React.useState(null as PanelId | null);
  const dragOriginalOrder = React.useRef(null as PanelId[] | null);
  const dropCompleted = React.useRef(false);

  const isPanelFloating = React.useCallback((panelId: PanelId) => (
    uiPreferences.floatingPanels.some((item: any) => item.id === panelId)
  ), [uiPreferences]);

  const toggleFloatingPanel = React.useCallback(async (panelId: PanelId) => {
    const floating = !isPanelFloating(panelId);
    const previous = normalizeUiPreferences(uiPreferences);
    const current = previous.floatingPanels.filter((item) => item.id !== panelId);
    if (floating) current.push(previous.floatingPanels.find((item) => item.id === panelId) || { id: panelId });
    setUiPreferences({ ...previous, floatingPanels: current });
    try {
      const response = await sendToBackground({
        type: "SET_PANEL_FLOATING",
        tabId: activeTabId,
        panelId,
        floating,
      });
      setUiPreferences(normalizeUiPreferences(response.uiPreferences));
      setError("");
      showToast(`${PANEL_TITLES[panelId]} ${floating ? "fixado na página" : "removido da página"}.`);
    } catch (error) {
      setUiPreferences(previous);
      setError(messageFrom(error));
    }
  }, [activeTabId, isPanelFloating, setError, showToast, uiPreferences]);

  const resetLayout = React.useCallback(async () => {
    try {
      const response = await sendToBackground({ type: "RESET_UI_LAYOUT", tabId: activeTabId });
      setUiPreferences(normalizeUiPreferences(response.uiPreferences));
      setError("");
      showToast("Layout padrão restaurado.");
    } catch (error) {
      setError(messageFrom(error));
    }
  }, [activeTabId, setError, showToast]);

  const startPanelDrag = React.useCallback((panelId: PanelId, event: any) => {
    dragOriginalOrder.current = [...uiPreferences.panelOrder];
    dropCompleted.current = false;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/sonora-panel", panelId);
    setDraggingPanelId(panelId);
  }, [uiPreferences.panelOrder]);

  const reorderPanelDuringDrag = React.useCallback((targetId: PanelId, event: any) => {
    if (!draggingPanelId || draggingPanelId === targetId) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const insertAfter = event.clientY > bounds.top + bounds.height / 2;
    setUiPreferences((current: UiPreferences) => {
      const order = current.panelOrder.filter((id) => id !== draggingPanelId);
      let targetIndex = order.indexOf(targetId);
      if (insertAfter) targetIndex += 1;
      order.splice(targetIndex, 0, draggingPanelId);
      return { ...current, panelOrder: order };
    });
  }, [draggingPanelId]);

  const dropPanel = React.useCallback(async (event: any) => {
    if (!draggingPanelId) return;
    event.preventDefault();
    dropCompleted.current = true;
    try {
      const response = await sendToBackground({
        type: "UPDATE_PANEL_ORDER",
        panelOrder: uiPreferences.panelOrder,
      });
      setUiPreferences(normalizeUiPreferences(response.uiPreferences));
      setError("");
    } catch (error) {
      if (dragOriginalOrder.current) {
        setUiPreferences((current: UiPreferences) => ({ ...current, panelOrder: dragOriginalOrder.current! }));
      }
      setError(messageFrom(error));
    }
  }, [draggingPanelId, setError, uiPreferences.panelOrder]);

  const finishPanelDrag = React.useCallback(() => {
    if (!dropCompleted.current && dragOriginalOrder.current) {
      setUiPreferences((current: UiPreferences) => ({ ...current, panelOrder: dragOriginalOrder.current! }));
    }
    setDraggingPanelId(null);
    dragOriginalOrder.current = null;
  }, []);

  return {
    uiPreferences,
    setUiPreferences,
    draggingPanelId,
    isPanelFloating,
    toggleFloatingPanel,
    resetLayout,
    startPanelDrag,
    reorderPanelDuringDrag,
    dropPanel,
    finishPanelDrag,
  };
}
