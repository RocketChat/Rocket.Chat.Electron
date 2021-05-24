import type { Store } from 'redux';

import type { RootAction } from './types/RootAction';
import type { RootState } from './types/RootState';

let reduxStore: Store<RootState>;

export const setReduxStore = (store: Store<RootState>): void => {
  reduxStore = store;
};

export const dispatch = <Action extends RootAction>(action: Action): void => {
  reduxStore.dispatch(action);
};

type Selector<T> = (state: RootState) => T;

export const select = <T>(selector: Selector<T>): T =>
  selector(reduxStore.getState());

export const watch = <T>(
  selector: Selector<T>,
  watcher: (curr: T, prev: T | undefined) => void
): (() => void) => {
  const initial = select(selector);
  watcher(initial, undefined);

  let prev = initial;

  return reduxStore.subscribe(() => {
    const curr: T = select(selector);

    if (Object.is(prev, curr)) {
      return;
    }

    watcher(curr, prev);

    prev = curr;
  });
};

export abstract class Service {
  private unsubscribers = new Set<() => void>();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected initialize(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected destroy(): void {}

  protected watch<T>(
    selector: Selector<T>,
    watcher: (curr: T, prev: T | undefined) => void
  ): void {
    this.unsubscribers.add(watch(selector, watcher));
  }

  public setUp(): void {
    this.initialize();
  }

  public tearDown(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.destroy();
  }
}
