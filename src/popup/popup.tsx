/// <reference path="./globals.d.ts" />
import * as SonoraTheme from "./theme.js";

type NumericSettingKey = "volume" | "speed" | "bass" | "mid" | "treble" | "reverb" | "stereoWidth" | "pan";
type BooleanSettingKey = "preservePitch" | "nightMode";
type SettingKey = NumericSettingKey | BooleanSettingKey;
type PanelId = "playback" | "equalizer" | "environment" | "stereo";
type SettingsTab = "general" | "styles";

interface AudioSettings {
  volume: number;
  speed: number;
  preservePitch: boolean;
  bass: number;
  mid: number;
  treble: number;
  reverb: number;
  stereoWidth: number;
  pan: number;
  nightMode: boolean;
}

interface CustomPreset {
  id: string;
  name: string;
  values: AudioSettings;
  createdAt: string;
}

interface FloatingPanel {
  id: PanelId;
  position?: { x: number; y: number };
}

interface UiPreferences {
  panelOrder: PanelId[];
  floatingPanels: FloatingPanel[];
}

interface PresetDefinition {
  label: string;
  values: Partial<AudioSettings>;
}

interface BackgroundResponse {
  ok: boolean;
  error?: string;
  settings?: AudioSettings;
  customPresets?: CustomPreset[];
  uiPreferences?: UiPreferences;
  theme?: SonoraTheme.Theme;
  active?: boolean;
  capturedTabId?: number | null;
}

interface AppState {
  activeTabId: number | null;
  captureActive: boolean;
  capturedTabId: number | null;
  settings: AudioSettings;
  customPresets: CustomPreset[];
  uiPreferences: UiPreferences;
  theme: SonoraTheme.Theme;
  view: "controls" | "settings";
  settingsTab: SettingsTab;
  error: string;
  toast: string;
  presetDialogOpen: boolean;
  presetName: string;
  presetNameError: string;
  savingPreset: boolean;
  activationState: "pending" | "ready" | "error";
  draggingPanelId: PanelId | null;
}

const DEFAULT_SETTINGS: Readonly<AudioSettings> = Object.freeze({
  volume: 100,
  speed: 1,
  preservePitch: true,
  bass: 0,
  mid: 0,
  treble: 0,
  reverb: 0,
  stereoWidth: 100,
  pan: 0,
  nightMode: false,
});

const DEFAULT_PANEL_ORDER: readonly PanelId[] = Object.freeze([
  "playback",
  "equalizer",
  "environment",
  "stereo",
]);

const AUDIO_PRESETS: Readonly<Record<string, PresetDefinition>> = Object.freeze({
  neutral: { label: "Neutro", values: { ...DEFAULT_SETTINGS, preservePitch: false } },
  dialogue: { label: "Diálogo", values: { bass: -3, mid: 4, treble: 3, reverb: 0, stereoWidth: 80, pan: 0, nightMode: true } },
  bass: { label: "Graves+", values: { bass: 8, mid: -2, treble: 2, reverb: 0, stereoWidth: 115, pan: 0, nightMode: false } },
  cinema: { label: "Cinema", values: { bass: 5, mid: 0, treble: 4, reverb: 18, stereoWidth: 135, pan: 0, nightMode: false } },
  night: { label: "Madrugada", values: { bass: -4, mid: 2, treble: -3, reverb: 0, stereoWidth: 75, pan: 0, nightMode: true } },
});

const PANEL_TITLES: Readonly<Record<PanelId, string>> = Object.freeze({
  playback: "Reprodução",
  equalizer: "Equalizador",
  environment: "Ambiente",
  stereo: "Imagem estéreo",
});

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "Erro inesperado.");
}

function normalizeUiPreferences(value?: Partial<UiPreferences>): UiPreferences {
  const requested = Array.isArray(value?.panelOrder) ? value!.panelOrder : [];
  const unique = requested.filter(
    (id, index): id is PanelId => DEFAULT_PANEL_ORDER.includes(id as PanelId) && requested.indexOf(id) === index,
  );
  const panelOrder = [...unique, ...DEFAULT_PANEL_ORDER.filter((id) => !unique.includes(id))];
  const floatingPanels = Array.isArray(value?.floatingPanels)
    ? value!.floatingPanels.filter((item): item is FloatingPanel => Boolean(item && DEFAULT_PANEL_ORDER.includes(item.id)))
    : [];
  return { panelOrder, floatingPanels };
}

