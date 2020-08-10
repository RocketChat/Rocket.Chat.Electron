import { useState, DragEvent } from 'react';
import { useDispatch } from 'react-redux';

import {
	SIDE_BAR_SERVERS_SORTED,
	SIDE_BAR_SERVER_SELECTED,
} from '../../actions';
import { Server } from '../../structs/servers';

export const useSorting = (servers: Server[]): {
	sortedServers: Server[];
	draggedServerUrl: string;
	handleDragStart: (url: string) => (event: DragEvent) => void;
	handleDragEnd: (event: DragEvent) => void;
	handleDragEnter: (url: string) => (event: DragEvent) => void;
	handleDrop: (url: string) => (event: DragEvent) => void;
} => {
	const [draggedServerUrl, setDraggedServerUrl] = useState<string | null>(null);
	const [serversSorting, setServersSorting] = useState<string[] | null>(null);

	const handleDragStart = (url: string) => (event: DragEvent) => {
		event.dataTransfer.dropEffect = 'move';
		event.dataTransfer.effectAllowed = 'move';
		setDraggedServerUrl(url);
		setServersSorting(servers.map(({ url }) => url));
	};

	const handleDragEnd = (): void => {
		setDraggedServerUrl(null);
		setServersSorting(null);
	};

	const handleDragEnter = (targetServerUrl: string) => () => {
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

	const handleDrop = (url: string) => (event: DragEvent) => {
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
