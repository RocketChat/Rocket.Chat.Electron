import {
	ADD_SERVER_VIEW_SERVER_ADDED,
	SERVERS_READY,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
	SIDE_BAR_SERVERS_SORTED,
	WEBVIEW_DID_NAVIGATE,
	WEBVIEW_SIDEBAR_STYLE_CHANGED,
	WEBVIEW_TITLE_CHANGED,
	WEBVIEW_UNREAD_CHANGED,
	WEBVIEW_FAVICON_CHANGED,
} from '../actions';

const upsert = (state, server) => {
	const index = state.findIndex(({ url }) => url === server.url);

	if (index === -1) {
		return [...state, server];
	}

	return state.map((_server, i) => (i === index ? { ..._server, ...server } : _server));
};

export const servers = (state = [], { type, payload }) => {
	switch (type) {
		case SERVERS_READY: {
			const { servers } = payload;
			return servers;
		}

		case ADD_SERVER_VIEW_SERVER_ADDED: {
			const url = payload;
			return upsert(state, { url, title: url });
		}

		case SIDE_BAR_REMOVE_SERVER_CLICKED: {
			const _url = payload;
			return state.filter(({ url }) => url !== _url);
		}

		case SIDE_BAR_SERVERS_SORTED: {
			const urls = payload;
			return state.sort(({ url: a }, { url: b }) => urls.indexOf(a) - urls.indexOf(b));
		}

		case WEBVIEW_TITLE_CHANGED: {
			const { url, title = url } = payload;
			return upsert(state, { url, title });
		}

		case WEBVIEW_UNREAD_CHANGED: {
			const { url, badge } = payload;
			return upsert(state, { url, badge });
		}

		case WEBVIEW_SIDEBAR_STYLE_CHANGED: {
			const { url, style } = payload;
			return upsert(state, { url, style });
		}

		case WEBVIEW_FAVICON_CHANGED: {
			const { url, favicon } = payload;
			return upsert(state, { url, favicon });
		}

		case WEBVIEW_DID_NAVIGATE: {
			const { url, pageUrl } = payload;
			if (pageUrl.includes(url)) {
				return upsert(state, { url, lastPath: pageUrl });
			}

			return state;
		}
	}

	return state;
};
