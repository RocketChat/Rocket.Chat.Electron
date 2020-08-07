import { createReduxStore } from './reduxStore';

export const performStartup = (): void => {
	createReduxStore();
};
