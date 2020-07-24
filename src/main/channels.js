import { eventChannel } from 'redux-saga';

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
