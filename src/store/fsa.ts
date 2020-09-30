import { Action } from 'redux';

export type FluxStandardAction<A extends string = string, P = undefined> = Action<A> & {
  payload?: P;
  error?: true;
  meta?: Record<string, unknown>;
};

export const isFSA = (action: unknown): action is FluxStandardAction<string, unknown> => typeof action === 'object'
	&& action !== null
	&& !Array.isArray(action)
	&& typeof (action as FluxStandardAction<string, unknown>).type === 'string'
	&& ['undefined', 'boolean'].includes(typeof (action as FluxStandardAction<string, unknown>).error)
	&& ['undefined', 'object'].includes(typeof (action as FluxStandardAction<string, unknown>).meta);
