import { BrandMark } from "./BrandMark";
import { SettingsIcon } from "./Icons";
import type { AppView } from "../../../shared/types";

interface Props {
  view: AppView;
  statusText: string;
  active: boolean;
  onOpenControls: () => void;
  onToggleSettings: () => void;
}

export function AppHeader(props: Props): any {
  return (
    <header className="topbar">
      <button className="brand" type="button" aria-label="Abrir controles da Sonora" onClick={props.onOpenControls}>
        <BrandMark />
        <span>SONORA</span>
      </button>
      <div className="topbar-actions">
        <div className={`status-chip${props.active ? " active" : ""}`} role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          <span>{props.statusText}</span>
        </div>
        <button
          className={`icon-button settings-button${props.view === "settings" ? " active" : ""}`}
          type="button"
          aria-label={props.view === "settings" ? "Voltar aos controles" : "Abrir configurações"}
          aria-pressed={props.view === "settings"}
          title="Configurações"
          onClick={props.onToggleSettings}
        >
          <SettingsIcon />
        </button>
      </div>
    </header>
  );
}
