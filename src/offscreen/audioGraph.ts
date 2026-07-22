import { makeImpulseResponse } from "./impulse";

export interface AudioGraph {
  context: AudioContext;
  nodes: Record<string, any>;
}

export async function createAudioGraph(stream: MediaStream): Promise<AudioGraph> {
  const context = new AudioContext({ latencyHint: "interactive" });
  await context.audioWorklet.addModule(chrome.runtime.getURL("src/audio/stereo-width-processor.js"));

  const source = context.createMediaStreamSource(stream);
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
  panner.connect(context.destination);

  return {
    context,
    nodes: { source, stereoWidth, bass, mid, treble, dry, convolver, wet, master, dynamics, makeup, panner },
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

export function applyAudioSettings(graph: AudioGraph | null, settings: any = {}): void {
  if (!graph) return;
  const { context, nodes } = graph;
  const now = context.currentTime;
  const smooth = (param: AudioParam, value: number) => {
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, 0.018);
  };

  const volume = clamp(Number(settings.volume) / 100, 0, 3);
  smooth(nodes.master.gain, volume);
  smooth(nodes.bass.gain, clamp(Number(settings.bass), -12, 12));
  smooth(nodes.mid.gain, clamp(Number(settings.mid), -12, 12));
  smooth(nodes.treble.gain, clamp(Number(settings.treble), -12, 12));
  smooth(nodes.stereoWidth.parameters.get("width"), clamp(Number(settings.stereoWidth) / 100, 0, 2));
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

export async function destroyAudioGraph(graph: AudioGraph | null): Promise<void> {
  if (!graph) return;
  for (const node of Object.values(graph.nodes)) {
    try { node.disconnect(); } catch { /* já desconectado */ }
  }
  await graph.context.close().catch(() => undefined);
}
