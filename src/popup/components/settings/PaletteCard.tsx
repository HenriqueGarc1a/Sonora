import { THEME_FIELDS } from "../../../shared/theme";
import type { Theme, ThemeKey } from "../../../shared/types";

interface Props {
  theme: Theme;
  onChange: (key: ThemeKey, value: string) => void;
  onReset: () => void;
}

export function PaletteCard(props: Props): any {
  return (
    <section className="settings-card styles-card">
      <div className="settings-card-heading">
        <div><h2>Paleta</h2><p>São apenas 5 cores base. Bordas, sombras, trilhas e estados são derivados automaticamente.</p></div>
        <span className="count-badge">5</span>
      </div>
      <div className="palette-preview" aria-label="Prévia da paleta">
        {THEME_FIELDS.map((field) => <span key={field.key} title={field.label} style={{ background: props.theme[field.key] }} />)}
      </div>
      <div className="theme-color-list">
        {THEME_FIELDS.map((field) => (
          <label className="theme-color-row" key={field.key}>
            <input type="color" aria-label={field.label} value={props.theme[field.key]} onChange={(event: any) => props.onChange(field.key, event.currentTarget.value)} />
            <span className="theme-color-copy"><strong>{field.label}</strong><small>{field.description}</small></span>
            <code className="theme-color-value">{props.theme[field.key]}</code>
          </label>
        ))}
      </div>
      <button className="secondary-button" type="button" onClick={props.onReset}>Restaurar cores padrão</button>
    </section>
  );
}
