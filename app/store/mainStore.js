import { createStore, compose } from 'redux';
import { electronEnhancer } from 'redux-electron-store';
import rootReducer from '../reducers';

const initialState = undefined;
const enhancer = compose(
  // Must be placed after any enhancers which dispatch
  // their own actions such as redux-thunk or redux-saga
  electronEnhancer({
    // Necessary for synched actions to pass through all enhancers
    dispatchProxy: a => store.dispatch(a),
  })
);

// Note: passing enhancer as the last argument to createStore requires redux@>=3.1.0
const store = createStore(rootReducer, initialState, enhancer);
export default store;
