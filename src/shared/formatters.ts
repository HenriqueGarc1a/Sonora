import type { NumericSettingKey } from "./types";

export function formatDecimal(value: number): string {
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatSettingValue(key: NumericSettingKey, value: number): string {
  if (key === "volume" || key === "reverb") return `${Math.round(value)}%`;
  if (key === "speed") return `${formatDecimal(value)}×`;
  if (key === "bass" || key === "mid" || key === "treble") {
    return `${value > 0 ? "+" : ""}${Math.round(value)} dB`;
  }
  if (key === "stereoWidth") {
    const rounded = Math.round(value);
    if (rounded === 0) return "Mono";
    if (rounded === 100) return "Normal";
    return `${rounded}%`;
  }
  const rounded = Math.round(value);
  if (rounded < 0) return `E ${Math.abs(rounded)}%`;
  if (rounded > 0) return `D ${rounded}%`;
  return "Centro";
}

export function formatPresetDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Configuração personalizada";
  const formatted = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
  return `Criado em ${formatted}`;
}
