import { normalizeSettings } from "../shared/normalizers";
import type { AudioSettings } from "../shared/types";
import { getCustomPresets, setCustomPresets } from "./storage";

export async function saveCustomPreset(rawName: unknown, incomingSettings: Partial<AudioSettings>) {
  const name = String(rawName || "").trim().replace(/\s+/g, " ").slice(0, 24);
  if (!name) throw new Error("Digite um nome para o preset.");

  const customPresets = await getCustomPresets();
  if (customPresets.some((preset) => preset.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
    throw new Error("Já existe um preset com esse nome.");
  }
  if (customPresets.length >= 30) {
    throw new Error("Você pode salvar até 30 presets personalizados.");
  }

  customPresets.push({
    id: `custom-${crypto.randomUUID()}`,
    name,
    values: normalizeSettings(incomingSettings),
    createdAt: new Date().toISOString(),
  });
  await setCustomPresets(customPresets);
  return { customPresets };
}

export async function deleteCustomPreset(presetId: string) {
  const customPresets = (await getCustomPresets()).filter((preset) => preset.id !== presetId);
  await setCustomPresets(customPresets);
  return { customPresets };
}
