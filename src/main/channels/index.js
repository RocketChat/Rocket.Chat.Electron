import { eventChannel, channel } from 'redux-saga';

import { getStore } from '../reduxStore';

export const eventEmitterChannel = (eventEmitter, eventName) => eventChannel((emit) => {
	eventEmitter.addListener(eventName, emit);

	return () => {
		eventEmitter.removeListener(eventName, emit);
	};
});

export const storeChangeChannel = (selector, equalityFunction = Object.is) => {
	const chan = channel();

	let closed = false;
	let unsubscribe = () => undefined;

	getStore().then((store) => {
		if (closed) {
			return;
		}

		let prevValue;
		unsubscribe = store.subscribe(() => {
			const value = selector(store.getState());

			if (!equalityFunction(value, prevValue)) {
				chan.put([value, prevValue]);
				prevValue = value;
			}
		});
	});

	const close = () => {
		closed = true;
		unsubscribe();
		chan.close();
	};

	return {
		take: chan.take,
		flush: chan.flush,
		close,
	};
};
