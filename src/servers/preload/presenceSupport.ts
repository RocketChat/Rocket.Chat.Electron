// Pure, importable shape-check for the `Presence` module resolved by
// `tryRequireFirstOf(presenceModulePaths)` in `injected.ts`. Extracted so the
// CAPABILITY decision that ultimately drives `presenceSupported` (and
// therefore whether the tray hides presence for old/unsupported servers) has
// unit-test coverage — `injected.ts` itself cannot be imported directly by
// Jest because it has heavy top-level side effects (reassigns
// `window.Notification`, patches `navigator.clipboard`, kicks off module
// loads on import).

export type PresenceModuleShape = {
  store?: unknown;
  listen?: unknown;
  get?: unknown;
  stop?: unknown;
};

// Own-property check only: a `store`/`listen`/`get`/`stop` value that
// arrives merely inherited from the prototype chain (e.g.
// `Object.create({ listen: fn })`) must not be treated as a usable API —
// mirrors the own-property guard in `presenceSnapshot.ts`
// (`mapConnectionStatus`).
const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

export const hasUsablePresenceApi = (module: unknown): boolean => {
  if (!module || typeof module !== 'object') {
    return false;
  }

  if (!hasOwn(module, 'Presence')) {
    return false;
  }

  const resolved = (module as { Presence?: unknown }).Presence;

  if (!resolved || typeof resolved !== 'object') {
    return false;
  }

  if (!hasOwn(resolved, 'store') || !(resolved as PresenceModuleShape).store) {
    return false;
  }

  if (!hasOwn(resolved, 'listen')) {
    return false;
  }

  if (typeof (resolved as PresenceModuleShape).listen !== 'function') {
    return false;
  }

  if (!hasOwn(resolved, 'get')) {
    return false;
  }

  if (typeof (resolved as PresenceModuleShape).get !== 'function') {
    return false;
  }

  if (!hasOwn(resolved, 'stop')) {
    return false;
  }

  return typeof (resolved as PresenceModuleShape).stop === 'function';
};
