import React, { createContext, useContext, useEffect } from 'react';

const SagaMiddlewareContext = createContext();

export const useSaga = (saga, deps) => {
	const sagaMiddleware = useContext(SagaMiddlewareContext);

	useEffect(() => {
		const task = sagaMiddleware.run(saga);
		const cleanUp = ::task.cancel;
		window.addEventListener('beforeunload', cleanUp);
		return cleanUp;
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);
};

export function SagaMiddlewareProvider({ children, sagaMiddleware }) {
	return <SagaMiddlewareContext.Provider children={children} value={sagaMiddleware} />;
}