function formatDecimal(value: number): string {
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function describeStereoWidth(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return "Mono";
  if (rounded === 100) return "Normal";
  return `${rounded}%`;
}

function describePan(value: number): string {
  const rounded = Math.round(value);
  if (rounded < 0) return `E ${Math.abs(rounded)}%`;
  if (rounded > 0) return `D ${rounded}%`;
  return "Centro";
}

function settingValue(key: NumericSettingKey, value: number): string {
  if (key === "volume" || key === "reverb") return `${Math.round(value)}%`;
  if (key === "speed") return `${formatDecimal(value)}×`;
  if (key === "bass" || key === "mid" || key === "treble") return `${value > 0 ? "+" : ""}${Math.round(value)} dB`;
  if (key === "stereoWidth") return describeStereoWidth(value);
  return describePan(value);
}

function formatPresetDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Configuração personalizada";
  return `Criado em ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date)}`;
}

function FloatIcon(): any {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-7 7"/><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>;
}

function SettingsIcon(): any {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>;
}

function DragHandle(props: { title: string; onDragStart: (event: any) => void; onDragEnd: () => void }): any {
  return <button className="drag-handle" type="button" draggable={true} aria-label={`Arrastar ${props.title} para reordenar`} title="Arraste para reordenar" onDragStart={props.onDragStart} onDragEnd={props.onDragEnd}>
    <span/><span/><span/><span/><span/><span/>
  </button>;
}

function RangeControl(props: {
  settingKey: NumericSettingKey;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (key: NumericSettingKey, value: number) => void;
  edgeLeft?: string;
  edgeRight?: string;
  className?: string;
  last?: boolean;
  children?: any;
}): any {
  const progress = ((props.value - props.min) / (props.max - props.min)) * 100;
  return <div className={`control-row${props.last ? " last-control" : ""}`}>
    <div className="control-label"><label htmlFor={props.settingKey}>{props.label}</label><output id={`${props.settingKey}Value`} htmlFor={props.settingKey}>{settingValue(props.settingKey, props.value)}</output></div>
    <input
      className={props.className || ""}
      id={props.settingKey}
      data-setting={props.settingKey}
      type="range"
      min={props.min}
      max={props.max}
      step={props.step}
      value={props.value}
      style={{ "--progress": `${progress}%` }}
      onChange={(event: any) => props.onChange(props.settingKey, Number(event.currentTarget.value))}
    />
    {props.edgeLeft !== undefined && <div className="range-edge-labels"><span>{props.edgeLeft}</span><span>{props.edgeRight}</span></div>}
    {props.children}
  </div>;
}

function CompactRange(props: {
  settingKey: "bass" | "mid" | "treble";
  label: string;
  value: number;
  onChange: (key: NumericSettingKey, value: number) => void;
}): any {
  const progress = ((props.value + 12) / 24) * 100;
  return <div className="compact-control">
    <div className="control-label"><label htmlFor={props.settingKey}>{props.label}</label><output>{settingValue(props.settingKey, props.value)}</output></div>
    <input id={props.settingKey} data-setting={props.settingKey} type="range" min="-12" max="12" step="1" value={props.value} style={{ "--progress": `${progress}%` }} onChange={(event: any) => props.onChange(props.settingKey, Number(event.currentTarget.value))}/>
  </div>;
}

function ToggleControl(props: {
  settingKey: BooleanSettingKey;
  title: string;
  description?: string;
  checked: boolean;
  feature?: boolean;
  onChange: (key: BooleanSettingKey, value: boolean) => void;
}): any {
  return <label className={`toggle-row${props.feature ? " feature-toggle" : ""}`} htmlFor={props.settingKey}>
    <span><strong>{props.title}</strong>{props.description && <small>{props.description}</small>}</span>
    <input id={props.settingKey} data-setting={props.settingKey} type="checkbox" checked={props.checked} onChange={(event: any) => props.onChange(props.settingKey, Boolean(event.currentTarget.checked))}/>
    <span className="toggle" aria-hidden="true"/>
  </label>;
}

