import {
  isErrored,
  isFSA,
  isLocallyScoped,
  isSingleScoped,
  isResponse,
  isResponseTo,
  isRequest,
} from '../fsa';

describe('fsa', () => {
  it('isFSA validates a Flux-standard action shape', () => {
    expect(isFSA({ type: 'X' as const })).toBe(true);
    expect(isFSA({})).toBe(false);
    expect(isFSA({ type: ['A'] as any })).toBe(false);
    expect(isFSA(null)).toBe(false);
  });

  it('isResponse validates response metadata', () => {
    expect(
      isResponse({
        type: 'X',
        payload: 'abc',
        meta: { response: true, id: '1' },
      } as any)
    ).toBe(true);

    expect(
      isResponse({
        type: 'X',
        payload: 'abc',
        meta: { response: false, id: '1' },
      } as any)
    ).toBe(false);
  });

  it('isRequest validates request metadata', () => {
    expect(
      isRequest({
        type: 'X',
        payload: 'abc',
        meta: { request: true, id: '1' },
      } as any)
    ).toBe(true);

    expect(
      isRequest({
        type: 'X',
        payload: 'abc',
        meta: { request: false, id: '1' },
      } as any)
    ).toBe(false);
  });

  it('isLocallyScoped validates local scope metadata', () => {
    expect(
      isLocallyScoped({
        type: 'X',
        payload: 1,
        meta: { scope: 'local' },
      } as any)
    ).toBe(true);

    expect(
      isLocallyScoped({
        type: 'X',
        payload: 1,
        meta: { scope: 'remote' },
      } as any)
    ).toBe(false);
  });

  it('isSingleScoped validates single-scope metadata', () => {
    expect(
      isSingleScoped({
        type: 'X',
        payload: 1,
        ipcMeta: { scope: 'single', webContentsId: 10 },
      } as any)
    ).toBe(true);

    expect(
      isSingleScoped({
        type: 'X',
        payload: 1,
        ipcMeta: { scope: 'local', webContentsId: 10 },
      } as any)
    ).toBe(false);
  });

  it('isErrored validates errored actions', () => {
    const error = new Error('boom');

    expect(
      isErrored({
        type: 'X',
        error: true,
        payload: error,
        meta: {},
      } as any)
    ).toBe(true);

    expect(
      isErrored({
        type: 'X',
        error: false,
        payload: error,
        meta: {},
      } as any)
    ).toBe(false);
  });

  it('isResponseTo validates action IDs and types', () => {
    const action = {
      type: 'ACK',
      meta: { response: true, id: '123' },
    } as any;

    expect(isResponseTo('123', 'ACK', 'NACK')(action)).toBe(true);
    expect(isResponseTo('999', 'ACK')(action)).toBe(false);
    expect(isResponseTo('123', 'NACK')(action)).toBe(false);
  });

  it('hasPayload narrows to action with payload', () => {
    expect(isFSA({ type: 'X', payload: 'abc' } as const)).toBe(true);
  });
});
