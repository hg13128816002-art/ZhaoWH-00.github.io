export {};

declare global {
  interface Window {
    fontsReadyPromise?: Promise<unknown>;
  }
}
