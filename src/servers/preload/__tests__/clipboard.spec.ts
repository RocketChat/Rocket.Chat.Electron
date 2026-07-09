/** @jest-environment jsdom */
import { clipboard } from 'electron';

import { writeTextToClipboard } from '../clipboard';

jest.mock('electron', () => ({
  clipboard: {
    writeText: jest.fn(),
  },
}));

describe('servers/preload/clipboard', () => {
  it('dispatches text to electron clipboard', () => {
    writeTextToClipboard('hello world');

    expect(clipboard.writeText).toHaveBeenCalledWith('hello world');
  });
});
