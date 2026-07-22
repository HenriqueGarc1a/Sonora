let mediaStream = null;
let audioContext = null;
let capturedTabId = null;
let nodes = null;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen") {
    return false;
  }

  handleMessage(message)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      console.error("Sonora offscreen:", error);
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });

  return true;
});

async function handleMessage(message) {
  switch (message.type) {
    case "START_CAPTURE":
      try {
        await startCapture(message.streamId, message.tabId, message.settings);
        return { active: true };
      } catch (error) {
        // Evita deixar a aba muda caso alguma etapa do Web Audio falhe.
        await stopCapture(false);
        throw error;
      }
    case "STOP_CAPTURE":
      await stopCapture(false);
      return { active: false };
    case "UPDATE_AUDIO_SETTINGS":
      applySettings(message.settings);
      return { active: Boolean(mediaStream) };
    default:
      throw new Error("Comando de áudio desconhecido.");
  }
}

async function startCapture(streamId, tabId, settings) {
  await stopCapture(false);

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });
  capturedTabId = tabId;

  const streamAtStart = mediaStream;
  for (const track of mediaStream.getAudioTracks()) {
    track.onended = () => {
      if (mediaStream === streamAtStart) {
        stopCapture(true).catch(console.error);
      }
    };
  }

  audioContext = new AudioContext({ latencyHint: "interactive" });
  await audioContext.audioWorklet.addModule("stereo-width-processor.js");

  const source = audioContext.createMediaStreamSource(mediaStream);
  const stereoWidth = new AudioWorkletNode(audioContext, "stereo-width", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    channelCount: 2,
    channelCountMode: "explicit",
    channelInterpretation: "speakers",
  });

  const bass = audioContext.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 200;

  const mid = audioContext.createBiquadFilter();
  mid.type = "peaking";
  mid.frequency.value = 1100;
  mid.Q.value = 0.9;

  const treble = audioContext.createBiquadFilter();
  treble.type = "highshelf";
  treble.frequency.value = 4200;

  const dry = audioContext.createGain();
  const convolver = audioContext.createConvolver();
  convolver.buffer = makeImpulseResponse(audioContext, 2.6, 2.9);
  const wet = audioContext.createGain();
  const master = audioContext.createGain();
  const dynamics = audioContext.createDynamicsCompressor();
  const makeup = audioContext.createGain();
  const panner = audioContext.createStereoPanner();

  source.connect(stereoWidth);
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
  panner.connect(audioContext.destination);

  nodes = {
    source,
    stereoWidth,
    bass,
    mid,
    treble,
    dry,
    convolver,
    wet,
    master,
    dynamics,
    makeup,
    panner,
  };

  applySettings(settings);
  await audioContext.resume();
}

function applySettings(settings = {}) {
  if (!audioContext || !nodes) {
    return;
  }

  const now = audioContext.currentTime;
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

async function stopCapture(notifyBackground) {
  const tabId = capturedTabId;
  capturedTabId = null;

  if (mediaStream) {
    const previousStream = mediaStream;
    mediaStream = null;
    for (const track of previousStream.getTracks()) {
      track.onended = null;
      track.stop();
    }
  }

  if (nodes) {
    for (const node of Object.values(nodes)) {
      try {
        node.disconnect();
      } catch {
        // O nó já pode ter sido desconectado pelo encerramento da stream.
      }
    }
    nodes = null;
  }

  if (audioContext) {
    const previousContext = audioContext;
    audioContext = null;
    await previousContext.close().catch(() => undefined);
  }

  if (notifyBackground && tabId !== null) {
    await chrome.runtime.sendMessage({
      target: "background",
      type: "CAPTURE_ENDED",
      tabId,
    }).catch(() => undefined);
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

function clamp(value, minimum, maximum) {
  if (!Number.isFinite(value)) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, value));
}