class SonoraApp extends React.Component {
  state: AppState = {
    activeTabId: null,
    captureActive: false,
    capturedTabId: null,
    settings: { ...DEFAULT_SETTINGS },
    customPresets: [],
    uiPreferences: normalizeUiPreferences(),
    theme: SonoraTheme.normalize(),
    view: "controls",
    settingsTab: "general",
    error: "",
    toast: "",
    presetDialogOpen: false,
    presetName: "",
    presetNameError: "",
    savingPreset: false,
    activationState: "pending",
    draggingPanelId: null,
  };

  private updateTimer: number | null = null;
  private themeUpdateTimer: number | null = null;
  private toastTimer: number | null = null;
  private pendingPresetValues: AudioSettings | null = null;
  private presetDialog: HTMLDialogElement | null = null;
  private dragOriginalOrder: PanelId[] | null = null;
  private dropCompleted = false;

  componentDidMount(): void {
    SonoraTheme.apply(document.documentElement, this.state.theme);
    this.initialize().catch((error) => this.setState({ activationState: "error", error: messageFrom(error) }));
  }

  componentDidUpdate(_previousProps: unknown, previousState: AppState): void {
    if (previousState.presetDialogOpen !== this.state.presetDialogOpen && this.presetDialog) {
      if (this.state.presetDialogOpen && !this.presetDialog.open) {
        this.presetDialog.showModal();
        window.setTimeout(() => this.presetDialog?.querySelector<HTMLInputElement>("#presetName")?.focus(), 0);
      } else if (!this.state.presetDialogOpen && this.presetDialog.open) {
        this.presetDialog.close();
      }
    }
  }

  componentWillUnmount(): void {
    if (this.updateTimer !== null) window.clearTimeout(this.updateTimer);
    if (this.themeUpdateTimer !== null) window.clearTimeout(this.themeUpdateTimer);
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
  }

