// The web client can call RocketChatDesktop members before the preload start
// sets the server URL and creates the renderer store. A dispatch without a
// store is dropped, and code that reads the server URL throws. Calls made in
// that window are kept here, one per key (the last value wins), and run once
// the preload marks itself ready.
const pending = new Map<string, () => void>();
let ready = false;

export const runWhenPreloadReady = (key: string, fn: () => void): void => {
  if (ready) {
    fn();
    return;
  }

  pending.set(key, fn);
};

export const markPreloadReady = (): void => {
  ready = true;
  const queued = [...pending.values()];
  pending.clear();
  queued.forEach((fn) => {
    try {
      fn();
    } catch (error) {
      console.warn('[Rocket.Chat Desktop] deferred bridge call failed', error);
    }
  });
};
