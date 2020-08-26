import { applyMiddleware, createStore, Store, compose, Middleware, Dispatch } from 'redux';

import { SideEffectAction } from './actions';
import { forwardToRenderers, getInitialState, forwardToMain } from './ipc';
import { rootReducer } from './reducers';

type RootState = ReturnType<typeof rootReducer>;
type RootAction = Parameters<typeof rootReducer>[1];
type GenericAction = RootAction | SideEffectAction;
type RootSelector<T> = (state: RootState) => T;

let reduxStore: Store<RootState>;

export const getReduxStore = (): Store<RootState> =>
  reduxStore;

let lastAction: GenericAction;

const catchLastAction: Middleware = () =>
  (next: Dispatch<GenericAction>) =>
    (action) => {
      lastAction = action;
      return next(action);
    };

export const createMainReduxStore = (): void => {
  const middlewares = applyMiddleware(catchLastAction, forwardToRenderers);

  reduxStore = createStore(rootReducer, {}, middlewares);
};

export const createRendererReduxStore = async (): Promise<void> => {
  const initialState = await getInitialState();
  const composeEnhancers: typeof compose = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const enhancers = composeEnhancers(applyMiddleware(forwardToMain, catchLastAction));

  reduxStore = createStore(rootReducer, initialState, enhancers);
};

export const dispatch = (action: GenericAction): void => {
  reduxStore.dispatch(action);
};

export const select = <T>(selector: RootSelector<T>): T =>
  selector(reduxStore.getState());

export const watch = <T>(selector: RootSelector<T>, watcher: (curr: T, prev: T) => void): (() => void) => {
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

export const watchAll = (pairs: [RootSelector<unknown>, (curr: unknown, prev: unknown) => void][]): (() => void) => {
  const unsubscribers = pairs.map(([selector, watcher]) => watch(selector, watcher));
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};

export const listen = <A extends GenericAction = GenericAction>(
  predicate: GenericAction['type'] | ((action: GenericAction) => boolean),
  listener: (action: A) => void,
): (() => void) => {
  const effectivePredicate = typeof predicate === 'function'
    ? (action: GenericAction): action is A => predicate(action)
    : (action: GenericAction): action is A => action?.type === predicate;

  return reduxStore.subscribe(() => {
    if (!effectivePredicate(lastAction)) {
      return;
    }

    listener(lastAction);
  });
};

export const request = <Res extends GenericAction = GenericAction>(requestAction: GenericAction): Promise<Res['payload']> =>
  new Promise<Res['payload']>((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);

    const isResponse = (action: GenericAction): action is Res =>
      action.meta?.response && action.meta?.id === id;

    const unsubscribe = listen(isResponse, (action: Res) => {
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
