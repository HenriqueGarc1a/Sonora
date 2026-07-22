import { AppFooter } from "../common/AppFooter";
import { GeneralSettingsTab } from "./GeneralSettingsTab";
import { SettingsTabs } from "./SettingsTabs";
import { StylesSettingsTab } from "./StylesSettingsTab";

export function SettingsView({ controller }: { controller: any }): any {
  return (
    <div className="settings-view">
      <div className="settings-title"><h1>Configurações</h1><p>Personalize o comportamento e a aparência da Sonora.</p></div>
      <SettingsTabs activeTab={controller.settingsTab} onChange={controller.setSettingsTab} />
      {controller.settingsTab === "general"
        ? <GeneralSettingsTab controller={controller} />
        : <StylesSettingsTab controller={controller} />}
      <AppFooter />
    </div>
  );
}
