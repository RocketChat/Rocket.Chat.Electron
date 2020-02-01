import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import {
	LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
} from '../scripts/actions';


export function LoadingErrorView({
	reloading = false,
	url = null,
	visible = false,
}) {
	const dispatch = useDispatch();
	const { t } = useTranslation();

	const [counter, setCounter] = useState(60);

	useEffect(() => {
		if (!visible) {
			return;
		}

		setCounter(60);

		const reloadCounterStepSize = 1;
		const timer = setInterval(() => {
			setCounter((counter) => {
				counter -= reloadCounterStepSize;

				if (counter <= 0) {
					dispatch({ type: LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, payload: url });
					return 60;
				}

				return counter;
			});
		}, reloadCounterStepSize * 1000);

		return () => {
			clearInterval(timer);
		};
	}, [url, visible]);

	const handleReloadButtonClick = () => {
		dispatch({ type: LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, payload: url });
		setCounter(60);
	};

	return <div className={['webview', 'loading-error-view', visible && 'active'].filter(Boolean).join(' ')}>
		<div className='loading-error-page'>
			<h1 className='title'>
				{t('loadingError.announcement')}
			</h1>
			<h2 className='subtitle'>
				{t('loadingError.title')}
			</h2>
			<div className={['reloading-server', !reloading && 'hidden'].filter(Boolean).join(' ')}>
				<span className='dot'></span>
				<span className='dot'></span>
				<span className='dot'></span>
			</div>
			<button
				className={['button', 'primary', 'reload-button', reloading && 'hidden'].filter(Boolean).join(' ')}
				onClick={handleReloadButtonClick}
			>
				{t('loadingError.reload')} ({counter})
			</button>
		</div>
	</div>;
}
