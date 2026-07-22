export function LayoutSettingsCard({ onReset }: { onReset: () => void }): any {
  return (
    <section className="settings-card">
      <div className="settings-card-heading">
        <div><h2>Layout</h2><p>A ordem e os painéis fixos são salvos automaticamente.</p></div>
      </div>
      <button className="secondary-button" type="button" onClick={onReset}>Restaurar layout padrão</button>
    </section>
  );
}
