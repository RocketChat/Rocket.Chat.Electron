import { Box, Button, ButtonGroup, Flex, Margins } from '@rocket.chat/fuselage';
import { remote } from 'electron';
import React, { useState, useRef, useEffect } from 'react';
import { takeEvery } from 'redux-saga/effects';
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
	ErrorPane,
	LoadingIndicator,
	LoadingIndicatorDot,
	StyledWebView,
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

	const handleDidAttach = () => {
		setWebContents(webviewRef.current.getWebContents());
	};

	const handleDestroyed = () => {
		setWebContents(null);
	};

	useWebviewFocus(webviewRef, webContents, { url, active: isSelected, failed: isFailed, hasSidebar: !isFull });
	useWebviewContextMenu(webviewRef, webContents, { url, active: isSelected, failed: isFailed, hasSidebar: !isFull });
	useWebviewPreload(webviewRef, webContents, { url, active: isSelected, failed: isFailed, hasSidebar: !isFull });
	useWebviewNavigation(webviewRef, webContents, { url, active: isSelected, failed: isFailed, hasSidebar: !isFull });

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
			src={lastPath || url}
			popups
			webSecurity={false}
			remoteModule
			preload={`${ remote.app.getAppPath() }/app/preload.js`}
			isFull={isFull}
			isSelected={isSelected}
			isFailed={isFailed}
			hasWebContents={!!webContents}
			onDidAttach={handleDidAttach}
			onDestroyed={handleDestroyed}
		/>
		<ErrorPane isFull={isFull} isSelected={isSelected} isFailed={isFailed}>
			<Flex.Container direction='column' justifyContent='center' alignItems='center'>
				<Box is='section'>
					<Flex.Item>
						<Flex.Container direction='column'>
							<Margins block='x12'>
								<Box>
									<Margins block='x8' inline='auto'>
										<Box textStyle='h1' textColor='alternative'>
											{t('loadingError.announcement')}
										</Box>

										<Box textStyle='s1' textColor='alternative'>
											{t('loadingError.title')}
										</Box>
									</Margins>
								</Box>
							</Margins>

							{isReloading && <LoadingIndicator>
								<LoadingIndicatorDot />
								<LoadingIndicatorDot />
								<LoadingIndicatorDot />
							</LoadingIndicator>}

							{!isReloading && <ButtonGroup align='center'>
								<Button primary onClick={handleReloadButtonClick}>
									{t('loadingError.reload')} ({counter})
								</Button>
							</ButtonGroup>}
						</Flex.Container>
					</Flex.Item>
				</Box>
			</Flex.Container>
		</ErrorPane>
	</>;
}
