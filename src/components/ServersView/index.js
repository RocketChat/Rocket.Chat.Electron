import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { ServerPane } from './ServerPane';

export function ServersView({
	servers = [],
	currentServerUrl,
	hasSidebar = true,
}) {
	const containerRef = useRef();
	const pairsRef = useRef([]);
	const [pairs, setPairs] = useState(pairsRef.current);

	useEffect(() => {
		const pairs = pairsRef.current;

		const prevServersUrls = pairs.map(([{ url }]) => url);
		const serversUrls = servers.map(({ url }) => url);

		const removedNodes = pairs.filter(([{ url }]) => !serversUrls.includes(url)).map(([, node]) => node);
		setTimeout(() => {
			removedNodes.forEach((node) => node.remove());
		}, 1000);

		pairsRef.current = [
			...pairs.filter(([{ url }]) => serversUrls.includes(url)),
			...servers.filter(({ url }) => !prevServersUrls.includes(url)).map((server) => {
				const node = document.createElement('div');
				containerRef.current.append(node);
				return [server, node];
			}),
		];

		setPairs(pairsRef.current);
	}, [servers]);

	useEffect(() => () => {
		const pairs = pairsRef.current;
		setTimeout(() => {
			pairs.forEach(([, node]) => node.remove());
		}, 1000);
	}, []);

	return <>
		<div ref={containerRef} />
		{pairs.map(([server, node]) => createPortal(<ServerPane
			key={server.url}
			active={currentServerUrl === server.url}
			hasSidebar={hasSidebar}
			lastPath={server.lastPath}
			url={server.url}
		/>, node))}
	</>;
}
