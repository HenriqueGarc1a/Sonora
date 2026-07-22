(() => {
  if (globalThis.__sonoraPlaybackController) {
    return;
  }

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

  const PANEL_DEFINITIONS = Object.freeze({
    playback: {
      title: "Reprodução",
      fields: [
        { key: "volume", label: "Volume", type: "range", min: 0, max: 300, step: 1 },
        { key: "speed", label: "Velocidade", type: "range", min: 0.5, max: 2, step: 0.05 },
        { key: "preservePitch", label: "Manter pitch original", type: "checkbox" },
      ],
    },
    equalizer: {
      title: "Equalizador",
      fields: [
        { key: "bass", label: "Graves", type: "range", min: -12, max: 12, step: 1 },
        { key: "mid", label: "Médios", type: "range", min: -12, max: 12, step: 1 },
        { key: "treble", label: "Agudos", type: "range", min: -12, max: 12, step: 1 },
      ],
    },
    environment: {
      title: "Ambiente",
      fields: [
        { key: "reverb", label: "Reverb", type: "range", min: 0, max: 100, step: 1 },
        { key: "nightMode", label: "Modo noturno", type: "checkbox" },
      ],
    },
    stereo: {
      title: "Imagem estéreo",
      fields: [
        { key: "stereoWidth", label: "Largura", type: "range", min: 0, max: 200, step: 1 },
        { key: "pan", label: "Balanço", type: "range", min: -100, max: 100, step: 1 },
      ],
    },
  });

  const managedElements = new Map();
  const floatingPanels = new Map();
  const playbackState = {
    enabled: false,
    speed: 1,
    preservePitch: true,
  };
  let audioSettings = { ...DEFAULT_SETTINGS };
  let floatingUpdateTimer = null;

  // --- Motor de áudio (Web Audio API, roda inteiramente na página — sem tabCapture/offscreen) ---

  let audioEngine = null; // { context, nodes, sources: Map<element, sourceNode> }
  let engineEnabled = false;
  let unlockListenerAttached = false;

  async function ensureAudioEngine() {
    if (audioEngine) {
      return audioEngine;
    }

    const context = new AudioContext({ latencyHint: "interactive" });
    await context.audioWorklet.addModule(
      chrome.runtime.getURL("src/audio/stereo-width-processor.js"),
    );

    const mixInput = context.createGain(); // soma todos os elementos de mídia da página
    const stereoWidth = new AudioWorkletNode(context, "stereo-width", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: "explicit",
      channelInterpretation: "speakers",
    });

    const bass = context.createBiquadFilter();
    bass.type = "lowshelf";
    bass.frequency.value = 200;

    const mid = context.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 1100;
    mid.Q.value = 0.9;

    const treble = context.createBiquadFilter();
    treble.type = "highshelf";
    treble.frequency.value = 4200;

    const dry = context.createGain();
    const convolver = context.createConvolver();
    convolver.buffer = makeImpulseResponse(context, 2.6, 2.9);
    const wet = context.createGain();
    const master = context.createGain();
    const dynamics = context.createDynamicsCompressor();
    const makeup = context.createGain();
    const panner = context.createStereoPanner();

    mixInput.connect(stereoWidth);
    stereoWidth.connect(bass);
    bass.connect(mid);
    mid.connect(treble);

    treble.connect(dry);
    treble.connect(convolver);
    convolver.connect(wet);
    dry.connect(master);
    wet.connect(master);
    master.connect(dynamics);
    dynamics.connect(makeup);
    makeup.connect(panner);
    panner.connect(context.destination);

    audioEngine = {
      context,
      nodes: { mixInput, stereoWidth, bass, mid, treble, dry, convolver, wet, master, dynamics, makeup, panner },
      sources: new Map(),
    };

    attachUnlockListener();

    return audioEngine;
  }

  function connectElementToEngine(element) {
    if (!audioEngine || audioEngine.sources.has(element)) {
      return;
    }

    try {
      const source = audioEngine.context.createMediaElementSource(element);
      source.connect(audioEngine.nodes.mixInput);
      audioEngine.sources.set(element, source);
    } catch (error) {
      // Alguns players (ex: DRM, ou já ligados a outro AudioContext) não podem ser conectados.
      console.warn("Sonora: não foi possível conectar este elemento de mídia.", error);
    }
  }

  function attachUnlockListener() {
    // Navegadores só liberam o AudioContext após um gesto do usuário NA PÁGINA.
    // O clique de ativação acontece no popup da extensão, então garantimos um
    // "destravamento" assim que a pessoa interagir com a própria página.
    if (unlockListenerAttached) {
      return;
    }
    unlockListenerAttached = true;

    const unlock = () => {
      if (audioEngine && audioEngine.context.state === "suspended") {
        audioEngine.context.resume().catch(() => undefined);
      }
    };

    document.addEventListener("click", unlock, { capture: true, passive: true });
    document.addEventListener("keydown", unlock, { capture: true, passive: true });
  }

  function applyAudioSettings(settings) {
    if (!audioEngine) {
      return;
    }

    const { context, nodes } = audioEngine;
    const now = context.currentTime;
    const smooth = (param, value) => {
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, 0.018);
    };

    const volume = clamp(Number(settings.volume) / 100, 0, 3);
    smooth(nodes.master.gain, volume);
    smooth(nodes.bass.gain, clamp(Number(settings.bass), -12, 12));
    smooth(nodes.mid.gain, clamp(Number(settings.mid), -12, 12));
    smooth(nodes.treble.gain, clamp(Number(settings.treble), -12, 12));

    const width = clamp(Number(settings.stereoWidth) / 100, 0, 2);
    smooth(nodes.stereoWidth.parameters.get("width"), width);
    smooth(nodes.panner.pan, clamp(Number(settings.pan) / 100, -1, 1));

    const nightMode = settings.nightMode === true;
    const boostLimiter = !nightMode && volume > 1;
    smooth(nodes.dynamics.threshold, nightMode ? -28 : boostLimiter ? -3 : 0);
    smooth(nodes.dynamics.knee, nightMode ? 24 : boostLimiter ? 4 : 0);
    smooth(nodes.dynamics.ratio, nightMode ? 5 : boostLimiter ? 14 : 1);
    smooth(nodes.dynamics.attack, nightMode ? 0.008 : 0.003);
    smooth(nodes.dynamics.release, nightMode ? 0.28 : 0.16);
    smooth(nodes.makeup.gain, nightMode ? 1.35 : 1);

    const mix = clamp(Number(settings.reverb) / 100, 0, 1);
    smooth(nodes.dry.gain, Math.cos(mix * Math.PI * 0.5));
    smooth(nodes.wet.gain, Math.sin(mix * Math.PI * 0.5) * 0.72);
  }

  function disengageAudioEngine() {
    engineEnabled = false;

    if (!audioEngine) {
      return;
    }

    // Um elemento de mídia, uma vez conectado, não pode "voltar" a tocar nativamente.
    // Em vez de silenciar, ligamos cada fonte direto no destino, sem os efeitos.
    for (const source of audioEngine.sources.values()) {
      try {
        source.disconnect();
        source.connect(audioEngine.context.destination);
      } catch {
        // Ignora fontes já desconectadas.
      }
    }
  }

  function makeImpulseResponse(context, durationSeconds, decay) {
    const length = Math.floor(context.sampleRate * durationSeconds);
    const impulse = context.createBuffer(2, length, context.sampleRate);

    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        const envelope = Math.pow(1 - index / length, decay);
        data[index] = (Math.random() * 2 - 1) * envelope;
      }
    }

    return impulse;
  }

  // --- Velocidade / pitch (funciona igual em qualquer navegador, não depende do motor de áudio) ---

  function applyToMedia(element) {
    if (!playbackState.enabled) {
      return;
    }

    try {
      if (Math.abs(element.playbackRate - playbackState.speed) > 0.001) {
        element.playbackRate = playbackState.speed;
      }
      element.defaultPlaybackRate = playbackState.speed;
      if ("preservesPitch" in element) {
        element.preservesPitch = playbackState.preservePitch;
      }
      if ("webkitPreservesPitch" in element) {
        element.webkitPreservesPitch = playbackState.preservePitch;
      }
    } catch {
      // Alguns players protegem suas propriedades; os demais continuam funcionando.
    }
  }

  function manageElement(element) {
    if (!managedElements.has(element)) {
      const reapply = () => queueMicrotask(() => applyToMedia(element));
      const original = {
        playbackRate: element.playbackRate,
        defaultPlaybackRate: element.defaultPlaybackRate,
        reapply,
      };

      if ("preservesPitch" in element) original.preservesPitch = element.preservesPitch;
      if ("webkitPreservesPitch" in element) original.webkitPreservesPitch = element.webkitPreservesPitch;

      managedElements.set(element, original);
      element.addEventListener("play", reapply);
      element.addEventListener("loadedmetadata", reapply);
      element.addEventListener("ratechange", reapply);
    }
    applyToMedia(element);

    if (engineEnabled) {
      connectElementToEngine(element);
    }
  }

  function discoverMedia(root = document) {
    if (!playbackState.enabled) {
      return;
    }
    if (root instanceof HTMLMediaElement) {
      manageElement(root);
    }
    if (typeof root.querySelectorAll === "function") {
      for (const element of root.querySelectorAll("audio, video")) {
        manageElement(element);
      }
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          discoverMedia(node);
        }
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  // --- Ativação/desativação combinadas (velocidade/pitch + motor de áudio) ---

  async function activateSonora(settings) {
    playbackState.enabled = true;
    playbackState.speed = Math.min(2, Math.max(0.5, Number(settings.speed) || 1));
    playbackState.preservePitch = settings.preservePitch !== false;

    engineEnabled = true;
    await ensureAudioEngine();
    await audioEngine.context.resume().catch(() => undefined);

    discoverMedia();
    applyAudioSettings(settings);
    audioSettings = { ...DEFAULT_SETTINGS, ...settings };
    updateAllFloatingPanels();
  }

  function deactivateSonora() {
    playbackState.enabled = false;
    for (const [element, original] of managedElements) {
      element.removeEventListener("play", original.reapply);
      element.removeEventListener("loadedmetadata", original.reapply);
      element.removeEventListener("ratechange", original.reapply);
      try {
        element.playbackRate = original.playbackRate;
        element.defaultPlaybackRate = original.defaultPlaybackRate;
        if ("preservesPitch" in original) element.preservesPitch = original.preservesPitch;
        if ("webkitPreservesPitch" in original) element.webkitPreservesPitch = original.webkitPreservesPitch;
      } catch {
        // A página pode ter removido ou bloqueado o elemento durante o processamento.
      }
    }
    managedElements.clear();
    disengageAudioEngine();
  }

  function updateSonoraSettings(settings) {
    audioSettings = { ...DEFAULT_SETTINGS, ...audioSettings, ...settings };

    if (playbackState.enabled) {
      playbackState.speed = Math.min(2, Math.max(0.5, Number(settings.speed) || 1));
      playbackState.preservePitch = settings.preservePitch !== false;
      discoverMedia();
    }

    if (engineEnabled) {
      applyAudioSettings(audioSettings);
    }

    updateAllFloatingPanels();
  }

  // --- Painéis flutuantes ---

  function showFloatingPanel(panelId, incomingSettings, savedPosition) {
    const definition = PANEL_DEFINITIONS[panelId];
    if (!definition) {
      return;
    }
    if (incomingSettings) {
      audioSettings = { ...DEFAULT_SETTINGS, ...audioSettings, ...incomingSettings };
    }

    const existing = floatingPanels.get(panelId);
    if (existing) {
      if (savedPosition) setPanelPosition(existing, savedPosition);
      updateFloatingPanel(existing);
      return;
    }

    const host = document.createElement("div");
    host.id = `sonora-floating-${panelId}`;
    host.setAttribute("data-sonora-panel", panelId);
    Object.assign(host.style, {
      position: "fixed",
      zIndex: "2147483647",
      display: "block",
      width: "292px",
      margin: "0",
      padding: "0",
      border: "0",
      background: "transparent",
      colorScheme: "dark",
    });

    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>${floatingPanelStyles()}</style>
      <section class="panel" aria-label="Controles Sonora: ${definition.title}">
        <header class="titlebar">
          <span class="brand"><i></i><strong>SONORA</strong><small>${definition.title}</small></span>
          <button class="close" type="button" aria-label="Fechar painel ${definition.title}" title="Remover da página">×</button>
        </header>
        <div class="fields">${definition.fields.map(createFieldMarkup).join("")}</div>
        <footer>Arraste pelo topo · ajustes salvos automaticamente</footer>
      </section>
    `;
    document.documentElement.append(host);

    const record = { panelId, definition, host, root, x: 0, y: 0 };
    floatingPanels.set(panelId, record);

    const fallbackPosition = {
      x: Math.max(12, window.innerWidth - 316),
      y: Math.min(Math.max(18, 18 + (floatingPanels.size - 1) * 34), Math.max(18, window.innerHeight - 90)),
    };
    setPanelPosition(record, savedPosition || fallbackPosition);
    bindFloatingPanel(record);
    updateFloatingPanel(record);
  }

  function createFieldMarkup(field) {
    if (field.type === "checkbox") {
      return `
        <label class="check-field">
          <span>${field.label}</span>
          <input data-setting="${field.key}" type="checkbox" />
          <i aria-hidden="true"></i>
        </label>
      `;
    }
    return `
      <label class="range-field">
        <span><strong>${field.label}</strong><output data-output="${field.key}"></output></span>
        <input data-setting="${field.key}" type="range" min="${field.min}" max="${field.max}" step="${field.step}" />
      </label>
    `;
  }

  function bindFloatingPanel(record) {
    const { root, definition, panelId } = record;
    root.querySelector(".close").addEventListener("click", () => {
      hideFloatingPanel(panelId);
      chrome.runtime.sendMessage({
        target: "background",
        type: "SET_PANEL_FLOATING",
        panelId,
        floating: false,
      }).catch(() => undefined);
    });

    for (const field of definition.fields) {
      const control = root.querySelector(`[data-setting="${field.key}"]`);
      const eventName = field.type === "checkbox" ? "change" : "input";
      control.addEventListener(eventName, () => {
        audioSettings[field.key] = field.type === "checkbox" ? control.checked : Number(control.value);
        if (playbackState.enabled || engineEnabled) {
          updateSonoraSettings(audioSettings);
        } else {
          updateAllFloatingPanels();
        }
        queueFloatingSettingsUpdate();
      });
    }

    bindPanelMovement(record, root.querySelector(".titlebar"));
  }

  function bindPanelMovement(record, titlebar) {
    titlebar.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button")) {
        return;
      }
      event.preventDefault();
      titlebar.setPointerCapture(event.pointerId);
      record.host.style.transition = "none";
      record.host.style.cursor = "grabbing";
      const start = { pointerX: event.clientX, pointerY: event.clientY, x: record.x, y: record.y };

      const move = (moveEvent) => {
        const next = {
          x: start.x + moveEvent.clientX - start.pointerX,
          y: start.y + moveEvent.clientY - start.pointerY,
        };
        setPanelPosition(record, next);
      };

      const finish = () => {
        titlebar.removeEventListener("pointermove", move);
        titlebar.removeEventListener("pointerup", finish);
        titlebar.removeEventListener("pointercancel", finish);
        record.host.style.cursor = "";
        chrome.runtime.sendMessage({
          target: "background",
          type: "SAVE_FLOATING_POSITION",
          panelId: record.panelId,
          position: { x: record.x, y: record.y },
        }).catch(() => undefined);
      };

      titlebar.addEventListener("pointermove", move);
      titlebar.addEventListener("pointerup", finish);
      titlebar.addEventListener("pointercancel", finish);
    });
  }

  function setPanelPosition(record, position = {}) {
    const bounds = record.host.getBoundingClientRect();
    const width = bounds.width || 292;
    const height = bounds.height || 80;
    const x = clamp(Number(position.x), 8, Math.max(8, window.innerWidth - width - 8));
    const y = clamp(Number(position.y), 8, Math.max(8, window.innerHeight - height - 8));
    record.x = Math.round(x);
    record.y = Math.round(y);
    record.host.style.left = `${record.x}px`;
    record.host.style.top = `${record.y}px`;
  }

  function hideFloatingPanel(panelId) {
    const record = floatingPanels.get(panelId);
    if (!record) {
      return;
    }
    record.host.remove();
    floatingPanels.delete(panelId);
  }

  function hideAllFloatingPanels() {
    for (const panelId of [...floatingPanels.keys()]) {
      hideFloatingPanel(panelId);
    }
  }

  function updateAllFloatingPanels() {
    for (const record of floatingPanels.values()) {
      updateFloatingPanel(record);
    }
  }

  function updateFloatingPanel(record) {
    for (const field of record.definition.fields) {
      const control = record.root.querySelector(`[data-setting="${field.key}"]`);
      if (!control) continue;
      if (field.type === "checkbox") {
        control.checked = Boolean(audioSettings[field.key]);
      } else {
        const value = Number(audioSettings[field.key]);
        control.value = value;
        const progress = ((value - field.min) / (field.max - field.min)) * 100;
        control.style.setProperty("--progress", `${progress}%`);
        const output = record.root.querySelector(`[data-output="${field.key}"]`);
        if (output) output.textContent = formatSettingValue(field.key, value);
      }
    }
  }

  function queueFloatingSettingsUpdate() {
    clearTimeout(floatingUpdateTimer);
    floatingUpdateTimer = setTimeout(async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          target: "background",
          type: "UPDATE_SETTINGS",
          settings: audioSettings,
        });
        if (response?.ok && response.settings) {
          audioSettings = { ...DEFAULT_SETTINGS, ...audioSettings, ...response.settings };
          updateAllFloatingPanels();
        }
      } catch {
        // A extensão pode ter sido recarregada enquanto o painel estava aberto.
      }
    }, 65);
  }

  function formatSettingValue(key, value) {
    if (key === "volume" || key === "reverb") return `${Math.round(value)}%`;
    if (key === "speed") return `${Number(value).toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}×`;
    if (["bass", "mid", "treble"].includes(key)) return `${value > 0 ? "+" : ""}${Math.round(value)} dB`;
    if (key === "stereoWidth") {
      if (Math.round(value) === 0) return "Mono";
      if (Math.round(value) === 100) return "Normal";
      return `${Math.round(value)}%`;
    }
    if (key === "pan") {
      if (Math.round(value) < 0) return `E ${Math.abs(Math.round(value))}%`;
      if (Math.round(value) > 0) return `D ${Math.round(value)}%`;
      return "Centro";
    }
    return String(value);
  }

  function floatingPanelStyles() {
    return `
      :host { color-scheme: dark; }
      * { box-sizing: border-box; }
      button, input { font: inherit; }
      .panel {
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 16px;
        background: #121215;
        color: #f6f4f2;
        box-shadow: 0 18px 60px rgba(0,0,0,.52);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .titlebar { display: flex; align-items: center; justify-content: space-between; min-height: 43px; padding: 8px 9px 8px 12px; border-bottom: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.025); cursor: grab; user-select: none; touch-action: none; }
      .titlebar:active { cursor: grabbing; }
      .brand { display: flex; align-items: center; gap: 6px; min-width: 0; }
      .brand i { width: 4px; height: 15px; border-radius: 9px; background: #c8ff3d; box-shadow: -6px 3px 0 -1px #c8ff3d, 6px 1px 0 -1px #c8ff3d; }
      .brand strong { margin-left: 5px; font-size: 9px; letter-spacing: .12em; }
      .brand small { overflow: hidden; color: #8f8f9a; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
      .close { display: grid; width: 26px; height: 26px; place-items: center; border: 1px solid rgba(255,255,255,.09); border-radius: 8px; background: rgba(255,255,255,.025); color: #8f8f9a; cursor: pointer; font-size: 16px; line-height: 1; }
      .close:hover { border-color: rgba(255,123,123,.3); background: rgba(255,123,123,.08); color: #ff7b7b; }
      .close:focus-visible, input:focus-visible { outline: 2px solid #c8ff3d; outline-offset: 2px; }
      .fields { display: grid; gap: 14px; padding: 14px; }
      .range-field { display: grid; gap: 8px; }
      .range-field > span { display: flex; align-items: center; justify-content: space-between; }
      .range-field strong, .check-field > span { font-size: 11px; font-weight: 650; }
      output { color: #c8ff3d; font-size: 10px; font-variant-numeric: tabular-nums; font-weight: 750; }
      input[type="range"] { --progress: 50%; width: 100%; height: 4px; margin: 4px 0; border-radius: 99px; outline: none; appearance: none; background: linear-gradient(to right,#c8ff3d 0,#c8ff3d var(--progress),rgba(255,255,255,.13) var(--progress),rgba(255,255,255,.13) 100%); }
      input[type="range"]::-webkit-slider-thumb { width: 15px; height: 15px; border: 3px solid #c8ff3d; border-radius: 50%; appearance: none; background: #111113; cursor: grab; }
      .check-field { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; cursor: pointer; }
      .check-field input { position: absolute; width: 1px; height: 1px; opacity: 0; }
      .check-field i { position: relative; width: 34px; height: 19px; border-radius: 99px; background: #34343b; }
      .check-field i::after { position: absolute; top: 3px; left: 3px; width: 13px; height: 13px; border-radius: 50%; background: #aaaab1; content: ""; transition: transform .15s ease; }
      .check-field input:checked + i { background: #c8ff3d; }
      .check-field input:checked + i::after { background: #101204; transform: translateX(15px); }
      footer { padding: 0 14px 11px; color: #696971; font-size: 8px; }
      @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
    `;
  }

  function clamp(value, minimum, maximum) {
    if (!Number.isFinite(value)) {
      return minimum;
    }
    return Math.min(maximum, Math.max(minimum, value));
  }

  globalThis.__sonoraPlaybackController = {
    activate: activateSonora,
    deactivate: deactivateSonora,
    update: updateSonoraSettings,
    showFloatingPanel,
    hideFloatingPanel,
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.target !== "content") {
      return false;
    }

    switch (message.type) {
      case "PING":
        sendResponse({ ready: true });
        break;
      case "ENGAGE_SONORA":
        activateSonora(message.settings)
          .then(() => sendResponse({ ok: true }))
          .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
        return true;
      case "DISENGAGE_SONORA":
        deactivateSonora();
        sendResponse({ ok: true });
        break;
      case "UPDATE_SONORA_SETTINGS":
        updateSonoraSettings(message.settings);
        sendResponse({ ok: true });
        break;
      case "SHOW_FLOATING_PANEL":
        showFloatingPanel(message.panelId, message.settings, message.position);
        sendResponse({ visible: true });
        break;
      case "HIDE_FLOATING_PANEL":
        hideFloatingPanel(message.panelId);
        sendResponse({ visible: false });
        break;
      case "HIDE_ALL_FLOATING_PANELS":
        hideAllFloatingPanels();
        sendResponse({ visible: false });
        break;
      default:
        return false;
    }
    return false;
  });

  window.addEventListener("resize", () => {
    for (const record of floatingPanels.values()) {
      setPanelPosition(record, { x: record.x, y: record.y });
    }
  });
})();
