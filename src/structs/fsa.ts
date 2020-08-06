import { Action, AnyAction } from 'redux';

export type FluxStandardAction<T> = Action<string> & {
	payload?: T;
	error?: boolean;
	meta?: Record<string, unknown>;
};

export const isFSA = (action: AnyAction): action is FluxStandardAction<unknown> =>
	typeof action === 'object' && action !== null && !Array.isArray(action)
	&& typeof action.type === 'string'
	&& ['undefined', 'boolean'].includes(typeof action.error)
	&& ['undefined', 'object'].includes(typeof action.meta);
