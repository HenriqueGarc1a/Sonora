import { messageFrom } from "../../shared/errors";
import type { AudioSettings, CustomPreset } from "../../shared/types";
import { sendToBackground } from "../services/backgroundClient";

interface Options {
  settingsRef: { current: AudioSettings };
  setError: (message: string) => void;
  showToast: (message: string) => void;
}

export function useCustomPresets({ settingsRef, setError, showToast }: Options) {
  const [customPresets, setCustomPresets] = React.useState([] as CustomPreset[]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [presetName, setPresetName] = React.useState("");
  const [presetNameError, setPresetNameError] = React.useState("");
  const [savingPreset, setSavingPreset] = React.useState(false);
  const pendingValuesRef = React.useRef(null as AudioSettings | null);

  const openPresetDialog = React.useCallback(() => {
    pendingValuesRef.current = { ...settingsRef.current };
    setPresetName("");
    setPresetNameError("");
    setDialogOpen(true);
  }, [settingsRef]);

  const closePresetDialog = React.useCallback(() => {
    pendingValuesRef.current = null;
    setDialogOpen(false);
    setPresetName("");
    setPresetNameError("");
  }, []);

  const saveCustomPreset = React.useCallback(async (event: any) => {
    event.preventDefault();
    const name = presetName.trim().replace(/\s+/g, " ");
    if (!name) {
      setPresetNameError("Digite um nome para o preset.");
      return;
    }
    if (customPresets.some((preset: CustomPreset) => preset.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
      setPresetNameError("Já existe um preset com esse nome.");
      return;
    }

    setSavingPreset(true);
    setPresetNameError("");
    try {
      const response = await sendToBackground({
        type: "SAVE_CUSTOM_PRESET",
        name,
        settings: pendingValuesRef.current || settingsRef.current,
      });
      setCustomPresets(response.customPresets || []);
      setSavingPreset(false);
      closePresetDialog();
      showToast(`Preset “${name}” criado.`);
    } catch (error) {
      setSavingPreset(false);
      setPresetNameError(messageFrom(error));
    }
  }, [closePresetDialog, customPresets, presetName, settingsRef, showToast]);

  const deleteCustomPreset = React.useCallback(async (presetId: string) => {
    const preset = customPresets.find((item: CustomPreset) => item.id === presetId);
    if (!preset) return;
    try {
      const response = await sendToBackground({ type: "DELETE_CUSTOM_PRESET", presetId });
      setCustomPresets(response.customPresets || []);
      setError("");
      showToast(`Preset “${preset.name}” removido.`);
    } catch (error) {
      setError(messageFrom(error));
    }
  }, [customPresets, setError, showToast]);

  return {
    customPresets,
    setCustomPresets,
    dialogOpen,
    presetName,
    presetNameError,
    savingPreset,
    setPresetName,
    setPresetNameError,
    openPresetDialog,
    closePresetDialog,
    saveCustomPreset,
    deleteCustomPreset,
  };
}
