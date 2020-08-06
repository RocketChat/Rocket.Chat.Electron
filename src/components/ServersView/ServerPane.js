import { Box, Button, ButtonGroup, Margins, Throbber } from '@rocket.chat/fuselage';
import { ipcRenderer } from 'electron';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import {
	LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, WEBVIEW_FOCUSED,
} from '../../actions';
import {
	ErrorPane,
	StyledWebView,
	Wrapper,
} from './styles';
import { FailureImage } from '../FailureImage';
import { EVENT_MESSAGE_BOX_BLURRED, EVENT_BROWSER_VIEW_ATTACHED } from '../../ipc';

export function ServerPane({
	lastPath,
	url,
	isSelected,
}) {
	const dispatch = useDispatch();
	const { t } = useTranslation();

	const webviewRef = useRef();
	const [webContents, setWebContents] = useState(null);

	const [isReloading, setReloading] = useState(false);
	const [isFailed, setFailed] = useState(false);

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const handleDidStartLoading = () => {
			ipcRenderer.send(EVENT_MESSAGE_BOX_BLURRED);
			setFailed(false);
		};

		webContents.addListener('did-start-loading', handleDidStartLoading);

		return () => {
			webContents.removeListener('did-start-loading', handleDidStartLoading);
		};
	}, [webContents, url, dispatch, webviewRef]);

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const handleDidFinishLoad = () => {
			setReloading(false);
		};

		webContents.addListener('did-finish-load', handleDidFinishLoad);

		return () => {
			webContents.removeListener('did-finish-load', handleDidFinishLoad);
		};
	}, [webContents, url, dispatch]);

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const handleDidFailLoad = (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
			if (errorCode === -3) {
				console.warn('Ignoring likely spurious did-fail-load with errorCode -3, cf https://github.com/electron/electron/issues/14004');
				return;
			}

			if (isMainFrame) {
				setReloading(false);
				setFailed(true);
			}
		};

		webContents.addListener('did-fail-load', handleDidFailLoad);

		return () => {
			webContents.removeListener('did-fail-load', handleDidFailLoad);
		};
	}, [webContents, url, dispatch]);

	const visible = isSelected && !isFailed;

	useEffect(() => {
		if (!webContents || !visible) {
			return;
		}

		const webview = webviewRef.current;

		const handle = () => {
			webview.focus();
		};

		handle();

		window.addEventListener('focus', handle);
		webContents.addListener('dom-ready', handle);

		return () => {
			window.removeEventListener('focus', handle);
			webContents.removeListener('dom-ready', handle);
		};
	}, [webviewRef, webContents, visible]);

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const webview = webviewRef.current;

		const handleFocus = () => {
			dispatch({ type: WEBVIEW_FOCUSED, payload: { webContentsId: webContents.id, url } });
		};

		webview.addEventListener('focus', handleFocus);

		return () => {
			webview.removeEventListener('focus', handleFocus);
		};
	}, [webviewRef, webContents, dispatch, url]);

	const [counter, setCounter] = useState(60);

	useEffect(() => {
		if (!isFailed) {
			return;
		}

		setCounter(60);

		const reloadCounterStepSize = 1;
		const timer = setInterval(() => {
			setCounter((counter) => {
				counter -= reloadCounterStepSize;

				if (counter <= 0) {
					ipcRenderer.send(LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, url);
					setReloading(true);
					return 60;
				}

				return counter;
			});
		}, reloadCounterStepSize * 1000);

		return () => {
			clearInterval(timer);
		};
	}, [dispatch, isFailed, url]);

	const handleReloadButtonClick = () => {
		ipcRenderer.send(LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, url);
		setReloading(true);
		setCounter(60);
	};

	useEffect(() => {
		webviewRef.current.addEventListener('did-attach', () => {
			const webContents = webviewRef.current.getWebContents();
			ipcRenderer.send(EVENT_BROWSER_VIEW_ATTACHED, url, webContents.id);
			setWebContents(webContents);
		});

		webviewRef.current.addEventListener('destroyed', () => {
			setWebContents(null);
		});
	}, [url]);

	useEffect(() => {
		if (!webviewRef.current.src) {
			webviewRef.current.src = lastPath || url;
		}
	}, [lastPath, url]);

	return <Wrapper isVisible={isSelected}>
		<StyledWebView ref={webviewRef} isVisible={!isFailed && !isReloading} />
		<ErrorPane isVisible={isFailed || isReloading}>
			<FailureImage style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }} />
			<Box is='section' color='alternative' display='flex' flexDirection='column' justifyContent='center' alignItems='center' zIndex={1}>
				<Margins block='x12'>
					<Box display='flex' flexDirection='column'>
						<Margins block='x8' inline='auto'>
							<Box fontScale='h1'>
								{t('loadingError.announcement')}
							</Box>

							<Box fontScale='s1'>
								{t('loadingError.title')}
							</Box>
						</Margins>
					</Box>
				</Margins>

				<Box>
					{isReloading && <Margins block='x12'>
						<Throbber inheritColor size='x16' />
					</Margins>}

					{!isReloading && <ButtonGroup align='center'>
						<Button primary onClick={handleReloadButtonClick}>
							{t('loadingError.reload')} ({counter})
						</Button>
					</ButtonGroup>}
				</Box>
			</Box>

		</ErrorPane>
	</Wrapper>;
}
