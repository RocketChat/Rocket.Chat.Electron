import React, { useState, useRef, useEffect } from 'react';
import { takeEvery } from 'redux-saga/effects';
import { remote } from 'electron';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import {
	WEBVIEW_LOADING_STARTED,
	WEBVIEW_LOADING_DONE,
	WEBVIEW_LOADING_FAILED,
	WEBVIEW_CERTIFICATE_DENIED,
	LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
} from '../../actions';
import { useSaga } from '../SagaMiddlewareProvider';
import { useWebviewFocus } from './useWebviewFocus';
import { useWebviewContextMenu } from './useWebviewContextMenu';
import { useWebviewPreload } from './useWebviewPreload';
import { useWebviewNavigation } from './useWebviewNavigation';
import {
	Announcement,
	ErrorPane,
	LoadingErrorPage,
	LoadingIndicator,
	LoadingIndicatorDot,
	ReloadButton,
	StyledWebView,
	Title,
} from './styles';

export function ServerPane({
	lastPath,
	url,
	isFull,
	isSelected,
}) {
	const [isReloading, setReloading] = useState(false);
	const [isFailed, setFailed] = useState(false);

	useSaga(function *() {
		yield takeEvery(WEBVIEW_LOADING_STARTED, function *({ payload: { url: _url } }) {
			if (url !== _url) {
				return;
			}

			setReloading(true);
			setFailed(false);
		});

		yield takeEvery(WEBVIEW_LOADING_DONE, function *({ payload: { url: _url } }) {
			if (url !== _url) {
				return;
			}

			setReloading(false);
			setFailed(false);
		});

		yield takeEvery([WEBVIEW_LOADING_FAILED, WEBVIEW_CERTIFICATE_DENIED], function *({ payload: { url: _url } }) {
			if (url !== _url) {
				return;
			}

			setReloading(false);
			setFailed(true);
		});
	}, [url]);

	const webviewRef = useRef();
	const [webContents, setWebContents] = useState(null);

	useEffect(() => {
		const webview = webviewRef.current;

		const handleDidAttach = () => {
			setWebContents(webview.getWebContents());
		};

		const handleDestroyed = () => {
			setWebContents(null);
		};

		webview.addEventListener('did-attach', handleDidAttach);
		webview.addEventListener('destroyed', handleDestroyed);

		return () => {
			webview.removeEventListener('did-attach', handleDidAttach);
			webview.removeEventListener('destroyed', handleDestroyed);
		};
	}, [webviewRef]);

	useWebviewFocus(webviewRef, webContents, { url, active: isSelected, failed: isFailed, hasSidebar: !isFull });
	useWebviewContextMenu(webviewRef, webContents, { url, active: isSelected, failed: isFailed, hasSidebar: !isFull });
	useWebviewPreload(webviewRef, webContents, { url, active: isSelected, failed: isFailed, hasSidebar: !isFull });
	useWebviewNavigation(webviewRef, webContents, { url, active: isSelected, failed: isFailed, hasSidebar: !isFull });

	useEffect(() => {
		const webview = webviewRef.current;
		webview.src = lastPath || url;
	}, [webviewRef, lastPath, url]);

	const dispatch = useDispatch();
	const { t } = useTranslation();

	const [counter, setCounter] = useState(60);

	useEffect(() => {
		if (!isSelected || !isFailed) {
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
	}, [dispatch, isFailed, isSelected, url]);

	const handleReloadButtonClick = () => {
		dispatch({ type: LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, payload: url });
		setCounter(60);
	};

	return <>
		<StyledWebView
			ref={webviewRef}
			allowpopups='allowpopups'
			disablewebsecurity='disablewebsecurity'
			enableremotemodule='true'
			preload={ `${ remote.app.getAppPath() }/app/preload.js` }
			isFull={isFull}
			isSelected={isSelected}
			isFailed={isFailed}
			hasWebContents={!!webContents}
		/>
		<ErrorPane isFull={isFull} isSelected={isSelected} isFailed={isFailed}>
			<LoadingErrorPage>
				<Announcement>
					{t('loadingError.announcement')}
				</Announcement>
				<Title>
					{t('loadingError.title')}
				</Title>

				{isReloading && <LoadingIndicator>
					<LoadingIndicatorDot />
					<LoadingIndicatorDot />
					<LoadingIndicatorDot />
				</LoadingIndicator>}

				{!isReloading && <ReloadButton onClick={handleReloadButtonClick}>
					{t('loadingError.reload')} ({counter})
				</ReloadButton>}
			</LoadingErrorPage>
		</ErrorPane>
	</>;
}
