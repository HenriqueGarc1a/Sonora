import type { SettingsTab } from "../../../shared/types";

interface Props {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

export function SettingsTabs(props: Props): any {
  return (
    <nav className="settings-tabs" aria-label="Seções das configurações">
      <button className={props.activeTab === "general" ? "active" : ""} type="button" aria-selected={props.activeTab === "general"} onClick={() => props.onChange("general")}>Geral</button>
      <button className={props.activeTab === "styles" ? "active" : ""} type="button" aria-selected={props.activeTab === "styles"} onClick={() => props.onChange("styles")}>Estilos</button>
    </nav>
  );
}
