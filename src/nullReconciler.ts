import type { ReactNode } from 'react';
import Reconciler from 'react-reconciler';

const emptyObject = Object.freeze({});

const nullReconciler = Reconciler({
  supportsMutation: true,
  supportsPersistence: false,
  createInstance: () => null,
  createTextInstance: () => undefined,
  appendInitialChild: () => undefined,
  finalizeInitialChildren: () => false,
  prepareUpdate: () => emptyObject,
  shouldSetTextContent: () => false,
  getRootHostContext: () => emptyObject,
  getChildHostContext: () => emptyObject,
  getPublicInstance: (instance) => instance,
  prepareForCommit: () => null,
  resetAfterCommit: () => undefined,
  preparePortalMount: () => undefined,
  now: () => Date.now(),
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: Symbol('noTimeout'),
  queueMicrotask,
  isPrimaryRenderer: true,
  appendChild: () => undefined,
  appendChildToContainer: () => undefined,
  insertBefore: () => undefined,
  insertInContainerBefore: () => undefined,
  removeChild: () => undefined,
  removeChildFromContainer: () => undefined,
  resetTextContent: () => undefined,
  commitTextUpdate: () => undefined,
  commitMount: () => undefined,
  commitUpdate: () => undefined,
  hideInstance: () => undefined,
  hideTextInstance: () => undefined,
  unhideInstance: () => undefined,
  unhideTextInstance: () => undefined,
  clearContainer: () => undefined,
  supportsHydration: false,
});

const root = nullReconciler.createContainer({}, 0, false, null);

export const render = (element: ReactNode): void => {
  nullReconciler.updateContainer(element, root, null, () => undefined);
  // nullReconciler.getPublicRootInstance(root);
};
