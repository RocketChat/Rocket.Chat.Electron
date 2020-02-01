import React, { createContext, useContext, useEffect } from 'react';

const SagaMiddlewareContext = createContext();

export const useSaga = (saga, deps) => {
	const sagaMiddleware = useContext(SagaMiddlewareContext);

	useEffect(() => {
		const task = sagaMiddleware.run(saga);

		return () => {
			task.cancel();
		};
	}, deps);
};

export function SagaMiddlewareProvider({ children, sagaMiddleware }) {
	return <SagaMiddlewareContext.Provider children={children} value={sagaMiddleware} />;
}
