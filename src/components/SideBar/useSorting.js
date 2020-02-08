import { useState } from 'react';
import { useDispatch } from 'react-redux';

import {
	SIDE_BAR_SERVERS_SORTED,
	SIDE_BAR_SERVER_SELECTED,
} from '../../actions';

export const useSorting = (servers) => {
	const [draggedServerUrl, setDraggedServerUrl] = useState(null);
	const [serversSorting, setServersSorting] = useState(null);

	const handleDragStart = (url) => (event) => {
		event.dataTransfer.dropEffect = 'move';
		event.dataTransfer.effectAllowed = 'move';
		setDraggedServerUrl(url);
		setServersSorting(servers.map(({ url }) => url));
	};

	const handleDragEnd = () => {
		setDraggedServerUrl(null);
		setServersSorting(null);
	};

	const handleDragEnter = (targetServerUrl) => () => {
		setServersSorting((serversSorting) => serversSorting.map((url) => {
			if (url === targetServerUrl) {
				return draggedServerUrl;
			}

			if (url === draggedServerUrl) {
				return targetServerUrl;
			}

			return url;
		}));
	};

	const dispatch = useDispatch();

	const handleDrop = (url) => (event) => {
		event.preventDefault();

		dispatch({ type: SIDE_BAR_SERVERS_SORTED, payload: serversSorting });
		dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: url });
	};

	const sortedServers = serversSorting
		? servers.sort(({ url: a }, { url: b }) => serversSorting.indexOf(a) - serversSorting.indexOf(b))
		: servers;

	return {
		sortedServers,
		draggedServerUrl,
		handleDragStart,
		handleDragEnd,
		handleDragEnter,
		handleDrop,
	};
};
