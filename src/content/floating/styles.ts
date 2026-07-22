export function floatingPanelStyles(): string {
  return `
    :host {
      --bg: var(--theme-background); --surface: var(--theme-surface); --text: var(--theme-text);
      --muted: color-mix(in srgb, var(--text) 58%, var(--bg)); --accent: var(--theme-accent);
      --danger: var(--theme-danger); --on-accent: var(--theme-on-accent);
      --surface-raised: color-mix(in srgb, var(--surface) 88%, var(--text));
      --line: color-mix(in srgb, var(--text) 9%, transparent); --track: color-mix(in srgb, var(--text) 13%, transparent);
      --control-bg: color-mix(in srgb, var(--text) 2.5%, transparent); --accent-soft: color-mix(in srgb, var(--accent) 14%, transparent);
      --danger-soft: color-mix(in srgb, var(--danger) 8%, transparent); --danger-line: color-mix(in srgb, var(--danger) 30%, transparent);
    }
    * { box-sizing: border-box; } button, input { font: inherit; }
    .panel { overflow: hidden; border: 1px solid color-mix(in srgb, var(--text) 14%, transparent); border-radius: 16px; background: var(--surface); color: var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .titlebar { display: flex; align-items: center; justify-content: space-between; min-height: 43px; padding: 8px 9px 8px 12px; border-bottom: 1px solid var(--line); background: var(--control-bg); cursor: grab; user-select: none; touch-action: none; }
    .titlebar:active { cursor: grabbing; } .brand { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .brand i { width: 4px; height: 15px; border-radius: 9px; background: var(--accent); box-shadow: -6px 3px 0 -1px var(--accent), 6px 1px 0 -1px var(--accent); }
    .brand strong { margin-left: 5px; font-size: 9px; letter-spacing: .12em; }
    .close { display: grid; width: 26px; height: 26px; place-items: center; border: 1px solid var(--line); border-radius: 8px; background: var(--control-bg); color: var(--muted); cursor: pointer; font-size: 16px; line-height: 1; }
    .close:hover { border-color: var(--danger-line); background: var(--danger-soft); color: var(--danger); }
    .close:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .fields { display: grid; gap: 14px; padding: 14px; } .range-field { display: grid; gap: 8px; }
    .range-field > span { display: flex; align-items: center; justify-content: space-between; }
    .range-field strong, .check-field > span { font-size: 11px; font-weight: 650; }
    output { color: var(--accent); font-size: 10px; font-variant-numeric: tabular-nums; font-weight: 750; }
    input[type="range"] { --progress: 50%; width: 100%; height: 4px; margin: 4px 0; border-radius: 99px; outline: none; appearance: none; background: linear-gradient(to right,var(--accent) 0,var(--accent) var(--progress),var(--track) var(--progress),var(--track) 100%); }
    input[type="range"]::-webkit-slider-thumb { width: 15px; height: 15px; border: 3px solid var(--accent); border-radius: 50%; appearance: none; background: var(--bg); cursor: grab; }
    .check-field { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; cursor: pointer; }
    .check-field input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .check-field i { position: relative; width: 34px; height: 19px; border-radius: 99px; background: var(--surface-raised); }
    .check-field i::after { position: absolute; top: 3px; left: 3px; width: 13px; height: 13px; border-radius: 50%; background: var(--muted); content: ""; transition: transform .15s ease; }
    .check-field input:checked + i { background: var(--accent); } .check-field input:checked + i::after { background: var(--on-accent); transform: translateX(15px); }
    @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
  `;
}
