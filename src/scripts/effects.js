import { emit, listen, removeListener } from './ipc';

export const dispatch = (action) => {
	console.log(action);
	emit('action-dispatched', action);
};

export const subscribe = (handler) => {
	const listener = (_, action) => handler(action);

	listen('action-dispatched', listener);

	const unsubscribe = () => removeListener('action-dispatched', listener);

	window.addEventListener('beforeunload', unsubscribe);

	return unsubscribe;
};
