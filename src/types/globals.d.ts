declare const React: any;
declare const ReactDOM: any;
declare const chrome: any;

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: any;
  }
}

declare interface CSSStyleDeclaration {
  colorScheme: string;
}

declare interface GlobalThis {
  __sonoraPlaybackController?: {
    update: (settings: unknown) => void;
    release: () => void;
    showFloatingPanel: (...args: any[]) => void;
    hideFloatingPanel: (panelId: string) => void;
  };
}
