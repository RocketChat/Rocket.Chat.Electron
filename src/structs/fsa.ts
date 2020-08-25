import { Action } from 'redux';

export type FluxStandardAction<T, A extends string = string> = Action<A> & {
	payload?: T;
	error?: boolean;
	meta?: Record<string, unknown>;
};

export const isFSA = (action: unknown): action is FluxStandardAction<unknown> => typeof action === 'object'
	&& action !== null
	&& !Array.isArray(action)
	&& typeof (action as FluxStandardAction<unknown>).type === 'string'
	&& ['undefined', 'boolean'].includes(typeof (action as FluxStandardAction<unknown>).error)
	&& ['undefined', 'object'].includes(typeof (action as FluxStandardAction<unknown>).meta);
