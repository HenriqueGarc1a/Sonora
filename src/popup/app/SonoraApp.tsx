import { AppHeader } from "../components/common/AppHeader";
import { ControlsView } from "../components/controls/ControlsView";
import { PresetDialog } from "../components/dialogs/PresetDialog";
import { SettingsView } from "../components/settings/SettingsView";
import { SonoraController } from "../controllers/SonoraController";

export class SonoraApp extends React.Component {
  private readonly controller: SonoraController;

  constructor(props: any) {
    super(props);
    this.controller = new SonoraController(() => this.forceUpdate());
  }

  componentDidMount(): void {
    void this.controller.initialize();
  }

  componentWillUnmount(): void {
    this.controller.dispose();
  }

  render(): any {
    const controller = this.controller;
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
}
