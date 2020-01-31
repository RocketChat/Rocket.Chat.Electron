import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';

export const sagaMiddleware = createSagaMiddleware();

const reducer = (state) => state;

export const store = createStore(reducer, {}, applyMiddleware(sagaMiddleware));
