import i18n from 'i18next';
import React, { useState, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';

import { createReduxStore } from '../rootWindow/reduxStore';
import { MainWindow } from './MainWindow';
import { Shell } from './Shell';
import { ErrorCatcher } from './utils/ErrorCatcher';

export function App() {
	const [store, setStore] = useState();

	useEffect(() => {
		createReduxStore().then(setStore);
	}, []);

	return <ErrorCatcher>
		{store && <Provider store={store}>
			<I18nextProvider i18n={i18n}>
				<MainWindow>
					<Shell />
				</MainWindow>
			</I18nextProvider>
		</Provider>}
	</ErrorCatcher>;
}
