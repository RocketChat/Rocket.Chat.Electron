import i18n from 'i18next';
import React, { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider, useDispatch } from 'react-redux';

import { MainWindow } from './MainWindow';
import { createReduxStoreAndSagaMiddleware } from '../storeAndEffects';
import { SagaMiddlewareProvider } from './SagaMiddlewareProvider';
import { Shell } from './Shell';
import { ErrorCatcher } from './utils/ErrorCatcher';

function AppContent() {
	window.dispatch = useDispatch();

	return <MainWindow>
		<Shell />
	</MainWindow>;
}

export function App() {
	const [[store, sagaMiddleware]] = useState(() => createReduxStoreAndSagaMiddleware());

	return <ErrorCatcher>
		<Provider store={store}>
			<SagaMiddlewareProvider sagaMiddleware={sagaMiddleware}>
				<I18nextProvider i18n={i18n}>
					<AppContent />
				</I18nextProvider>
			</SagaMiddlewareProvider>
		</Provider>
	</ErrorCatcher>;
}
