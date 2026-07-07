/**
 * @jest-environment jsdom
 */

import { whenReady } from './whenReady';

export {};

describe('whenReady', () => {
  const defineReadyState = (readyState: DocumentReadyState): void => {
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => readyState,
    });
  };

  it('resolves immediately when the document is already complete', async () => {
    defineReadyState('complete');

    const addEventListener = jest.spyOn(document, 'addEventListener');
    await expect(whenReady()).resolves.toBeUndefined();
    expect(addEventListener).not.toHaveBeenCalled();
  });

  it('waits for readystatechange and resolves when complete', async () => {
    defineReadyState('loading');

    const addEventListener = jest.spyOn(document, 'addEventListener');
    const removeEventListener = jest.spyOn(document, 'removeEventListener');
    const promise = whenReady();

    expect(addEventListener).toHaveBeenCalledWith(
      'readystatechange',
      expect.any(Function)
    );

    defineReadyState('complete');
    document.dispatchEvent(new Event('readystatechange'));

    await expect(promise).resolves.toBeUndefined();
    expect(removeEventListener).toHaveBeenCalledWith(
      'readystatechange',
      expect.any(Function)
    );
  });
});
