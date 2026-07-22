export function PresetDialog({ controller }: { controller: any }): any {
  const dialogRef = React.useRef(null as HTMLDialogElement | null);
  const inputRef = React.useRef(null as HTMLInputElement | null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (controller.presets.dialogOpen && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else if (!controller.presets.dialogOpen && dialog.open) {
      dialog.close();
    }
  }, [controller.presets.dialogOpen]);

  return (
    <dialog
      className="preset-dialog"
      ref={dialogRef}
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
          ref={inputRef}
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
