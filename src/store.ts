import { applyMiddleware, createStore, Store, compose, Middleware, Dispatch } from 'redux';

import { RootAction, ActionOf } from './actions';
import { forwardToRenderers, getInitialState, forwardToMain } from './ipc';
import { rootReducer, RootState } from './reducers';
import { Selector } from './selectors';

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

export const dispatch = (action: RootAction): void => {
  reduxStore.dispatch(action);
};

export const select = <T>(selector: Selector<T>): T =>
  selector(reduxStore.getState());

export const watch = <T>(selector: Selector<T>, watcher: (curr: T, prev: T) => void): (() => void) => {
  const initial = Symbol('initial');
  let prev: T | typeof initial = initial;

  return reduxStore.subscribe(() => {
    const curr: T = select(selector);

    if (Object.is(prev, curr)) {
      return;
    }

    prev = curr;

    watcher(curr, prev);
  });
};

export const watchAll = (pairs: [Selector<unknown>, (curr: unknown, prev: unknown) => void][]): (() => void) => {
  const unsubscribers = pairs.map(([selector, watcher]) => watch(selector, watcher));
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
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
