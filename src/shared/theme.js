(() => {
  if (globalThis.SonoraTheme) {
    return;
  }

  const FIELDS = Object.freeze([
    { key: "background", label: "Fundo", description: "Base da janela e das áreas externas." },
    { key: "surface", label: "Superfície", description: "Cartões, painéis, campos e diálogos." },
    { key: "text", label: "Texto principal", description: "Títulos, rótulos e conteúdo principal." },
    { key: "accent", label: "Destaque", description: "Controles ativos, foco e identidade visual." },
    { key: "danger", label: "Erro", description: "Alertas, exclusões e estados críticos." },
  ]);

  const DEFAULT_THEME = Object.freeze({
    background: "#0c0c0e",
    surface: "#151518",
    text: "#f6f4f2",
    accent: "#c8ff3d",
    danger: "#ff7b7b",
  });

  function normalizeColor(value, fallback) {
    const color = String(value || "").trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
  }

  function normalize(theme = {}) {
    return Object.fromEntries(
      FIELDS.map(({ key }) => [key, normalizeColor(theme?.[key], DEFAULT_THEME[key])]),
    );
  }

  function rgb(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    };
  }

  function luminance(hex) {
    const channels = Object.values(rgb(hex)).map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function contrast(first, second) {
    const lighter = Math.max(luminance(first), luminance(second));
    const darker = Math.min(luminance(first), luminance(second));
    return (lighter + 0.05) / (darker + 0.05);
  }

  function foregroundFor(color, theme) {
    const normalized = normalize(theme);
    return contrast(color, normalized.text) >= contrast(color, normalized.background)
      ? normalized.text
      : normalized.background;
  }

  function cssVariables(theme = {}) {
    const normalized = normalize(theme);
    return {
      "--theme-background": normalized.background,
      "--theme-surface": normalized.surface,
      "--theme-text": normalized.text,
      "--theme-accent": normalized.accent,
      "--theme-danger": normalized.danger,
      "--theme-on-accent": foregroundFor(normalized.accent, normalized),
    };
  }

  function apply(element, theme = {}) {
    const normalized = normalize(theme);
    for (const [name, value] of Object.entries(cssVariables(normalized))) {
      element.style.setProperty(name, value);
    }
    element.style.colorScheme = luminance(normalized.background) > 0.45 ? "light" : "dark";
    return normalized;
  }

  globalThis.SonoraTheme = Object.freeze({
    DEFAULT_THEME,
    FIELDS,
    apply,
    cssVariables,
    normalize,
  });
})();
