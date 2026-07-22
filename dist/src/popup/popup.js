/// <reference path="./globals.d.ts" />
import * as SonoraTheme from "./theme.js";
const DEFAULT_SETTINGS = Object.freeze({
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
const DEFAULT_PANEL_ORDER = Object.freeze([
    "playback",
    "equalizer",
    "environment",
    "stereo",
]);
const AUDIO_PRESETS = Object.freeze({
    neutral: { label: "Neutro", values: { ...DEFAULT_SETTINGS, preservePitch: false } },
    dialogue: { label: "Diálogo", values: { bass: -3, mid: 4, treble: 3, reverb: 0, stereoWidth: 80, pan: 0, nightMode: true } },
    bass: { label: "Graves+", values: { bass: 8, mid: -2, treble: 2, reverb: 0, stereoWidth: 115, pan: 0, nightMode: false } },
    cinema: { label: "Cinema", values: { bass: 5, mid: 0, treble: 4, reverb: 18, stereoWidth: 135, pan: 0, nightMode: false } },
    night: { label: "Madrugada", values: { bass: -4, mid: 2, treble: -3, reverb: 0, stereoWidth: 75, pan: 0, nightMode: true } },
});
const PANEL_TITLES = Object.freeze({
    playback: "Reprodução",
    equalizer: "Equalizador",
    environment: "Ambiente",
    stereo: "Imagem estéreo",
});
function messageFrom(error) {
    return error instanceof Error ? error.message : String(error || "Erro inesperado.");
}
function normalizeUiPreferences(value) {
    const requested = Array.isArray(value?.panelOrder) ? value.panelOrder : [];
    const unique = requested.filter((id, index) => DEFAULT_PANEL_ORDER.includes(id) && requested.indexOf(id) === index);
    const panelOrder = [...unique, ...DEFAULT_PANEL_ORDER.filter((id) => !unique.includes(id))];
    const floatingPanels = Array.isArray(value?.floatingPanels)
        ? value.floatingPanels.filter((item) => Boolean(item && DEFAULT_PANEL_ORDER.includes(item.id)))
        : [];
    return { panelOrder, floatingPanels };
}
function formatDecimal(value) {
    return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
function describeStereoWidth(value) {
    const rounded = Math.round(value);
    if (rounded === 0)
        return "Mono";
    if (rounded === 100)
        return "Normal";
    return `${rounded}%`;
}
function describePan(value) {
    const rounded = Math.round(value);
    if (rounded < 0)
        return `E ${Math.abs(rounded)}%`;
    if (rounded > 0)
        return `D ${rounded}%`;
    return "Centro";
}
function settingValue(key, value) {
    if (key === "volume" || key === "reverb")
        return `${Math.round(value)}%`;
    if (key === "speed")
        return `${formatDecimal(value)}×`;
    if (key === "bass" || key === "mid" || key === "treble")
        return `${value > 0 ? "+" : ""}${Math.round(value)} dB`;
    if (key === "stereoWidth")
        return describeStereoWidth(value);
    return describePan(value);
}
function formatPresetDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "Configuração personalizada";
    return `Criado em ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date)}`;
}
function FloatIcon() {
    return React.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" },
        React.createElement("path", { d: "M14 5h5v5M19 5l-7 7" }),
        React.createElement("path", { d: "M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" }));
}
function SettingsIcon() {
    return React.createElement("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" },
        React.createElement("circle", { cx: "12", cy: "12", r: "3" }),
        React.createElement("path", { d: "M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" }));
}
function DragHandle(props) {
    return React.createElement("button", { className: "drag-handle", type: "button", draggable: true, "aria-label": `Arrastar ${props.title} para reordenar`, title: "Arraste para reordenar", onDragStart: props.onDragStart, onDragEnd: props.onDragEnd },
        React.createElement("span", null),
        React.createElement("span", null),
        React.createElement("span", null),
        React.createElement("span", null),
        React.createElement("span", null),
        React.createElement("span", null));
}
function RangeControl(props) {
    const progress = ((props.value - props.min) / (props.max - props.min)) * 100;
    return React.createElement("div", { className: `control-row${props.last ? " last-control" : ""}` },
        React.createElement("div", { className: "control-label" },
            React.createElement("label", { htmlFor: props.settingKey }, props.label),
            React.createElement("output", { id: `${props.settingKey}Value`, htmlFor: props.settingKey }, settingValue(props.settingKey, props.value))),
        React.createElement("input", { className: props.className || "", id: props.settingKey, "data-setting": props.settingKey, type: "range", min: props.min, max: props.max, step: props.step, value: props.value, style: { "--progress": `${progress}%` }, onChange: (event) => props.onChange(props.settingKey, Number(event.currentTarget.value)) }),
        props.edgeLeft !== undefined && React.createElement("div", { className: "range-edge-labels" },
            React.createElement("span", null, props.edgeLeft),
            React.createElement("span", null, props.edgeRight)),
        props.children);
}
function CompactRange(props) {
    const progress = ((props.value + 12) / 24) * 100;
    return React.createElement("div", { className: "compact-control" },
        React.createElement("div", { className: "control-label" },
            React.createElement("label", { htmlFor: props.settingKey }, props.label),
            React.createElement("output", null, settingValue(props.settingKey, props.value))),
        React.createElement("input", { id: props.settingKey, "data-setting": props.settingKey, type: "range", min: "-12", max: "12", step: "1", value: props.value, style: { "--progress": `${progress}%` }, onChange: (event) => props.onChange(props.settingKey, Number(event.currentTarget.value)) }));
}
function ToggleControl(props) {
    return React.createElement("label", { className: `toggle-row${props.feature ? " feature-toggle" : ""}`, htmlFor: props.settingKey },
        React.createElement("span", null,
            React.createElement("strong", null, props.title),
            props.description && React.createElement("small", null, props.description)),
        React.createElement("input", { id: props.settingKey, "data-setting": props.settingKey, type: "checkbox", checked: props.checked, onChange: (event) => props.onChange(props.settingKey, Boolean(event.currentTarget.checked)) }),
        React.createElement("span", { className: "toggle", "aria-hidden": "true" }));
}
class SonoraApp extends React.Component {
    constructor() {
        super(...arguments);
        this.state = {
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
        this.updateTimer = null;
        this.themeUpdateTimer = null;
        this.toastTimer = null;
        this.pendingPresetValues = null;
        this.presetDialog = null;
        this.dragOriginalOrder = null;
        this.dropCompleted = false;
        this.sendToBackground = async (message) => {
            const response = await chrome.runtime.sendMessage({ ...message, target: "background" });
            if (!response?.ok)
                throw new Error(response?.error || "A extensão não respondeu.");
            return response;
        };
        this.updateNumericSetting = (key, value) => {
            this.setState((state) => ({ settings: { ...state.settings, [key]: value } }), () => this.queueSettingsUpdate());
        };
        this.updateBooleanSetting = (key, value) => {
            this.setState((state) => ({ settings: { ...state.settings, [key]: value } }), () => this.queueSettingsUpdate());
        };
        this.applyPreset = (presetName) => {
            const preset = AUDIO_PRESETS[presetName];
            if (!preset)
                return;
            this.setState((state) => ({ settings: { ...state.settings, ...preset.values } }), () => this.queueSettingsUpdate(0));
        };
        this.applyCustomPreset = (presetId) => {
            const preset = this.state.customPresets.find((item) => item.id === presetId);
            if (!preset)
                return;
            this.setState({ settings: { ...DEFAULT_SETTINGS, ...preset.values } }, () => this.queueSettingsUpdate(0));
        };
        this.openPresetDialog = () => {
            this.pendingPresetValues = { ...this.state.settings };
            this.setState({ presetDialogOpen: true, presetName: "", presetNameError: "" });
        };
        this.closePresetDialog = () => {
            this.pendingPresetValues = null;
            this.setState({ presetDialogOpen: false, presetName: "", presetNameError: "" });
        };
        this.saveCustomPreset = async (event) => {
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
            }
            catch (error) {
                this.setState({ savingPreset: false, presetNameError: messageFrom(error) });
            }
        };
        this.deleteCustomPreset = async (presetId) => {
            const preset = this.state.customPresets.find((item) => item.id === presetId);
            if (!preset)
                return;
            try {
                const response = await this.sendToBackground({ type: "DELETE_CUSTOM_PRESET", presetId });
                this.setState({ customPresets: response.customPresets || [], error: "" });
                this.showToast(`Preset “${preset.name}” removido.`);
            }
            catch (error) {
                this.setState({ error: messageFrom(error) });
            }
        };
        this.toggleFloatingPanel = async (panelId) => {
            const floating = !this.isPanelFloating(panelId);
            const previousPreferences = normalizeUiPreferences(this.state.uiPreferences);
            const current = previousPreferences.floatingPanels.filter((item) => item.id !== panelId);
            if (floating)
                current.push(previousPreferences.floatingPanels.find((item) => item.id === panelId) || { id: panelId });
            this.setState({ uiPreferences: { ...previousPreferences, floatingPanels: current } });
            try {
                const response = await this.sendToBackground({ type: "SET_PANEL_FLOATING", tabId: this.state.activeTabId, panelId, floating });
                this.setState({ uiPreferences: normalizeUiPreferences(response.uiPreferences), error: "" });
                this.showToast(`${PANEL_TITLES[panelId]} ${floating ? "fixado na página" : "removido da página"}.`);
            }
            catch (error) {
                this.setState({ uiPreferences: previousPreferences, error: messageFrom(error) });
            }
        };
        this.resetLayout = async () => {
            try {
                const response = await this.sendToBackground({ type: "RESET_UI_LAYOUT", tabId: this.state.activeTabId });
                this.setState({ uiPreferences: normalizeUiPreferences(response.uiPreferences), error: "" });
                this.showToast("Layout padrão restaurado.");
            }
            catch (error) {
                this.setState({ error: messageFrom(error) });
            }
        };
        this.startPanelDrag = (panelId, event) => {
            this.dragOriginalOrder = [...this.state.uiPreferences.panelOrder];
            this.dropCompleted = false;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/sonora-panel", panelId);
            this.setState({ draggingPanelId: panelId });
        };
        this.reorderPanelDuringDrag = (targetId, event) => {
            const draggingId = this.state.draggingPanelId;
            if (!draggingId || draggingId === targetId)
                return;
            event.preventDefault();
            const bounds = event.currentTarget.getBoundingClientRect();
            const insertAfter = event.clientY > bounds.top + bounds.height / 2;
            this.setState((state) => {
                const order = state.uiPreferences.panelOrder.filter((id) => id !== draggingId);
                let targetIndex = order.indexOf(targetId);
                if (insertAfter)
                    targetIndex += 1;
                order.splice(targetIndex, 0, draggingId);
                return { uiPreferences: { ...state.uiPreferences, panelOrder: order } };
            });
        };
        this.dropPanel = async (event) => {
            if (!this.state.draggingPanelId)
                return;
            event.preventDefault();
            this.dropCompleted = true;
            try {
                const response = await this.sendToBackground({ type: "UPDATE_PANEL_ORDER", panelOrder: this.state.uiPreferences.panelOrder });
                this.setState({ uiPreferences: normalizeUiPreferences(response.uiPreferences), error: "" });
            }
            catch (error) {
                if (this.dragOriginalOrder) {
                    this.setState((state) => ({ uiPreferences: { ...state.uiPreferences, panelOrder: this.dragOriginalOrder }, error: messageFrom(error) }));
                }
            }
        };
        this.finishPanelDrag = () => {
            if (!this.dropCompleted && this.dragOriginalOrder) {
                this.setState((state) => ({ uiPreferences: { ...state.uiPreferences, panelOrder: this.dragOriginalOrder }, draggingPanelId: null }));
            }
            else {
                this.setState({ draggingPanelId: null });
            }
            this.dragOriginalOrder = null;
        };
        this.updateTheme = (key, value) => {
            this.setState((state) => {
                const theme = SonoraTheme.apply(document.documentElement, { ...state.theme, [key]: value });
                return { theme };
            }, () => this.queueThemeUpdate());
        };
        this.resetTheme = () => {
            const theme = SonoraTheme.apply(document.documentElement, SonoraTheme.DEFAULT_THEME);
            this.setState({ theme }, () => this.queueThemeUpdate(0));
            this.showToast("Cores padrão restauradas.");
        };
    }
    componentDidMount() {
        SonoraTheme.apply(document.documentElement, this.state.theme);
        this.initialize().catch((error) => this.setState({ activationState: "error", error: messageFrom(error) }));
    }
    componentDidUpdate(_previousProps, previousState) {
        if (previousState.presetDialogOpen !== this.state.presetDialogOpen && this.presetDialog) {
            if (this.state.presetDialogOpen && !this.presetDialog.open) {
                this.presetDialog.showModal();
                window.setTimeout(() => this.presetDialog?.querySelector("#presetName")?.focus(), 0);
            }
            else if (!this.state.presetDialogOpen && this.presetDialog.open) {
                this.presetDialog.close();
            }
        }
    }
    componentWillUnmount() {
        if (this.updateTimer !== null)
            window.clearTimeout(this.updateTimer);
        if (this.themeUpdateTimer !== null)
            window.clearTimeout(this.themeUpdateTimer);
        if (this.toastTimer !== null)
            window.clearTimeout(this.toastTimer);
    }
    async initialize() {
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
    async activateCurrentTab() {
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
        }
        catch (error) {
            this.setState({ captureActive: false, capturedTabId: null, activationState: "error", error: messageFrom(error) });
        }
    }
    queueSettingsUpdate(delay = 65) {
        if (this.updateTimer !== null)
            window.clearTimeout(this.updateTimer);
        this.updateTimer = window.setTimeout(async () => {
            try {
                const response = await this.sendToBackground({ type: "UPDATE_SETTINGS", tabId: this.state.activeTabId, settings: this.state.settings });
                this.setState((state) => ({ settings: { ...state.settings, ...(response.settings || {}) }, error: "" }));
            }
            catch (error) {
                this.setState({ error: messageFrom(error) });
            }
        }, delay);
    }
    settingsMatch(values) {
        return Object.entries(values).every(([key, value]) => this.state.settings[key] === value);
    }
    isPanelFloating(panelId) {
        return this.state.uiPreferences.floatingPanels.some((item) => item.id === panelId);
    }
    queueThemeUpdate(delay = 65) {
        if (this.themeUpdateTimer !== null)
            window.clearTimeout(this.themeUpdateTimer);
        this.themeUpdateTimer = window.setTimeout(async () => {
            try {
                const response = await this.sendToBackground({ type: "UPDATE_THEME", tabId: this.state.activeTabId, theme: this.state.theme });
                const theme = SonoraTheme.apply(document.documentElement, response.theme || this.state.theme);
                this.setState({ theme, error: "" });
            }
            catch (error) {
                this.setState({ error: messageFrom(error) });
            }
        }, delay);
    }
    showToast(message) {
        if (this.toastTimer !== null)
            window.clearTimeout(this.toastTimer);
        this.setState({ toast: message });
        this.toastTimer = window.setTimeout(() => this.setState({ toast: "" }), 2200);
    }
    statusText() {
        if (this.state.activationState === "error")
            return "Indisponível";
        if (this.state.captureActive && this.state.capturedTabId === this.state.activeTabId)
            return "Ativo";
        if (this.state.captureActive)
            return "Transferindo…";
        return "Ativando…";
    }
    renderPanel(panelId) {
        const { settings, draggingPanelId } = this.state;
        const floating = this.isPanelFloating(panelId);
        if (floating)
            return null;
        const heading = (note) => React.createElement("div", { className: "section-heading" },
            React.createElement("div", { className: "section-title" },
                React.createElement(DragHandle, { title: PANEL_TITLES[panelId], onDragStart: (event) => this.startPanelDrag(panelId, event), onDragEnd: this.finishPanelDrag }),
                React.createElement("h2", null, PANEL_TITLES[panelId])),
            note ? React.createElement("div", { className: "section-actions" },
                React.createElement("span", { className: "section-note" }, note),
                React.createElement("button", { className: "float-button", type: "button", "aria-label": `Fixar ${PANEL_TITLES[panelId]} na página`, "aria-pressed": floating, title: "Fixar na p\u00E1gina", onClick: () => this.toggleFloatingPanel(panelId) },
                    React.createElement(FloatIcon, null)))
                : React.createElement("button", { className: "float-button", type: "button", "aria-label": `Fixar ${PANEL_TITLES[panelId]} na página`, "aria-pressed": floating, title: "Fixar na p\u00E1gina", onClick: () => this.toggleFloatingPanel(panelId) },
                    React.createElement(FloatIcon, null)));
        let content;
        if (panelId === "playback") {
            content = React.createElement("div", { className: "panel-content" },
                heading(),
                React.createElement(RangeControl, { settingKey: "volume", label: "Volume", value: settings.volume, min: 0, max: 300, step: 1, edgeLeft: "0%", edgeRight: "300%", onChange: this.updateNumericSetting }),
                React.createElement(RangeControl, { settingKey: "speed", label: "Velocidade", value: settings.speed, min: 0.5, max: 2, step: 0.05, edgeLeft: "0.5\u00D7", edgeRight: "2\u00D7", onChange: this.updateNumericSetting },
                    React.createElement("div", { className: "speed-shortcuts", role: "group", "aria-label": "Atalhos de velocidade" }, [0.75, 1, 1.25, 1.5, 2].map((speed) => React.createElement("button", { key: speed, type: "button", className: Math.abs(settings.speed - speed) < 0.001 ? "active" : "", "aria-pressed": Math.abs(settings.speed - speed) < 0.001, onClick: () => this.updateNumericSetting("speed", speed) },
                        formatDecimal(speed),
                        "\u00D7")))),
                React.createElement(ToggleControl, { settingKey: "preservePitch", title: "Manter pitch original", checked: settings.preservePitch, onChange: this.updateBooleanSetting }));
        }
        else if (panelId === "equalizer") {
            content = React.createElement("div", { className: "panel-content" },
                heading("±12 dB"),
                React.createElement("div", { className: "eq-grid" },
                    React.createElement(CompactRange, { settingKey: "bass", label: "Graves", value: settings.bass, onChange: this.updateNumericSetting }),
                    React.createElement(CompactRange, { settingKey: "mid", label: "M\u00E9dios", value: settings.mid, onChange: this.updateNumericSetting }),
                    React.createElement(CompactRange, { settingKey: "treble", label: "Agudos", value: settings.treble, onChange: this.updateNumericSetting })));
        }
        else if (panelId === "environment") {
            content = React.createElement("div", { className: "panel-content" },
                heading(),
                React.createElement(RangeControl, { settingKey: "reverb", label: "Reverb", value: settings.reverb, min: 0, max: 100, step: 1, edgeLeft: "Seco", edgeRight: "Espacial", onChange: this.updateNumericSetting }),
                React.createElement(ToggleControl, { settingKey: "nightMode", title: "Modo noturno", description: "Equilibra sons baixos e segura picos muito altos", checked: settings.nightMode, feature: true, onChange: this.updateBooleanSetting }));
        }
        else {
            content = React.createElement("div", { className: "panel-content" },
                heading(),
                React.createElement(RangeControl, { settingKey: "stereoWidth", label: "Largura", value: settings.stereoWidth, min: 0, max: 200, step: 1, edgeLeft: "Mono", edgeRight: "Amplo", className: "centered-range stereo-width-range", onChange: this.updateNumericSetting }),
                React.createElement(RangeControl, { settingKey: "pan", label: "Balan\u00E7o", value: settings.pan, min: -100, max: 100, step: 1, edgeLeft: "Esquerda", edgeRight: "Direita", className: "centered-range pan-range", last: true, onChange: this.updateNumericSetting }));
        }
        return React.createElement("section", { key: panelId, className: `control-section${panelId === "stereo" ? " stereo-section" : ""}${draggingPanelId === panelId ? " dragging" : ""}`, "data-panel-id": panelId, onDragOver: (event) => this.reorderPanelDuringDrag(panelId, event), onDrop: this.dropPanel }, content);
    }
    renderControls() {
        let activeLabel = null;
        Object.values(AUDIO_PRESETS).forEach((preset) => { if (this.settingsMatch(preset.values))
            activeLabel = preset.label; });
        this.state.customPresets.forEach((preset) => { if (this.settingsMatch(preset.values))
            activeLabel = preset.name; });
        const visiblePanels = this.state.uiPreferences.panelOrder.filter((id) => !this.isPanelFloating(id));
        return React.createElement("div", { id: "controlsView" },
            React.createElement("section", { className: "preset-card", "aria-labelledby": "presetTitle" },
                React.createElement("div", { className: "preset-header" },
                    React.createElement("div", null,
                        React.createElement("span", { className: "eyebrow" }, "AJUSTE R\u00C1PIDO"),
                        React.createElement("strong", { id: "presetTitle" }, "Presets")),
                    React.createElement("span", { "aria-live": "polite" }, activeLabel || "Personalizado")),
                React.createElement("div", { className: "preset-list", role: "group", "aria-label": "Presets de \u00E1udio" },
                    Object.entries(AUDIO_PRESETS).map(([name, preset]) => React.createElement("button", { key: name, type: "button", className: this.settingsMatch(preset.values) ? "active" : "", "aria-pressed": this.settingsMatch(preset.values), onClick: () => this.applyPreset(name) }, preset.label)),
                    this.state.customPresets.map((preset) => React.createElement("button", { key: preset.id, type: "button", className: this.settingsMatch(preset.values) ? "active" : "", "aria-pressed": this.settingsMatch(preset.values), onClick: () => this.applyCustomPreset(preset.id) }, preset.name)),
                    React.createElement("button", { className: "add-preset", type: "button", "aria-label": "Salvar ajustes como novo preset", title: "Criar preset", onClick: this.openPresetDialog }, "+"))),
            React.createElement("div", { className: "panel-list", "aria-label": "Controles de \u00E1udio reorden\u00E1veis" }, this.state.uiPreferences.panelOrder.map((id) => this.renderPanel(id))),
            visiblePanels.length === 0 && React.createElement("div", { className: "floating-empty-state" },
                React.createElement("span", { className: "brand-mark", "aria-hidden": "true" },
                    React.createElement("i", null),
                    React.createElement("i", null),
                    React.createElement("i", null)),
                React.createElement("strong", null, "Todos os controles est\u00E3o na p\u00E1gina"),
                React.createElement("p", null, "Feche um painel flutuante ou restaure o layout nas configura\u00E7\u00F5es para traz\u00EA-lo de volta.")),
            React.createElement("footer", null,
                React.createElement("span", null, "v0.6")));
    }
    renderSettings() {
        const { settingsTab, customPresets, theme } = this.state;
        return React.createElement("div", { className: "settings-view" },
            React.createElement("div", { className: "settings-title" },
                React.createElement("h1", null, "Configura\u00E7\u00F5es"),
                React.createElement("p", null, "Personalize o comportamento e a apar\u00EAncia da Sonora.")),
            React.createElement("nav", { className: "settings-tabs", "aria-label": "Se\u00E7\u00F5es das configura\u00E7\u00F5es" },
                React.createElement("button", { className: settingsTab === "general" ? "active" : "", type: "button", "aria-selected": settingsTab === "general", onClick: () => this.setState({ settingsTab: "general" }) }, "Geral"),
                React.createElement("button", { className: settingsTab === "styles" ? "active" : "", type: "button", "aria-selected": settingsTab === "styles", onClick: () => this.setState({ settingsTab: "styles" }) }, "Estilos")),
            settingsTab === "general" ? React.createElement("div", { className: "settings-panel" },
                React.createElement("section", { className: "settings-card" },
                    React.createElement("div", { className: "settings-card-heading" },
                        React.createElement("div", null,
                            React.createElement("h2", null, "Meus presets")),
                        React.createElement("span", { className: "count-badge" }, customPresets.length)),
                    React.createElement("div", { className: "saved-preset-list" }, customPresets.map((preset) => React.createElement("div", { className: "saved-preset", key: preset.id },
                        React.createElement("span", null,
                            React.createElement("strong", null, preset.name),
                            React.createElement("small", null, formatPresetDate(preset.createdAt))),
                        React.createElement("button", { className: "delete-preset", type: "button", "aria-label": `Remover preset ${preset.name}`, title: "Remover preset", onClick: () => this.deleteCustomPreset(preset.id) }, "\u00D7")))),
                    customPresets.length === 0 && React.createElement("p", { className: "empty-state" }, "Voc\u00EA ainda n\u00E3o criou nenhum preset.")),
                React.createElement("section", { className: "settings-card" },
                    React.createElement("div", { className: "settings-card-heading" },
                        React.createElement("div", null,
                            React.createElement("h2", null, "Layout"),
                            React.createElement("p", null, "A ordem e os pain\u00E9is fixos s\u00E3o salvos automaticamente."))),
                    React.createElement("button", { className: "secondary-button", type: "button", onClick: this.resetLayout }, "Restaurar layout padr\u00E3o")),
                React.createElement("section", { className: "settings-card licenses-card" },
                    React.createElement("div", { className: "settings-card-heading" },
                        React.createElement("div", null,
                            React.createElement("h2", null, "Licen\u00E7as"))),
                    React.createElement("div", { className: "license-summary" },
                        React.createElement("span", { className: "license-mark" }, "MIT"),
                        React.createElement("span", null,
                            React.createElement("strong", null, "Sonora"),
                            React.createElement("small", null, "Copyright \u00A9 2026 Sonora contributors"))),
                    React.createElement("details", null,
                        React.createElement("summary", null, "Ver licen\u00E7a MIT"),
                        React.createElement("p", null, "Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction."),
                        React.createElement("p", null, "THE SOFTWARE IS PROVIDED \u201CAS IS\u201D, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.")),
                    React.createElement("div", { className: "native-tech" },
                        React.createElement("strong", null, "React + TypeScript"),
                        React.createElement("p", null, "A interface do popup agora \u00E9 declarativa e tipada. O React \u00E9 empacotado localmente para respeitar as regras do Manifest V3.")))) : React.createElement("div", { className: "settings-panel" },
                React.createElement("section", { className: "settings-card styles-card" },
                    React.createElement("div", { className: "settings-card-heading" },
                        React.createElement("div", null,
                            React.createElement("h2", null, "Paleta"),
                            React.createElement("p", null, "S\u00E3o apenas 5 cores base. Bordas, sombras, trilhas e estados s\u00E3o derivados automaticamente.")),
                        React.createElement("span", { className: "count-badge" }, "5")),
                    React.createElement("div", { className: "palette-preview", "aria-label": "Pr\u00E9via da paleta" }, SonoraTheme.FIELDS.map((field) => React.createElement("span", { key: field.key, title: field.label, style: { background: theme[field.key] } }))),
                    React.createElement("div", { className: "theme-color-list" }, SonoraTheme.FIELDS.map((field) => React.createElement("label", { className: "theme-color-row", key: field.key },
                        React.createElement("input", { type: "color", "aria-label": field.label, value: theme[field.key], onChange: (event) => this.updateTheme(field.key, event.currentTarget.value) }),
                        React.createElement("span", { className: "theme-color-copy" },
                            React.createElement("strong", null, field.label),
                            React.createElement("small", null, field.description)),
                        React.createElement("code", { className: "theme-color-value" }, theme[field.key])))),
                    React.createElement("button", { className: "secondary-button", type: "button", onClick: this.resetTheme }, "Restaurar cores padr\u00E3o")),
                React.createElement("section", { className: "settings-card style-info-card" },
                    React.createElement("div", { className: "settings-card-heading" },
                        React.createElement("div", null,
                            React.createElement("h2", null, "Como funciona"))),
                    React.createElement("p", null, "As cinco escolhas tamb\u00E9m s\u00E3o aplicadas aos pain\u00E9is flutuantes. A Sonora calcula automaticamente as varia\u00E7\u00F5es transparentes e escolhe texto leg\u00EDvel sobre a cor de destaque."))),
            React.createElement("footer", null,
                React.createElement("span", null, "v0.6")));
    }
    render() {
        const currentTabIsCaptured = this.state.captureActive && this.state.capturedTabId === this.state.activeTabId;
        return React.createElement("main", { className: "app" },
            React.createElement("header", { className: "topbar" },
                React.createElement("button", { className: "brand", type: "button", "aria-label": "Abrir controles da Sonora", onClick: () => this.setState({ view: "controls" }) },
                    React.createElement("span", { className: "brand-mark", "aria-hidden": "true" },
                        React.createElement("i", null),
                        React.createElement("i", null),
                        React.createElement("i", null)),
                    React.createElement("span", null, "SONORA")),
                React.createElement("div", { className: "topbar-actions" },
                    React.createElement("div", { className: `status-chip${currentTabIsCaptured ? " active" : ""}`, role: "status", "aria-live": "polite" },
                        React.createElement("span", { className: "status-dot", "aria-hidden": "true" }),
                        React.createElement("span", null, this.statusText())),
                    React.createElement("button", { className: `icon-button settings-button${this.state.view === "settings" ? " active" : ""}`, type: "button", "aria-label": this.state.view === "settings" ? "Voltar aos controles" : "Abrir configurações", "aria-pressed": this.state.view === "settings", title: "Configura\u00E7\u00F5es", onClick: () => this.setState((state) => ({ view: state.view === "settings" ? "controls" : "settings", settingsTab: "general" })) },
                        React.createElement(SettingsIcon, null)))),
            this.state.error && React.createElement("p", { className: "error-message", role: "alert" }, this.state.error),
            this.state.view === "controls" ? this.renderControls() : this.renderSettings(),
            React.createElement("dialog", { className: "preset-dialog", ref: (node) => { this.presetDialog = node; }, onClick: (event) => { if (event.target === event.currentTarget)
                    this.closePresetDialog(); } },
                React.createElement("form", { onSubmit: this.saveCustomPreset },
                    React.createElement("div", { className: "dialog-mark", "aria-hidden": "true" }, "+"),
                    React.createElement("span", { className: "eyebrow" }, "NOVO ATALHO"),
                    React.createElement("h2", null, "Nome do preset"),
                    React.createElement("p", null, "Vamos salvar uma c\u00F3pia exata dos ajustes atuais."),
                    React.createElement("label", { htmlFor: "presetName" }, "Nome"),
                    React.createElement("input", { id: "presetName", name: "presetName", type: "text", maxLength: 24, autoComplete: "off", placeholder: "Ex.: Podcast", required: true, value: this.state.presetName, onChange: (event) => this.setState({ presetName: event.currentTarget.value, presetNameError: "" }) }),
                    this.state.presetNameError && React.createElement("p", { className: "field-error", role: "alert" }, this.state.presetNameError),
                    React.createElement("div", { className: "dialog-actions" },
                        React.createElement("button", { className: "secondary-button", type: "button", onClick: this.closePresetDialog }, "Cancelar"),
                        React.createElement("button", { className: "primary-button", type: "submit", disabled: this.state.savingPreset }, this.state.savingPreset ? "Salvando…" : "Salvar preset")))),
            this.state.toast && React.createElement("div", { className: "toast", role: "status", "aria-live": "polite" }, this.state.toast));
    }
}
const root = document.getElementById("root");
if (!root)
    throw new Error("Elemento #root não encontrado.");
ReactDOM.render(React.createElement(SonoraApp, null), root);
