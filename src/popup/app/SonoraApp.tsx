import { AppHeader } from "../components/common/AppHeader";
import { ControlsView } from "../components/controls/ControlsView";
import { PresetDialog } from "../components/dialogs/PresetDialog";
import { SettingsView } from "../components/settings/SettingsView";
import { useSonoraController } from "../hooks/useSonoraController";

export function SonoraApp(): any {
  const controller = useSonoraController();

  return (
    <main className="app">
      <AppHeader
        view={controller.view}
        statusText={controller.statusText}
        active={controller.currentTabIsCaptured}
        onOpenControls={() => controller.setView("controls")}
        onToggleSettings={controller.toggleSettings}
      />
      {controller.error && <p className="error-message" role="alert">{controller.error}</p>}
      {controller.view === "controls"
        ? <ControlsView controller={controller} />
        : <SettingsView controller={controller} />}
      <PresetDialog controller={controller} />
      {controller.toast && <div className="toast" role="status" aria-live="polite">{controller.toast}</div>}
    </main>
  );
}
