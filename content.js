(() => {
  if (globalThis.__sonoraPlaybackController) {
    return;
  }

  const managedElements = new Map();
  const state = {
    enabled: false,
    speed: 1,
    preservePitch: true,
  };

  function applyToMedia(element) {
    if (!state.enabled) {
      return;
    }

    try {
      if (Math.abs(element.playbackRate - state.speed) > 0.001) {
        element.playbackRate = state.speed;
      }
      element.defaultPlaybackRate = state.speed;

      if ("preservesPitch" in element) {
        element.preservesPitch = state.preservePitch;
      }
      if ("webkitPreservesPitch" in element) {
        element.webkitPreservesPitch = state.preservePitch;
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

      if ("preservesPitch" in element) {
        original.preservesPitch = element.preservesPitch;
      }
      if ("webkitPreservesPitch" in element) {
        original.webkitPreservesPitch = element.webkitPreservesPitch;
      }

      managedElements.set(element, original);
      element.addEventListener("play", reapply);
      element.addEventListener("loadedmetadata", reapply);
      element.addEventListener("ratechange", reapply);
    }
    applyToMedia(element);
  }

  function discoverMedia(root = document) {
    if (!state.enabled) {
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

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  globalThis.__sonoraPlaybackController = {
    update(nextState) {
      state.enabled = true;
      state.speed = Math.min(2, Math.max(0.5, Number(nextState.speed) || 1));
      state.preservePitch = nextState.preservePitch !== false;
      discoverMedia();
    },
    release() {
      state.enabled = false;

      for (const [element, original] of managedElements) {
        element.removeEventListener("play", original.reapply);
        element.removeEventListener("loadedmetadata", original.reapply);
        element.removeEventListener("ratechange", original.reapply);

        try {
          element.playbackRate = original.playbackRate;
          element.defaultPlaybackRate = original.defaultPlaybackRate;
          if ("preservesPitch" in original) {
            element.preservesPitch = original.preservesPitch;
          }
          if ("webkitPreservesPitch" in original) {
            element.webkitPreservesPitch = original.webkitPreservesPitch;
          }
        } catch {
          // A página pode ter removido ou bloqueado o elemento durante a captura.
        }
      }

      managedElements.clear();
    },
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.target !== "content") {
      return false;
    }

    if (message.type === "PING") {
      sendResponse({ ready: true });
      return false;
    }

    if (message.type === "APPLY_PLAYBACK_SETTINGS") {
      globalThis.__sonoraPlaybackController.update(message);
      sendResponse({ applied: true });
      return false;
    }

    if (message.type === "RESET_PLAYBACK_SETTINGS") {
      globalThis.__sonoraPlaybackController.release();
      sendResponse({ applied: true });
    }

    return false;
  });

  discoverMedia();
})();
