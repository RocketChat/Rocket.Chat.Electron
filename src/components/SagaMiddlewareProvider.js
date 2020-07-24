import React, { createContext, useCallback, useContext, useEffect } from 'react';

const SagaMiddlewareContext = createContext();

export const useSaga = (saga, deps) => {
	const sagaMiddleware = useContext(SagaMiddlewareContext);

	const effect = () => {
		const task = sagaMiddleware.run(saga, ...deps || []);
		return () => {
			task.cancel();
		};
	};

	useEffect(effect, deps); // eslint-disable-line react-hooks/exhaustive-deps
};

export const useCallableSaga = (saga, deps) => {
	const sagaMiddleware = useContext(SagaMiddlewareContext);

	const callback = (...args) => new Promise((resolve, reject) => {
		sagaMiddleware.run(function *() {
			try {
				resolve(yield *saga(...args));
			} catch (error) {
				reject(error);
			}
		});
	});

	return useCallback(callback, deps); // eslint-disable-line react-hooks/exhaustive-deps
};

export function SagaMiddlewareProvider({ children, sagaMiddleware }) {
	return <SagaMiddlewareContext.Provider children={children} value={sagaMiddleware} />;
}
