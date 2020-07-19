import { eventChannel, channel, buffers } from 'redux-saga';
import { app } from 'electron';

const defaultEventListenerDecorator = (eventListener) => eventListener;

export const eventEmitterChannel = (eventEmitter, eventName, decorator = defaultEventListenerDecorator) =>
	eventChannel((emit) => {
		const eventListener = decorator(emit);

		eventEmitter.addListener(eventName, eventListener);

		return () => {
			eventEmitter.removeListener(eventName, eventListener);
		};
	});

const READY = Symbol('READY');

export const appReadyChannel = () => {
	const chan = channel();

	app.whenReady().then(() => {
		chan.put(READY);
		chan.close();
	});

	return chan;
};

export const storeValueChannel = (store, selector, equalityFunction = Object.is) => {
	const chan = channel(buffers.expanding());

	let prevValue;
	const unsubscribe = store.subscribe(() => {
		const value = selector(store.getState());

		if (!equalityFunction(value, prevValue)) {
			chan.put(value);
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
