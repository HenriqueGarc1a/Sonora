import { messageFrom } from "../../shared/errors";
import type { AudioSettings, CustomPreset } from "../../shared/types";
import { sendToBackground } from "../services/backgroundClient";

type Notify = () => void;

export class PresetController {
  customPresets: CustomPreset[] = [];
  dialogOpen = false;
  presetName = "";
  presetNameError = "";
  savingPreset = false;
  private pendingValues: AudioSettings | null = null;

  constructor(
    private readonly notify: Notify,
    private readonly getSettings: () => AudioSettings,
    private readonly setError: (message: string) => void,
    private readonly showToast: (message: string) => void,
  ) {}

  setCustomPresets = (presets: CustomPreset[]): void => {
    this.customPresets = presets;
    this.notify();
  };

  setPresetName = (value: string): void => {
    this.presetName = value;
    this.notify();
  };

  setPresetNameError = (value: string): void => {
    this.presetNameError = value;
    this.notify();
  };

  openPresetDialog = (): void => {
    this.pendingValues = { ...this.getSettings() };
    this.presetName = "";
    this.presetNameError = "";
    this.dialogOpen = true;
    this.notify();
  };

  closePresetDialog = (): void => {
    this.pendingValues = null;
    this.dialogOpen = false;
    this.presetName = "";
    this.presetNameError = "";
    this.notify();
  };

  saveCustomPreset = async (event: any): Promise<void> => {
    event.preventDefault();
    const name = this.presetName.trim().replace(/\s+/g, " ");
    if (!name) {
      this.setPresetNameError("Digite um nome para o preset.");
      return;
    }
    if (this.customPresets.some((preset) => preset.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
      this.setPresetNameError("Já existe um preset com esse nome.");
      return;
    }

    this.savingPreset = true;
    this.presetNameError = "";
    this.notify();
    try {
      const response = await sendToBackground({
        type: "SAVE_CUSTOM_PRESET",
        name,
        settings: this.pendingValues || this.getSettings(),
      });
      this.customPresets = response.customPresets || [];
      this.savingPreset = false;
      this.closePresetDialog();
      this.showToast(`Preset “${name}” criado.`);
    } catch (error) {
      this.savingPreset = false;
      this.presetNameError = messageFrom(error);
      this.notify();
    }
  };

  deleteCustomPreset = async (presetId: string): Promise<void> => {
    const preset = this.customPresets.find((item) => item.id === presetId);
    if (!preset) return;
    try {
      const response = await sendToBackground({ type: "DELETE_CUSTOM_PRESET", presetId });
      this.customPresets = response.customPresets || [];
      this.notify();
      this.setError("");
      this.showToast(`Preset “${preset.name}” removido.`);
    } catch (error) {
      this.setError(messageFrom(error));
    }
  };
}