  private async initialize(): Promise<void> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTabId = Number.isInteger(tab?.id) ? tab.id : null;
    const response = await this.sendToBackground({ type: "GET_STATE", tabId: activeTabId });
    const theme = SonoraTheme.apply(document.documentElement, response.theme || SonoraTheme.DEFAULT_THEME);
    this.setState({
      activeTabId,
      settings: { ...DEFAULT_SETTINGS, ...(response.settings || {}) },
      captureActive: Boolean(response.active),
      capturedTabId: response.capturedTabId ?? null,
      customPresets: Array.isArray(response.customPresets) ? response.customPresets : [],
      uiPreferences: normalizeUiPreferences(response.uiPreferences),
      theme,
      error: "",
    }, () => this.activateCurrentTab());
  }

  private async activateCurrentTab(): Promise<void> {
    const { captureActive, capturedTabId, activeTabId, settings } = this.state;
    if (captureActive && capturedTabId === activeTabId) {
      this.setState({ activationState: "ready" });
      await this.sendToBackground({ type: "RESTORE_FLOATING_PANELS", tabId: activeTabId });
      return;
    }

    this.setState({ activationState: "pending", error: "" });
    try {
      const response = await this.sendToBackground({ type: "START_CAPTURE", tabId: activeTabId, settings });
      this.setState({
        settings: { ...settings, ...(response.settings || {}) },
        captureActive: Boolean(response.active),
        capturedTabId: response.capturedTabId ?? null,
        activationState: "ready",
      });
    } catch (error) {
      this.setState({ captureActive: false, capturedTabId: null, activationState: "error", error: messageFrom(error) });
    }
  }

  private sendToBackground = async (message: Record<string, unknown>): Promise<BackgroundResponse> => {
    const response = await chrome.runtime.sendMessage({ ...message, target: "background" }) as BackgroundResponse;
    if (!response?.ok) throw new Error(response?.error || "A extensão não respondeu.");
    return response;
  };

  private updateNumericSetting = (key: NumericSettingKey, value: number): void => {
    this.setState((state: AppState) => ({ settings: { ...state.settings, [key]: value } }), () => this.queueSettingsUpdate());
  };

  private updateBooleanSetting = (key: BooleanSettingKey, value: boolean): void => {
    this.setState((state: AppState) => ({ settings: { ...state.settings, [key]: value } }), () => this.queueSettingsUpdate());
  };

  private queueSettingsUpdate(delay = 65): void {
    if (this.updateTimer !== null) window.clearTimeout(this.updateTimer);
    this.updateTimer = window.setTimeout(async () => {
      try {
        const response = await this.sendToBackground({ type: "UPDATE_SETTINGS", tabId: this.state.activeTabId, settings: this.state.settings });
        this.setState((state: AppState) => ({ settings: { ...state.settings, ...(response.settings || {}) }, error: "" }));
      } catch (error) {
        this.setState({ error: messageFrom(error) });
      }
    }, delay);
  }

  private applyPreset = (presetName: string): void => {
    const preset = AUDIO_PRESETS[presetName];
    if (!preset) return;
    this.setState((state: AppState) => ({ settings: { ...state.settings, ...preset.values } }), () => this.queueSettingsUpdate(0));
  };

  private applyCustomPreset = (presetId: string): void => {
    const preset = this.state.customPresets.find((item) => item.id === presetId);
    if (!preset) return;
    this.setState({ settings: { ...DEFAULT_SETTINGS, ...preset.values } }, () => this.queueSettingsUpdate(0));
  };

  private settingsMatch(values: Partial<AudioSettings>): boolean {
    return Object.entries(values).every(([key, value]) => this.state.settings[key as SettingKey] === value);
  }

  private openPresetDialog = (): void => {
    this.pendingPresetValues = { ...this.state.settings };
    this.setState({ presetDialogOpen: true, presetName: "", presetNameError: "" });
  };

  private closePresetDialog = (): void => {
    this.pendingPresetValues = null;
    this.setState({ presetDialogOpen: false, presetName: "", presetNameError: "" });
  };

  private saveCustomPreset = async (event: any): Promise<void> => {
    event.preventDefault();
    const name = this.state.presetName.trim().replace(/\s+/g, " ");
    if (!name) {
      this.setState({ presetNameError: "Digite um nome para o preset." });
      return;
    }
    if (this.state.customPresets.some((preset) => preset.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
      this.setState({ presetNameError: "Já existe um preset com esse nome." });
      return;
    }

    this.setState({ savingPreset: true, presetNameError: "" });
    try {
      const response = await this.sendToBackground({ type: "SAVE_CUSTOM_PRESET", name, settings: this.pendingPresetValues || this.state.settings });
      this.setState({ customPresets: response.customPresets || [], savingPreset: false });
      this.closePresetDialog();
      this.showToast(`Preset “${name}” criado.`);
    } catch (error) {
      this.setState({ savingPreset: false, presetNameError: messageFrom(error) });
    }
  };

  private deleteCustomPreset = async (presetId: string): Promise<void> => {
    const preset = this.state.customPresets.find((item) => item.id === presetId);
    if (!preset) return;
    try {
      const response = await this.sendToBackground({ type: "DELETE_CUSTOM_PRESET", presetId });
      this.setState({ customPresets: response.customPresets || [], error: "" });
      this.showToast(`Preset “${preset.name}” removido.`);
    } catch (error) {
      this.setState({ error: messageFrom(error) });
    }
  };

  private isPanelFloating(panelId: PanelId): boolean {
    return this.state.uiPreferences.floatingPanels.some((item) => item.id === panelId);
  }

  private toggleFloatingPanel = async (panelId: PanelId): Promise<void> => {
    const floating = !this.isPanelFloating(panelId);
    const previousPreferences = normalizeUiPreferences(this.state.uiPreferences);
    const current = previousPreferences.floatingPanels.filter((item) => item.id !== panelId);
    if (floating) current.push(previousPreferences.floatingPanels.find((item) => item.id === panelId) || { id: panelId });
    this.setState({ uiPreferences: { ...previousPreferences, floatingPanels: current } });
    try {
      const response = await this.sendToBackground({ type: "SET_PANEL_FLOATING", tabId: this.state.activeTabId, panelId, floating });
      this.setState({ uiPreferences: normalizeUiPreferences(response.uiPreferences), error: "" });
      this.showToast(`${PANEL_TITLES[panelId]} ${floating ? "fixado na página" : "removido da página"}.`);
    } catch (error) {
      this.setState({ uiPreferences: previousPreferences, error: messageFrom(error) });
    }
  };

  private resetLayout = async (): Promise<void> => {
    try {
      const response = await this.sendToBackground({ type: "RESET_UI_LAYOUT", tabId: this.state.activeTabId });
      this.setState({ uiPreferences: normalizeUiPreferences(response.uiPreferences), error: "" });
      this.showToast("Layout padrão restaurado.");
    } catch (error) {
      this.setState({ error: messageFrom(error) });
    }
  };

  private startPanelDrag = (panelId: PanelId, event: any): void => {
    this.dragOriginalOrder = [...this.state.uiPreferences.panelOrder];
    this.dropCompleted = false;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/sonora-panel", panelId);
    this.setState({ draggingPanelId: panelId });
  };

  private reorderPanelDuringDrag = (targetId: PanelId, event: any): void => {
    const draggingId = this.state.draggingPanelId;
    if (!draggingId || draggingId === targetId) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const insertAfter = event.clientY > bounds.top + bounds.height / 2;
    this.setState((state: AppState) => {
      const order = state.uiPreferences.panelOrder.filter((id) => id !== draggingId);
      let targetIndex = order.indexOf(targetId);
      if (insertAfter) targetIndex += 1;
      order.splice(targetIndex, 0, draggingId);
      return { uiPreferences: { ...state.uiPreferences, panelOrder: order } };
    });
  };

  private dropPanel = async (event: any): Promise<void> => {
    if (!this.state.draggingPanelId) return;
    event.preventDefault();
    this.dropCompleted = true;
    try {
      const response = await this.sendToBackground({ type: "UPDATE_PANEL_ORDER", panelOrder: this.state.uiPreferences.panelOrder });
      this.setState({ uiPreferences: normalizeUiPreferences(response.uiPreferences), error: "" });
    } catch (error) {
      if (this.dragOriginalOrder) {
        this.setState((state: AppState) => ({ uiPreferences: { ...state.uiPreferences, panelOrder: this.dragOriginalOrder! }, error: messageFrom(error) }));
      }
    }
  };

  private finishPanelDrag = (): void => {
    if (!this.dropCompleted && this.dragOriginalOrder) {
      this.setState((state: AppState) => ({ uiPreferences: { ...state.uiPreferences, panelOrder: this.dragOriginalOrder! }, draggingPanelId: null }));
    } else {
      this.setState({ draggingPanelId: null });
    }
    this.dragOriginalOrder = null;
  };

  private updateTheme = (key: SonoraTheme.ThemeKey, value: string): void => {
    this.setState((state: AppState) => {
      const theme = SonoraTheme.apply(document.documentElement, { ...state.theme, [key]: value });
      return { theme };
    }, () => this.queueThemeUpdate());
  };

  private queueThemeUpdate(delay = 65): void {
    if (this.themeUpdateTimer !== null) window.clearTimeout(this.themeUpdateTimer);
    this.themeUpdateTimer = window.setTimeout(async () => {
      try {
        const response = await this.sendToBackground({ type: "UPDATE_THEME", tabId: this.state.activeTabId, theme: this.state.theme });
        const theme = SonoraTheme.apply(document.documentElement, response.theme || this.state.theme);
        this.setState({ theme, error: "" });
      } catch (error) {
        this.setState({ error: messageFrom(error) });
      }
    }, delay);
  }

  private resetTheme = (): void => {
    const theme = SonoraTheme.apply(document.documentElement, SonoraTheme.DEFAULT_THEME);
    this.setState({ theme }, () => this.queueThemeUpdate(0));
    this.showToast("Cores padrão restauradas.");
  };

  private showToast(message: string): void {
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.setState({ toast: message });
    this.toastTimer = window.setTimeout(() => this.setState({ toast: "" }), 2200);
  }

  private statusText(): string {
    if (this.state.activationState === "error") return "Indisponível";
    if (this.state.captureActive && this.state.capturedTabId === this.state.activeTabId) return "Ativo";
    if (this.state.captureActive) return "Transferindo…";
    return "Ativando…";
  }

  private renderPanel(panelId: PanelId): any {
    const { settings, draggingPanelId } = this.state;
    const floating = this.isPanelFloating(panelId);
    if (floating) return null;
    const heading = (note?: string) => <div className="section-heading">
      <div className="section-title"><DragHandle title={PANEL_TITLES[panelId]} onDragStart={(event) => this.startPanelDrag(panelId, event)} onDragEnd={this.finishPanelDrag}/><h2>{PANEL_TITLES[panelId]}</h2></div>
      {note ? <div className="section-actions"><span className="section-note">{note}</span><button className="float-button" type="button" aria-label={`Fixar ${PANEL_TITLES[panelId]} na página`} aria-pressed={floating} title="Fixar na página" onClick={() => this.toggleFloatingPanel(panelId)}><FloatIcon/></button></div>
        : <button className="float-button" type="button" aria-label={`Fixar ${PANEL_TITLES[panelId]} na página`} aria-pressed={floating} title="Fixar na página" onClick={() => this.toggleFloatingPanel(panelId)}><FloatIcon/></button>}
    </div>;

    let content: any;
    if (panelId === "playback") {
      content = <div className="panel-content">{heading()}<RangeControl settingKey="volume" label="Volume" value={settings.volume} min={0} max={300} step={1} edgeLeft="0%" edgeRight="300%" onChange={this.updateNumericSetting}/>
        <RangeControl settingKey="speed" label="Velocidade" value={settings.speed} min={0.5} max={2} step={0.05} edgeLeft="0.5×" edgeRight="2×" onChange={this.updateNumericSetting}>
          <div className="speed-shortcuts" role="group" aria-label="Atalhos de velocidade">{[0.75, 1, 1.25, 1.5, 2].map((speed) => <button key={speed} type="button" className={Math.abs(settings.speed - speed) < 0.001 ? "active" : ""} aria-pressed={Math.abs(settings.speed - speed) < 0.001} onClick={() => this.updateNumericSetting("speed", speed)}>{formatDecimal(speed)}×</button>)}</div>
        </RangeControl>
        <ToggleControl settingKey="preservePitch" title="Manter pitch original" checked={settings.preservePitch} onChange={this.updateBooleanSetting}/></div>;
    } else if (panelId === "equalizer") {
      content = <div className="panel-content">{heading("±12 dB")}<div className="eq-grid"><CompactRange settingKey="bass" label="Graves" value={settings.bass} onChange={this.updateNumericSetting}/><CompactRange settingKey="mid" label="Médios" value={settings.mid} onChange={this.updateNumericSetting}/><CompactRange settingKey="treble" label="Agudos" value={settings.treble} onChange={this.updateNumericSetting}/></div></div>;
    } else if (panelId === "environment") {
      content = <div className="panel-content">{heading()}<RangeControl settingKey="reverb" label="Reverb" value={settings.reverb} min={0} max={100} step={1} edgeLeft="Seco" edgeRight="Espacial" onChange={this.updateNumericSetting}/><ToggleControl settingKey="nightMode" title="Modo noturno" description="Equilibra sons baixos e segura picos muito altos" checked={settings.nightMode} feature={true} onChange={this.updateBooleanSetting}/></div>;
    } else {
      content = <div className="panel-content">{heading()}<RangeControl settingKey="stereoWidth" label="Largura" value={settings.stereoWidth} min={0} max={200} step={1} edgeLeft="Mono" edgeRight="Amplo" className="centered-range stereo-width-range" onChange={this.updateNumericSetting}/><RangeControl settingKey="pan" label="Balanço" value={settings.pan} min={-100} max={100} step={1} edgeLeft="Esquerda" edgeRight="Direita" className="centered-range pan-range" last={true} onChange={this.updateNumericSetting}/></div>;
    }

    return <section key={panelId} className={`control-section${panelId === "stereo" ? " stereo-section" : ""}${draggingPanelId === panelId ? " dragging" : ""}`} data-panel-id={panelId} onDragOver={(event: any) => this.reorderPanelDuringDrag(panelId, event)} onDrop={this.dropPanel}>{content}</section>;
  }

  private renderControls(): any {
    let activeLabel: string | null = null;
    Object.values(AUDIO_PRESETS).forEach((preset) => { if (this.settingsMatch(preset.values)) activeLabel = preset.label; });
    this.state.customPresets.forEach((preset) => { if (this.settingsMatch(preset.values)) activeLabel = preset.name; });
    const visiblePanels = this.state.uiPreferences.panelOrder.filter((id) => !this.isPanelFloating(id));

    return <div id="controlsView">
      <section className="preset-card" aria-labelledby="presetTitle">
        <div className="preset-header"><div><span className="eyebrow">AJUSTE RÁPIDO</span><strong id="presetTitle">Presets</strong></div><span aria-live="polite">{activeLabel || "Personalizado"}</span></div>
        <div className="preset-list" role="group" aria-label="Presets de áudio">
          {Object.entries(AUDIO_PRESETS).map(([name, preset]) => <button key={name} type="button" className={this.settingsMatch(preset.values) ? "active" : ""} aria-pressed={this.settingsMatch(preset.values)} onClick={() => this.applyPreset(name)}>{preset.label}</button>)}
          {this.state.customPresets.map((preset) => <button key={preset.id} type="button" className={this.settingsMatch(preset.values) ? "active" : ""} aria-pressed={this.settingsMatch(preset.values)} onClick={() => this.applyCustomPreset(preset.id)}>{preset.name}</button>)}
          <button className="add-preset" type="button" aria-label="Salvar ajustes como novo preset" title="Criar preset" onClick={this.openPresetDialog}>+</button>
        </div>
      </section>
      <div className="panel-list" aria-label="Controles de áudio reordenáveis">{this.state.uiPreferences.panelOrder.map((id) => this.renderPanel(id))}</div>
      {visiblePanels.length === 0 && <div className="floating-empty-state"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><strong>Todos os controles estão na página</strong><p>Feche um painel flutuante ou restaure o layout nas configurações para trazê-lo de volta.</p></div>}
      <footer><span>v0.6</span></footer>
    </div>;
  }

  private renderSettings(): any {
    const { settingsTab, customPresets, theme } = this.state;
    return <div className="settings-view">
      <div className="settings-title"><h1>Configurações</h1><p>Personalize o comportamento e a aparência da Sonora.</p></div>
      <nav className="settings-tabs" aria-label="Seções das configurações">
        <button className={settingsTab === "general" ? "active" : ""} type="button" aria-selected={settingsTab === "general"} onClick={() => this.setState({ settingsTab: "general" })}>Geral</button>
        <button className={settingsTab === "styles" ? "active" : ""} type="button" aria-selected={settingsTab === "styles"} onClick={() => this.setState({ settingsTab: "styles" })}>Estilos</button>
      </nav>
      {settingsTab === "general" ? <div className="settings-panel">
        <section className="settings-card"><div className="settings-card-heading"><div><h2>Meus presets</h2></div><span className="count-badge">{customPresets.length}</span></div>
          <div className="saved-preset-list">{customPresets.map((preset) => <div className="saved-preset" key={preset.id}><span><strong>{preset.name}</strong><small>{formatPresetDate(preset.createdAt)}</small></span><button className="delete-preset" type="button" aria-label={`Remover preset ${preset.name}`} title="Remover preset" onClick={() => this.deleteCustomPreset(preset.id)}>×</button></div>)}</div>
          {customPresets.length === 0 && <p className="empty-state">Você ainda não criou nenhum preset.</p>}
        </section>
        <section className="settings-card"><div className="settings-card-heading"><div><h2>Layout</h2><p>A ordem e os painéis fixos são salvos automaticamente.</p></div></div><button className="secondary-button" type="button" onClick={this.resetLayout}>Restaurar layout padrão</button></section>
        <section className="settings-card licenses-card"><div className="settings-card-heading"><div><h2>Licenças</h2></div></div><div className="license-summary"><span className="license-mark">MIT</span><span><strong>Sonora</strong><small>Copyright © 2026 Sonora contributors</small></span></div>
          <details><summary>Ver licença MIT</summary><p>Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction.</p><p>THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.</p></details>
          <div className="native-tech"><strong>React + TypeScript</strong><p>A interface do popup agora é declarativa e tipada. O React é empacotado localmente para respeitar as regras do Manifest V3.</p></div>
        </section>
      </div> : <div className="settings-panel">
        <section className="settings-card styles-card"><div className="settings-card-heading"><div><h2>Paleta</h2><p>São apenas 5 cores base. Bordas, sombras, trilhas e estados são derivados automaticamente.</p></div><span className="count-badge">5</span></div>
          <div className="palette-preview" aria-label="Prévia da paleta">{SonoraTheme.FIELDS.map((field) => <span key={field.key} title={field.label} style={{ background: theme[field.key] }}/>)}</div>
          <div className="theme-color-list">{SonoraTheme.FIELDS.map((field) => <label className="theme-color-row" key={field.key}><input type="color" aria-label={field.label} value={theme[field.key]} onChange={(event: any) => this.updateTheme(field.key, event.currentTarget.value)}/><span className="theme-color-copy"><strong>{field.label}</strong><small>{field.description}</small></span><code className="theme-color-value">{theme[field.key]}</code></label>)}</div>
          <button className="secondary-button" type="button" onClick={this.resetTheme}>Restaurar cores padrão</button>
        </section>
        <section className="settings-card style-info-card"><div className="settings-card-heading"><div><h2>Como funciona</h2></div></div><p>As cinco escolhas também são aplicadas aos painéis flutuantes. A Sonora calcula automaticamente as variações transparentes e escolhe texto legível sobre a cor de destaque.</p></section>
      </div>}
      <footer><span>v0.6</span></footer>
    </div>;
  }

  render(): any {
    const currentTabIsCaptured = this.state.captureActive && this.state.capturedTabId === this.state.activeTabId;
    return <main className="app">
      <header className="topbar"><button className="brand" type="button" aria-label="Abrir controles da Sonora" onClick={() => this.setState({ view: "controls" })}><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span>SONORA</span></button><div className="topbar-actions"><div className={`status-chip${currentTabIsCaptured ? " active" : ""}`} role="status" aria-live="polite"><span className="status-dot" aria-hidden="true"/><span>{this.statusText()}</span></div><button className={`icon-button settings-button${this.state.view === "settings" ? " active" : ""}`} type="button" aria-label={this.state.view === "settings" ? "Voltar aos controles" : "Abrir configurações"} aria-pressed={this.state.view === "settings"} title="Configurações" onClick={() => this.setState((state: AppState) => ({ view: state.view === "settings" ? "controls" : "settings", settingsTab: "general" }))}><SettingsIcon/></button></div></header>
      {this.state.error && <p className="error-message" role="alert">{this.state.error}</p>}
      {this.state.view === "controls" ? this.renderControls() : this.renderSettings()}
      <dialog className="preset-dialog" ref={(node: HTMLDialogElement | null) => { this.presetDialog = node; }} onClick={(event: any) => { if (event.target === event.currentTarget) this.closePresetDialog(); }}>
        <form onSubmit={this.saveCustomPreset}><div className="dialog-mark" aria-hidden="true">+</div><span className="eyebrow">NOVO ATALHO</span><h2>Nome do preset</h2><p>Vamos salvar uma cópia exata dos ajustes atuais.</p><label htmlFor="presetName">Nome</label><input id="presetName" name="presetName" type="text" maxLength={24} autoComplete="off" placeholder="Ex.: Podcast" required={true} value={this.state.presetName} onChange={(event: any) => this.setState({ presetName: event.currentTarget.value, presetNameError: "" })}/>{this.state.presetNameError && <p className="field-error" role="alert">{this.state.presetNameError}</p>}<div className="dialog-actions"><button className="secondary-button" type="button" onClick={this.closePresetDialog}>Cancelar</button><button className="primary-button" type="submit" disabled={this.state.savingPreset}>{this.state.savingPreset ? "Salvando…" : "Salvar preset"}</button></div></form>
      </dialog>
      {this.state.toast && <div className="toast" role="status" aria-live="polite">{this.state.toast}</div>}
    </main>;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado.");
ReactDOM.render(<SonoraApp/>, root);
