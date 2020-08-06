import i18n from 'i18next';
import React, { useRef } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';

import { MainWindow } from './MainWindow';
import { createReduxStore } from '../rootWindow/reduxStore';
import { Shell } from './Shell';
import { ErrorCatcher } from './utils/ErrorCatcher';

export function App() {
	const storeRef = useRef();

	const getStore = () => {
		if (!storeRef.current) {
			storeRef.current = createReduxStore();
		}

		return storeRef.current;
	};

	return <ErrorCatcher>
		<Provider store={getStore()}>
			<I18nextProvider i18n={i18n}>
				<MainWindow>
					<Shell />
				</MainWindow>
			</I18nextProvider>
		</Provider>
	</ErrorCatcher>;
}
