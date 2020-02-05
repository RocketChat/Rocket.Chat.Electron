import React, { createContext, useCallback, useContext, useEffect } from 'react';

const SagaMiddlewareContext = createContext();

export const useSaga = (saga, deps) => {
	const sagaMiddleware = useContext(SagaMiddlewareContext);

	useEffect(() => {
		const task = sagaMiddleware.run(saga);
		return () => {
			task.cancel();
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);
};

export const useCallableSaga = (saga, deps) => {
	const sagaMiddleware = useContext(SagaMiddlewareContext);

	return useCallback((...args) => new Promise((resolve, reject) => {
		sagaMiddleware.run(function *() {
			try {
				resolve(yield *saga(...args));
			} catch (error) {
				reject(error);
			}
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}), deps);
};

export function SagaMiddlewareProvider({ children, sagaMiddleware }) {
	return <SagaMiddlewareContext.Provider children={children} value={sagaMiddleware} />;
}
