import { applyAudioSettings, createAudioGraph, destroyAudioGraph, type AudioGraph } from "./audioGraph";

export function createCaptureSession() {
  let mediaStream: MediaStream | null = null;
  let graph: AudioGraph | null = null;
  let capturedTabId: number | null = null;

  const stop = async (notifyBackground: boolean) => {
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

    const previousGraph = graph;
    graph = null;
    await destroyAudioGraph(previousGraph);

    if (notifyBackground && tabId !== null) {
      await chrome.runtime.sendMessage({ target: "background", type: "CAPTURE_ENDED", tabId }).catch(() => undefined);
    }
  };

  const start = async (streamId: string, tabId: number, settings: unknown) => {
    await stop(false);
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      } as any,
      video: false,
    });
    capturedTabId = tabId;

    const streamAtStart = mediaStream;
    for (const track of mediaStream.getAudioTracks()) {
      track.onended = () => {
        if (mediaStream === streamAtStart) stop(true).catch(console.error);
      };
    }

    graph = await createAudioGraph(mediaStream);
    applyAudioSettings(graph, settings);
    await graph.context.resume();
  };

  return {
    start,
    stop,
    update: (settings: unknown) => applyAudioSettings(graph, settings),
    isActive: () => Boolean(mediaStream),
  };
}
