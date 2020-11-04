import { applyMiddleware, createStore, Store, compose, Middleware, Dispatch } from 'redux';

import { RootAction, ActionOf } from './actions';
import { forwardToRenderers, getInitialState, forwardToMain } from './ipc';
import { rootReducer, RootState } from './rootReducer';

let reduxStore: Store<RootState>;

let lastAction: RootAction;

const catchLastAction: Middleware = () =>
  (next: Dispatch<RootAction>) =>
    (action) => {
      lastAction = action;
      return next(action);
    };

export const createMainReduxStore = (): void => {
  const middlewares = applyMiddleware(catchLastAction, forwardToRenderers);

  reduxStore = createStore(rootReducer, {}, middlewares);
};

export const createRendererReduxStore = async (): Promise<Store> => {
  const initialState = await getInitialState();
  const composeEnhancers: typeof compose = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const enhancers = composeEnhancers(applyMiddleware(forwardToMain, catchLastAction));

  reduxStore = createStore(rootReducer, initialState, enhancers);

  return reduxStore;
};

export const dispatch = <T extends RootAction['type']>(action: ActionOf<T>): void => {
  reduxStore.dispatch(action);
};

type Selector<T> = (state: RootState) => T;

export const select = <T>(selector: Selector<T>): T =>
  selector(reduxStore.getState());

export const watch = <T>(selector: Selector<T>, watcher: (curr: T, prev: T) => void): (() => void) => {
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

export const listen = <T extends RootAction['type']>(
  predicate: T | ((action: ActionOf<T>) => boolean),
  listener: (action: ActionOf<T>) => void,
): (() => void) => {
  const effectivePredicate = typeof predicate === 'function'
    ? (action: ActionOf<T>): action is ActionOf<T> => predicate(action)
    : (action: ActionOf<T>): action is ActionOf<T> => action?.type === predicate;

  return reduxStore.subscribe(() => {
    if (!effectivePredicate(lastAction as ActionOf<T>)) {
      return;
    }

    listener(lastAction as ActionOf<T>);
  });
};

export abstract class Service {
  private unsubscribers = new Set<() => void>()

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected initialize(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected destroy(): void {}

  protected watch<T>(
    selector: Selector<T>,
    watcher: (curr: T, prev: T) => void,
  ): void {
    this.unsubscribers.add(watch(selector, watcher));
  }

  protected listen<T extends RootAction['type']>(
    predicate: T | ((action: ActionOf<T>) => boolean),
    listener: (action: ActionOf<T>) => void,
  ): void {
    this.unsubscribers.add(listen(predicate, listener));
  }

  public setUp(): void {
    this.initialize();
  }

  public tearDown(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.destroy();
  }
}

export const request = <
  ReqT extends RootAction['type'],
  ResT extends RootAction['type'],
>(requestAction: ActionOf<ReqT>): Promise<ActionOf<ResT>['payload']> =>
  new Promise<ActionOf<ResT>['payload']>((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);

    const isResponse = (action: ActionOf<ResT>): action is ActionOf<ResT> =>
      action.meta?.response && action.meta?.id === id;

    const unsubscribe = listen(isResponse, (action: ActionOf<ResT>) => {
      unsubscribe();

      if (action.error) {
        reject(action.payload);
        return;
      }

      resolve(action.payload);
    });

    dispatch({
      ...requestAction,
      meta: {
        request: true,
        id,
      },
    });
  });
