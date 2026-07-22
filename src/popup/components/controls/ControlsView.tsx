import { BrandMark } from "../common/BrandMark";
import { AppFooter } from "../common/AppFooter";
import { ControlPanel } from "./ControlPanel";
import { PresetsCard } from "./PresetsCard";

export function ControlsView({ controller }: { controller: any }): any {
  const { audio, presets, layout } = controller;
  const visiblePanels = layout.uiPreferences.panelOrder.filter((id: any) => !layout.isPanelFloating(id));

  return (
    <div id="controlsView">
      <PresetsCard
        customPresets={presets.customPresets}
        settingsMatch={audio.settingsMatch}
        onApplyPreset={audio.applyPreset}
        onApplyCustomPreset={audio.applyCustomPreset}
        onCreatePreset={presets.openPresetDialog}
      />
      <div className="panel-list" aria-label="Controles de áudio reordenáveis">
        {layout.uiPreferences.panelOrder.map((panelId: any) => (
          layout.isPanelFloating(panelId) ? null : (
            <ControlPanel
              key={panelId}
              panelId={panelId}
              settings={audio.settings}
              dragging={layout.draggingPanelId === panelId}
              onNumericChange={audio.updateNumericSetting}
              onBooleanChange={audio.updateBooleanSetting}
              onFloat={() => layout.toggleFloatingPanel(panelId)}
              onDragStart={(event: any) => layout.startPanelDrag(panelId, event)}
              onDragEnd={layout.finishPanelDrag}
              onDragOver={(event: any) => layout.reorderPanelDuringDrag(panelId, event)}
              onDrop={layout.dropPanel}
            />
          )
        ))}
      </div>
      {visiblePanels.length === 0 && (
        <div className="floating-empty-state">
          <BrandMark />
          <strong>Todos os controles estão na página</strong>
          <p>Feche um painel flutuante ou restaure o layout nas configurações para trazê-lo de volta.</p>
        </div>
      )}
      <AppFooter />
    </div>
  );
}
