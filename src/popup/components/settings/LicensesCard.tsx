export function LicensesCard(): any {
  return (
    <section className="settings-card licenses-card">
      <div className="settings-card-heading"><div><h2>Licenças</h2></div></div>
      <div className="license-summary">
        <span className="license-mark">MIT</span>
        <span><strong>Sonora</strong><small>Copyright © 2026 Sonora contributors</small></span>
      </div>
      <details>
        <summary>Ver licença MIT</summary>
        <p>Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction.</p>
        <p>THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.</p>
      </details>
      <div className="native-tech">
        <strong>React + TypeScript</strong>
        <p>A interface é dividida em componentes, hooks, serviços e módulos compartilhados. O build gera os arquivos finais da extensão.</p>
      </div>
    </section>
  );
}
