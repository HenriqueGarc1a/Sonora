import { PaletteCard } from "./PaletteCard";

export function StylesSettingsTab({ controller }: { controller: any }): any {
  return (
    <div className="settings-panel">
      <PaletteCard theme={controller.theme.theme} onChange={controller.theme.updateTheme} onReset={controller.theme.resetTheme} />
      <section className="settings-card style-info-card">
        <div className="settings-card-heading"><div><h2>Como funciona</h2></div></div>
        <p>As cinco escolhas também são aplicadas aos painéis flutuantes. A Sonora calcula automaticamente as variações transparentes e escolhe texto legível sobre a cor de destaque.</p>
      </section>
    </div>
  );
}
