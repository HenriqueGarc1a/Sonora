export class PresetDialog extends React.Component {
  private dialog: HTMLDialogElement | null = null;
  private input: HTMLInputElement | null = null;

  componentDidMount(): void {
    this.syncDialog();
  }

  componentDidUpdate(): void {
    this.syncDialog();
  }

  private syncDialog(): void {
    const controller = (this.props as any).controller;
    if (!this.dialog) return;
    if (controller.presets.dialogOpen && !this.dialog.open) {
      this.dialog.showModal();
      window.setTimeout(() => this.input?.focus(), 0);
    } else if (!controller.presets.dialogOpen && this.dialog.open) {
      this.dialog.close();
    }
  }

  render(): any {
    const controller = (this.props as any).controller;
    return (
      <dialog
        className="preset-dialog"
        ref={(element: HTMLDialogElement | null) => { this.dialog = element; }}
        onClick={(event: any) => {
          if (event.target === event.currentTarget) controller.presets.closePresetDialog();
        }}
      >
        <form onSubmit={controller.presets.saveCustomPreset}>
          <div className="dialog-mark" aria-hidden="true">+</div>
          <span className="eyebrow">NOVO ATALHO</span>
          <h2>Nome do preset</h2>
          <p>Vamos salvar uma cópia exata dos ajustes atuais.</p>
          <label htmlFor="presetName">Nome</label>
          <input
            ref={(element: HTMLInputElement | null) => { this.input = element; }}
            id="presetName"
            name="presetName"
            type="text"
            maxLength={24}
            autoComplete="off"
            placeholder="Ex.: Podcast"
            required={true}
            value={controller.presets.presetName}
            onChange={(event: any) => {
              controller.presets.setPresetName(event.currentTarget.value);
              controller.presets.setPresetNameError("");
            }}
          />
          {controller.presets.presetNameError && <p className="field-error" role="alert">{controller.presets.presetNameError}</p>}
          <div className="dialog-actions">
            <button className="secondary-button" type="button" onClick={controller.presets.closePresetDialog}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={controller.presets.savingPreset}>
              {controller.presets.savingPreset ? "Salvando…" : "Salvar preset"}
            </button>
          </div>
        </form>
      </dialog>
    );
  }
}
