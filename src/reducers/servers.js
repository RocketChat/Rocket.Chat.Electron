import { SERVERS_UPDATED } from '../actions';

export const servers = (state = [], { type, payload }) => {
	switch (type) {
		case SERVERS_UPDATED: {
			const { servers } = payload;
			return servers;
		}

		default:
			return state;
	}
};
