import { DEFAULT_THEME } from "./constants";
import type { Theme, ThemeField } from "./types";

export const THEME_FIELDS: readonly ThemeField[] = Object.freeze([
  { key: "background", label: "Fundo", description: "Base da janela e das áreas externas." },
  { key: "surface", label: "Superfície", description: "Cartões, painéis, campos e diálogos." },
  { key: "text", label: "Texto principal", description: "Títulos, rótulos e conteúdo principal." },
  { key: "accent", label: "Destaque", description: "Controles ativos, foco e identidade visual." },
  { key: "danger", label: "Erro", description: "Alertas, exclusões e estados críticos." },
]);

function normalizeColor(value: unknown, fallback: string): string {
  const color = String(value ?? "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}

export function normalizeTheme(theme: Partial<Theme> = {}): Theme {
  return Object.fromEntries(
    THEME_FIELDS.map(({ key }) => [key, normalizeColor(theme[key], DEFAULT_THEME[key])]),
  ) as Theme;
}

function rgb(hex: string): { r: number; g: number; b: number } {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function luminance(hex: string): number {
  const channels = Object.values(rgb(hex)).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first: string, second: string): number {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function foregroundFor(color: string, theme: Theme): string {
  return contrast(color, theme.text) >= contrast(color, theme.background)
    ? theme.text
    : theme.background;
}

export function applyTheme(element: HTMLElement, theme: Partial<Theme> = {}): Theme {
  const normalized = normalizeTheme(theme);
  const variables: Record<string, string> = {
    "--theme-background": normalized.background,
    "--theme-surface": normalized.surface,
    "--theme-text": normalized.text,
    "--theme-accent": normalized.accent,
    "--theme-danger": normalized.danger,
    "--theme-on-accent": foregroundFor(normalized.accent, normalized),
  };
  Object.entries(variables).forEach(([name, value]) => element.style.setProperty(name, value));
  element.style.colorScheme = luminance(normalized.background) > 0.45 ? "light" : "dark";
  return normalized;
}
