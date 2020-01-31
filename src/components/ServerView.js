import React, { useState } from 'react';

import { LoadingErrorView } from './LoadingErrorView';
import { WebUiView } from './WebUiView';

export function ServerView({
	active = false,
	hasSidebar = false,
	lastPath,
	url,
	dispatch,
	subscribe,
}) {
	const [failed, setFailed] = useState(false);
	const [reloading, setReloading] = useState(false);

	return <>
		<WebUiView
			active={active}
			failed={failed}
			hasSidebar={hasSidebar}
			lastPath={lastPath}
			url={url}
			dispatch={dispatch}
			subscribe={subscribe}
			onLoad={() => {
				setReloading(false);
			}}
			onFail={() => {
				setFailed(true);
			}}
		/>
		<LoadingErrorView
			visible={active && failed}
			counting={active && failed}
			reloading={reloading}
			onReload={() => {
				setFailed(false);
				setReloading(true);
			}}
		/>
	</>;
}
