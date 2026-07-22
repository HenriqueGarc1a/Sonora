import type { PanelField } from "./definitions";

export function createFieldMarkup(field: PanelField): string {
  if (field.type === "checkbox") {
    return `<label class="check-field"><span>${field.label}</span><input data-setting="${field.key}" type="checkbox" /><i aria-hidden="true"></i></label>`;
  }
  return `<label class="range-field"><span><strong>${field.label}</strong><output data-output="${field.key}"></output></span><input data-setting="${field.key}" type="range" min="${field.min}" max="${field.max}" step="${field.step}" /></label>`;
}
