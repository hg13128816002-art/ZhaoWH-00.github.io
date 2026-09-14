export {};

declare global {
  interface Window {
    fontsReadyPromise?: Promise<unknown>;
    pageTransitionReady?: Promise<void>;
    pageTransitionContentReady?: Promise<void>;
  }
}
