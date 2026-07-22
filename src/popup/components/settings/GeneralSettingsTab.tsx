import { LayoutSettingsCard } from "./LayoutSettingsCard";
import { LicensesCard } from "./LicensesCard";
import { PresetsSettingsCard } from "./PresetsSettingsCard";

export function GeneralSettingsTab({ controller }: { controller: any }): any {
  return (
    <div className="settings-panel">
      <PresetsSettingsCard presets={controller.presets.customPresets} onDelete={controller.presets.deleteCustomPreset} />
      <LayoutSettingsCard onReset={controller.layout.resetLayout} />
      <LicensesCard />
    </div>
  );
}
