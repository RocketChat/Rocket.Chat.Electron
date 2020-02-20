import { useMergedRefs } from '@rocket.chat/fuselage-hooks';
import React, { forwardRef, useRef, useLayoutEffect } from 'react';

export const WebViewComponent = forwardRef(function WebViewComponent({
	className,
	src,
	nodeIntegration = false,
	nodeIntegrationInSubframes = false,
	remoteModule = false,
	plugins = false,
	preload,
	httpReferrer,
	userAgent,
	webSecurity = true,
	partition,
	popups,
	webPreferences = {},
	blinkFeatures = {},

	onFocus,
	onBlur,
	onWebContentsChange,

	onDidFinishLoad,
	onDidFailLoad,
	onDidFailProvisionalLoad,
	onDidFrameFinishLoad,
	onDidStartLoading,
	onDidStopLoading,
	onDomReady,
	onPageTitleUpdated,
	onPageFaviconUpdated,
	onNewWindow,
	onWillNavigate,
	onDidStartNavigation,
	onWillRedirect,
	onDidRedirectNavigation,
	onDidNavigate,
	onDidFrameNavigate,
	onDidNavigateInPage,
	onWillPreventUnload,
	onCrashed,
	onUnresponsive,
	onResponsive,
	onPluginCrashed,
	onDestroyed,
	onBeforeInputEvent,
	onEnterHtmlFullScreen,
	onLeaveHtmlFullScreen,
	onZoomChanged,
	onDevtoolsOpened,
	onDevtoolsClosed,
	onDevtoolsFocused,
	onCertificateError,
	onSelectClientCertificate,
	onLogin,
	onFoundInPage,
	onMediaStartedPlaying,
	onMediaPaused,
	onDidChangeThemeColor,
	onUpdateTargetUrl,
	onCursorChanged,
	onContextMenu,
	onSelectBluetoothDevice,
	onPaint,
	onDevtoolsReloadPage,
	onWillAttachWebview,
	onDidAttachWebview,
	onConsoleMessage,
	onPreloadError,
	onIpcMessage,
	onIpcMessageSync,
	onDesktopCapturerGetSources,
	onRemoteRequire,
	onRemoteGetGlobal,
	onRemoteGetBuiltin,
	onRemoteGetCurrentWindow,
	onRemoteGetCurrentWebContents,
	onRemoteGetGuestWebContents,
}, ref) {
	const innerRef = useRef();
	const mergedRef = useMergedRefs(ref, innerRef);

	const webviewEventsRef = useRef({});
	useLayoutEffect(() => {
		webviewEventsRef.current = {
			focus: onFocus,
			blur: onBlur,
		};
	}, [onBlur, onFocus]);

	useLayoutEffect(() => {
		for (const eventName of Object.keys(webviewEventsRef.current)) {
			innerRef.current.addEventListener(
				eventName,
				(...args) => webviewEventsRef.current[eventName]
					&& (0, webviewEventsRef.current[eventName])(...args),
			);
		}
	}, []);

	const webContentsChangeEventRef = useRef();
	useLayoutEffect(() => {
		webContentsChangeEventRef.current = onWebContentsChange;
	}, [onWebContentsChange]);

	const webContentsEventsRef = useRef({});
	useLayoutEffect(() => {
		webContentsEventsRef.current = {
			'did-finish-load': onDidFinishLoad,
			'did-fail-load': onDidFailLoad,
			'did-fail-provisional-load': onDidFailProvisionalLoad,
			'did-frame-finish-load': onDidFrameFinishLoad,
			'did-start-loading': onDidStartLoading,
			'did-stop-loading': onDidStopLoading,
			'dom-ready': onDomReady,
			'page-title-updated': onPageTitleUpdated,
			'page-favicon-updated': onPageFaviconUpdated,
			'new-window': onNewWindow,
			'will-navigate': onWillNavigate,
			'did-start-navigation': onDidStartNavigation,
			'will-redirect': onWillRedirect,
			'did-redirect-navigation': onDidRedirectNavigation,
			'did-navigate': onDidNavigate,
			'did-frame-navigate': onDidFrameNavigate,
			'did-navigate-in-page': onDidNavigateInPage,
			'will-prevent-unload': onWillPreventUnload,
			crashed: onCrashed,
			unresponsive: onUnresponsive,
			responsive: onResponsive,
			'plugin-crashed': onPluginCrashed,
			destroyed: onDestroyed,
			'before-input-event': onBeforeInputEvent,
			'enter-html-full-screen': onEnterHtmlFullScreen,
			'leave-html-full-screen': onLeaveHtmlFullScreen,
			'zoom-changed': onZoomChanged,
			'devtools-opened': onDevtoolsOpened,
			'devtools-closed': onDevtoolsClosed,
			'devtools-focused': onDevtoolsFocused,
			'certificate-error': onCertificateError,
			'select-client-certificate': onSelectClientCertificate,
			login: onLogin,
			'found-in-page': onFoundInPage,
			'media-started-playing': onMediaStartedPlaying,
			'media-paused': onMediaPaused,
			'did-change-theme-color': onDidChangeThemeColor,
			'update-target-url': onUpdateTargetUrl,
			'cursor-changed': onCursorChanged,
			'context-menu': onContextMenu,
			'select-bluetooth-device': onSelectBluetoothDevice,
			paint: onPaint,
			'devtools-reload-page': onDevtoolsReloadPage,
			'will-attach-webview': onWillAttachWebview,
			'did-attach-webview': onDidAttachWebview,
			'console-message': onConsoleMessage,
			'preload-error': onPreloadError,
			'ipc-message': onIpcMessage,
			'ipc-message-sync': onIpcMessageSync,
			'desktop-capturer-get-sources': onDesktopCapturerGetSources,
			'remote-require': onRemoteRequire,
			'remote-get-global': onRemoteGetGlobal,
			'remote-get-builtin': onRemoteGetBuiltin,
			'remote-get-current-window': onRemoteGetCurrentWindow,
			'remote-get-current-web-contents': onRemoteGetCurrentWebContents,
			'remote-get-guest-web-contents': onRemoteGetGuestWebContents,
		};
	}, [
		onBeforeInputEvent,
		onCertificateError,
		onConsoleMessage,
		onContextMenu,
		onCrashed,
		onCursorChanged,
		onDesktopCapturerGetSources,
		onDestroyed,
		onDevtoolsClosed,
		onDevtoolsFocused,
		onDevtoolsOpened,
		onDevtoolsReloadPage,
		onDidAttachWebview,
		onDidChangeThemeColor,
		onDidFailLoad,
		onDidFailProvisionalLoad,
		onDidFinishLoad,
		onDidFrameFinishLoad,
		onDidFrameNavigate,
		onDidNavigate,
		onDidNavigateInPage,
		onDidRedirectNavigation,
		onDidStartLoading,
		onDidStartNavigation,
		onDidStopLoading,
		onDomReady,
		onEnterHtmlFullScreen,
		onFoundInPage,
		onIpcMessage,
		onIpcMessageSync,
		onLeaveHtmlFullScreen,
		onLogin,
		onMediaPaused,
		onMediaStartedPlaying,
		onNewWindow,
		onPageFaviconUpdated,
		onPageTitleUpdated,
		onPaint,
		onPluginCrashed,
		onPreloadError,
		onRemoteGetBuiltin,
		onRemoteGetCurrentWebContents,
		onRemoteGetCurrentWindow,
		onRemoteGetGlobal,
		onRemoteGetGuestWebContents,
		onRemoteRequire,
		onResponsive,
		onSelectBluetoothDevice,
		onSelectClientCertificate,
		onUnresponsive,
		onUpdateTargetUrl,
		onWillAttachWebview,
		onWillNavigate,
		onWillPreventUnload,
		onWillRedirect,
		onZoomChanged,
	]);

	const webContentsRef = useRef(null);

	useLayoutEffect(() => {
		innerRef.current.addEventListener('did-attach', () => {
			const webContents = innerRef.current.getWebContents();
			webContentsRef.current = webContents;

			for (const eventName of Object.keys(webContentsEventsRef.current)) {
				webContents.addListener(
					eventName,
					(...args) => {
						webContentsEventsRef.current[eventName]
						&& (0, webContentsEventsRef.current[eventName])(...args);
					},
				);
			}

			webContentsChangeEventRef.current && (0, webContentsChangeEventRef.current)(webContents);
		});

		innerRef.current.addEventListener('destroyed', () => {
			webContentsRef.current = null;
			webContentsChangeEventRef.current && (0, webContentsChangeEventRef.current)(null);
		});
	}, []);

	useLayoutEffect(() => {
		innerRef.current.src = src;
	}, [src]);

	return <webview
		ref={mergedRef}
		className={className}
		nodeintegration={nodeIntegration ? 'nodeintegration' : undefined}
		nodeintegrationinsubframes={nodeIntegrationInSubframes ? 'nodeintegrationinsubframes' : undefined}
		enableremotemodule={remoteModule ? 'true' : 'false'}
		plugins={plugins ? 'plugins' : undefined}
		preload={preload}
		httpreferrer={httpReferrer}
		useragent={userAgent}
		disablewebsecurity={webSecurity ? undefined : 'disablewebsecurity'}
		partition={partition}
		allowpopups={popups ? 'allowpopups' : undefined}
		webpreferences={Object.entries(webPreferences)
			.map(([key, value]) => `${ key }=${ value ? 'yes' : 'no' }`)
			.join(', ')}
		enableblinkfeatures={Object.entries(blinkFeatures)
			.filter(([, value]) => value)
			.map(([key]) => key)
			.join(', ')}
		disabledblinkfeatures={Object.entries(blinkFeatures)
			.filter(([, value]) => !value)
			.map(([key]) => key)
			.join(', ')}
	/>;
});
