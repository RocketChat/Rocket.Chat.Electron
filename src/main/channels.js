import { eventChannel, channel, buffers } from 'redux-saga';
import { app } from 'electron';

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

export const appReadyChannel = () => {
	const chan = channel();

	app.whenReady().then(() => {
		chan.put([]);
		chan.close();
	});

	return chan;
};

export const storeChangeChannel = (store, selector, equalityFunction = Object.is) => {
	const chan = channel(buffers.expanding());

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
