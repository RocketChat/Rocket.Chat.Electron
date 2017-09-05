// @flow
import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { createHashHistory } from 'history';
import { electronEnhancer } from 'redux-electron-store';
import { routerMiddleware } from 'react-router-redux';
import rootReducer from '../reducers';

const history = createHashHistory();

function configureStore(initialState) {
  const router = routerMiddleware(history);
  const enhancer = compose(
    applyMiddleware(thunk, router),
    electronEnhancer({
      dispatchProxy: a => store.dispatch(a)
    }));
  const store = createStore(rootReducer, initialState, enhancer);
  return store;
}

export default { configureStore, history };
