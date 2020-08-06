declare module 'electron-redux' {
	import { Middleware, Store } from 'redux';

	export const forwardToRenderer: Middleware;
	export const triggerAlias: Middleware;
	export function replayActionMain(store: Store): void;
}
