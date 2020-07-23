import { eventChannel, channel } from 'redux-saga';

export const eventEmitterChannel = (eventEmitter, eventName) =>
	eventChannel((emit) => {
		const eventListener = (...args) => {
			emit(args);
		};

		eventEmitter.addListener(eventName, eventListener);

		return () => {
			eventEmitter.removeListener(eventName, eventListener);
		};
	});

export const preventedEventEmitterChannel = (eventEmitter, eventName) =>
	eventChannel((emit) => {
		const eventListener = (event, ...args) => {
			if (event?.preventDefault) {
				event.preventDefault();
			}

			emit([event, ...args]);
		};

		eventEmitter.addListener(eventName, eventListener);

		return () => {
			eventEmitter.removeListener(eventName, eventListener);
		};
	});

export const storeChangeChannel = (store, selector, equalityFunction = Object.is) => {
	const chan = channel();

	let prevValue;
	const unsubscribe = store.subscribe(() => {
		const value = selector(store.getState());

		if (!equalityFunction(value, prevValue)) {
			chan.put([value, prevValue]);
			prevValue = value;
		}
	});

	const close = () => {
		unsubscribe();
		chan.close();
	};

	return {
		take: chan.take,
		flush: chan.flush,
		close,
	};
};
