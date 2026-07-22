interface OriginalMediaState {
  playbackRate: number;
  defaultPlaybackRate: number;
  preservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
  reapply: () => void;
  enforceLoop: () => void;
  markActive: () => void;
}

interface PlaybackPosition {
  currentTime: number;
  duration: number | null;
  hasMedia: boolean;
}

export function createPlaybackController() {
  const managedElements = new Map<HTMLMediaElement, OriginalMediaState>();
  const state = {
    enabled: false,
    speed: 1,
    preservePitch: true,
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 0,
  };

  let activeMedia: HTMLMediaElement | null = null;
  let animationFrame: number | null = null;

  const validLoopBounds = (element: HTMLMediaElement) => {
    const duration = Number.isFinite(element.duration) ? element.duration : Number.POSITIVE_INFINITY;
    const start = Math.max(0, Math.min(state.loopStart, duration));
    const end = Math.max(0, Math.min(state.loopEnd, duration));
    return { start, end, valid: state.loopEnabled && end - start >= 0.05 };
  };

  const enforceLoopOnMedia = (element: HTMLMediaElement) => {
    if (!state.enabled) return;
    const bounds = validLoopBounds(element);
    if (!bounds.valid) return;

    try {
      const tolerance = 0.035;
      if (element.currentTime >= bounds.end - tolerance || element.currentTime < bounds.start - 0.15) {
        element.currentTime = bounds.start;
        if (!element.paused) void element.play().catch(() => undefined);
      }
    } catch {
      // Alguns players impedem seeks programáticos em certos momentos.
    }
  };

  const stopLoopTicker = () => {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  };

  const loopTicker = () => {
    animationFrame = null;
    if (!state.enabled || !state.loopEnabled) return;

    for (const element of managedElements.keys()) {
      if (!element.paused && !element.ended) enforceLoopOnMedia(element);
    }
    animationFrame = requestAnimationFrame(loopTicker);
  };

  const ensureLoopTicker = () => {
    if (animationFrame === null && state.enabled && state.loopEnabled) {
      animationFrame = requestAnimationFrame(loopTicker);
    }
  };

  const applyToMedia = (element: HTMLMediaElement) => {
    if (!state.enabled) return;
    try {
      if (Math.abs(element.playbackRate - state.speed) > 0.001) element.playbackRate = state.speed;
      element.defaultPlaybackRate = state.speed;
      if ("preservesPitch" in element) element.preservesPitch = state.preservePitch;
      if ("webkitPreservesPitch" in element) (element as any).webkitPreservesPitch = state.preservePitch;
      enforceLoopOnMedia(element);
    } catch {
      // Alguns players protegem suas propriedades; os demais continuam funcionando.
    }
  };

  const manageElement = (element: HTMLMediaElement) => {
    if (!managedElements.has(element)) {
      const reapply = () => queueMicrotask(() => applyToMedia(element));
      const enforceLoop = () => {
        activeMedia = element;
        enforceLoopOnMedia(element);
        ensureLoopTicker();
      };
      const markActive = () => { activeMedia = element; };
      const original: OriginalMediaState = {
        playbackRate: element.playbackRate,
        defaultPlaybackRate: element.defaultPlaybackRate,
        reapply,
        enforceLoop,
        markActive,
      };
      if ("preservesPitch" in element) original.preservesPitch = element.preservesPitch;
      if ("webkitPreservesPitch" in element) original.webkitPreservesPitch = (element as any).webkitPreservesPitch;
      managedElements.set(element, original);
      element.addEventListener("play", enforceLoop);
      element.addEventListener("loadedmetadata", reapply);
      element.addEventListener("ratechange", reapply);
      element.addEventListener("timeupdate", enforceLoop);
      element.addEventListener("seeking", markActive);
      element.addEventListener("pointerdown", markActive);
    }
    applyToMedia(element);
  };

  const discoverMedia = (root: Document | Element = document) => {
    if (!state.enabled) return;
    if (root instanceof HTMLMediaElement) manageElement(root);
    for (const element of root.querySelectorAll<HTMLMediaElement>("audio, video")) manageElement(element);
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) discoverMedia(node as Element);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const update = (nextState: any) => {
    state.enabled = true;
    state.speed = Math.min(2, Math.max(0.5, Number(nextState.speed) || 1));
    state.preservePitch = nextState.preservePitch !== false;
    state.loopEnabled = nextState.loopEnabled === true;
    state.loopStart = Math.max(0, Number(nextState.loopStart) || 0);
    state.loopEnd = Math.max(0, Number(nextState.loopEnd) || 0);
    discoverMedia();

    if (state.loopEnabled) ensureLoopTicker();
    else stopLoopTicker();
  };

  const getPosition = (): PlaybackPosition => {
    discoverMedia();
    const connectedActive = activeMedia?.isConnected ? activeMedia : null;
    const playing = [...managedElements.keys()].find((element) => !element.paused && !element.ended);
    const element = connectedActive || playing || [...managedElements.keys()].find((item) => item.isConnected) || null;

    if (!element) return { currentTime: 0, duration: null, hasMedia: false };
    activeMedia = element;
    return {
      currentTime: Number.isFinite(element.currentTime) ? element.currentTime : 0,
      duration: Number.isFinite(element.duration) ? element.duration : null,
      hasMedia: true,
    };
  };

  const release = () => {
    state.enabled = false;
    stopLoopTicker();
    activeMedia = null;
    for (const [element, original] of managedElements) {
      element.removeEventListener("play", original.enforceLoop);
      element.removeEventListener("loadedmetadata", original.reapply);
      element.removeEventListener("ratechange", original.reapply);
      element.removeEventListener("timeupdate", original.enforceLoop);
      element.removeEventListener("seeking", original.markActive);
      element.removeEventListener("pointerdown", original.markActive);
      try {
        element.playbackRate = original.playbackRate;
        element.defaultPlaybackRate = original.defaultPlaybackRate;
        if (original.preservesPitch !== undefined) element.preservesPitch = original.preservesPitch;
        if (original.webkitPreservesPitch !== undefined) (element as any).webkitPreservesPitch = original.webkitPreservesPitch;
      } catch {
        // A página pode ter removido ou bloqueado o elemento durante a captura.
      }
    }
    managedElements.clear();
  };

  return { update, release, discoverMedia, getPosition };
}
