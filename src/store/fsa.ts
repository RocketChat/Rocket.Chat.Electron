export type FluxStandardAction<
  Type extends string = string,
  Payload = void
> = void extends Payload
  ? {
      type: Type;
    }
  : {
      type: Type;
      payload: Payload;
    };

export const isFSA = <Action extends FluxStandardAction<string, unknown>>(
  action: unknown
): action is Action =>
  typeof action === 'object' &&
  action !== null &&
  !Array.isArray(action) &&
  'type' in action &&
  typeof (action as { type: string }).type === 'string';

export const hasMeta = <Action extends FluxStandardAction<string, unknown>>(
  action: Action
): action is Action & { meta: Record<string, unknown> } =>
  'meta' in action &&
  typeof (action as Action & { meta: unknown }).meta === 'object' &&
  (action as Action & { meta: unknown }).meta !== null;

export const isResponse = <Action extends FluxStandardAction<string, unknown>>(
  action: Action
): action is Action & { meta: { response: boolean; id: unknown } } =>
  hasMeta(action) &&
  (action as Action & { meta: { response: unknown; id: unknown } }).meta
    .response === true;

export const isRequest = <Action extends FluxStandardAction<string, unknown>>(
  action: Action
): action is Action & { meta: { request: boolean; id: unknown } } =>
  hasMeta(action) &&
  (action as Action & { meta: { request: unknown; id: unknown } }).meta
    .request === true;

export const isLocallyScoped = <
  Action extends FluxStandardAction<string, unknown>
>(
  action: Action
): action is Action & { meta: { scope: 'local' } } =>
  hasMeta(action) &&
  (action as Action & { meta: { scope: unknown } }).meta.scope === 'local';

export const isSingleScoped = <
  Action extends FluxStandardAction<string, unknown>
>(
  action: Action
): action is Action & {
  ipcMeta: { scope: 'single'; webContentsId: number; viewInstanceId?: number };
} =>
  (action as any & { ipcMeta: { webContentsId: unknown } }).ipcMeta
    ?.webContentsId &&
  (action as any & { ipcMeta: { scope: unknown } }).ipcMeta?.scope === 'single';

export const isErrored = <Action extends FluxStandardAction<string, unknown>>(
  action: Action
): action is Action & { error: true; payload: Error } =>
  'meta' in action &&
  (action as Action & { error: unknown }).error === true &&
  (action as Action & { payload: unknown }).payload instanceof Error;

export const hasPayload = <Action extends FluxStandardAction<string, unknown>>(
  action: Action
): action is Action & {
  payload: Action extends { payload: infer P } ? P : never;
} => 'payload' in action;

export const isResponseTo =
  <
    Action extends FluxStandardAction<string, unknown>,
    Types extends [...string[]]
  >(
    id: unknown,
    ...types: Types
  ) =>
  (
    action: Action
  ): action is Action &
    {
      [Type in Types[number]]: {
        type: Type;
        meta: { response: boolean; id: unknown };
      };
    }[Types[number]] =>
    isResponse(action) && types.includes(action.type) && action.meta.id === id;
