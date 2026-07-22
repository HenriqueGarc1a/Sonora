(() => {
  if (globalThis.__sonoraPlaybackController) {
    return;
  }

  const managedElements = new WeakSet();
  const state = {
    speed: 1,
    preservePitch: true,
  };

  function applyToMedia(element) {
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
      managedElements.add(element);
      const reapply = () => queueMicrotask(() => applyToMedia(element));
      element.addEventListener("play", reapply);
      element.addEventListener("loadedmetadata", reapply);
      element.addEventListener("ratechange", reapply);
    }
    applyToMedia(element);
  }

  function discoverMedia(root = document) {
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
      state.speed = Math.min(2, Math.max(0.5, Number(nextState.speed) || 1));
      state.preservePitch = nextState.preservePitch !== false;
      discoverMedia();
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
    }

    return false;
  });

  discoverMedia();
})();
