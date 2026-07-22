interface OriginalMediaState {
  playbackRate: number;
  defaultPlaybackRate: number;
  preservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
  reapply: () => void;
}

export function createPlaybackController() {
  const managedElements = new Map<HTMLMediaElement, OriginalMediaState>();
  const state = { enabled: false, speed: 1, preservePitch: true };

  const applyToMedia = (element: HTMLMediaElement) => {
    if (!state.enabled) return;
    try {
      if (Math.abs(element.playbackRate - state.speed) > 0.001) element.playbackRate = state.speed;
      element.defaultPlaybackRate = state.speed;
      if ("preservesPitch" in element) element.preservesPitch = state.preservePitch;
      if ("webkitPreservesPitch" in element) (element as any).webkitPreservesPitch = state.preservePitch;
    } catch {
      // Alguns players protegem suas propriedades; os demais continuam funcionando.
    }
  };

  const manageElement = (element: HTMLMediaElement) => {
    if (!managedElements.has(element)) {
      const reapply = () => queueMicrotask(() => applyToMedia(element));
      const original: OriginalMediaState = {
        playbackRate: element.playbackRate,
        defaultPlaybackRate: element.defaultPlaybackRate,
        reapply,
      };
      if ("preservesPitch" in element) original.preservesPitch = element.preservesPitch;
      if ("webkitPreservesPitch" in element) original.webkitPreservesPitch = (element as any).webkitPreservesPitch;
      managedElements.set(element, original);
      element.addEventListener("play", reapply);
      element.addEventListener("loadedmetadata", reapply);
      element.addEventListener("ratechange", reapply);
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
    discoverMedia();
  };

  const release = () => {
    state.enabled = false;
    for (const [element, original] of managedElements) {
      element.removeEventListener("play", original.reapply);
      element.removeEventListener("loadedmetadata", original.reapply);
      element.removeEventListener("ratechange", original.reapply);
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

  return { update, release, discoverMedia };
}
