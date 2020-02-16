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
	onClose,
	onConsoleMessage,
	onCrashed,
	onDestroyed,
	onDevtoolsClosed,
	onDevtoolsFocused,
	onDevtoolsOpened,
	onDidAttach,
	onDidChangeThemeColor,
	onDidFailLoad,
	onDidFinishLoad,
	onDidFrameFinishLoad,
	onDidNavigate,
	onDidNavigateInPage,
	onDidStartLoading,
	onDidStopLoading,
	onDomReady,
	onEnterHtmlFullScreen,
	onFoundInPage,
	onIpcMessage,
	onLeaveHtmlFullScreen,
	onLoadCommit,
	onMediaPaused,
	onMediaStartedPlaying,
	onNewWindow,
	onPageFaviconUpdated,
	onPageTitleUpdated,
	onPluginCrashed,
	onUpdateTargetUrl,
	onWillNavigate,
}, ref) {
	const innerRef = useRef();
	const mergedRef = useMergedRefs(ref, innerRef);

	const eventsRef = useRef({});
	useLayoutEffect(() => {
		eventsRef.current = {
			close: onClose,
			'console-message': onConsoleMessage,
			crashed: onCrashed,
			destroyed: onDestroyed,
			'devtools-closed': onDevtoolsClosed,
			'devtools-focused': onDevtoolsFocused,
			'devtools-opened': onDevtoolsOpened,
			'did-attach': onDidAttach,
			'did-change-theme-color': onDidChangeThemeColor,
			'did-fail-load': onDidFailLoad,
			'did-finish-load': onDidFinishLoad,
			'did-frame-finish-load': onDidFrameFinishLoad,
			'did-navigate-in-page': onDidNavigateInPage,
			'did-navigate': onDidNavigate,
			'did-start-loading': onDidStartLoading,
			'did-stop-loading': onDidStopLoading,
			'dom-ready': onDomReady,
			'enter-html-full-screen': onEnterHtmlFullScreen,
			'found-in-page': onFoundInPage,
			'ipc-message': onIpcMessage,
			'leave-html-full-screen': onLeaveHtmlFullScreen,
			'load-commit': onLoadCommit,
			'media-paused': onMediaPaused,
			'media-started-playing': onMediaStartedPlaying,
			'new-window': onNewWindow,
			'page-favicon-updated': onPageFaviconUpdated,
			'page-title-updated': onPageTitleUpdated,
			'plugin-crashed': onPluginCrashed,
			'update-target-url': onUpdateTargetUrl,
			'will-navigate': onWillNavigate,
		};
	}, [
		onClose,
		onConsoleMessage,
		onCrashed,
		onDestroyed,
		onDevtoolsClosed,
		onDevtoolsFocused,
		onDevtoolsOpened,
		onDidAttach,
		onDidChangeThemeColor,
		onDidFailLoad,
		onDidFinishLoad,
		onDidFrameFinishLoad,
		onDidNavigate,
		onDidNavigateInPage,
		onDidStartLoading,
		onDidStopLoading,
		onDomReady,
		onEnterHtmlFullScreen,
		onFoundInPage,
		onIpcMessage,
		onLeaveHtmlFullScreen,
		onLoadCommit,
		onMediaPaused,
		onMediaStartedPlaying,
		onNewWindow,
		onPageFaviconUpdated,
		onPageTitleUpdated,
		onPluginCrashed,
		onUpdateTargetUrl,
		onWillNavigate,
	]);

	useLayoutEffect(() => {
		for (const eventName of Object.keys(eventsRef.current)) {
			const listener = (...args) => eventsRef.current[eventName] && (0, eventsRef.current[eventName])(...args);
			innerRef.current.addEventListener(eventName, listener);
		}
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
