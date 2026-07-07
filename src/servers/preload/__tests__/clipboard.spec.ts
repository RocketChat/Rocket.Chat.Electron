/** @jest-environment jsdom */
import { writeTextToClipboard } from '../clipboard';

jest.mock('electron', () => ({
  clipboard: {
    writeText: jest.fn(),
  },
}));

describe('servers/preload/clipboard', () => {
  it('dispatches text to electron clipboard', () => {
    const { clipboard } = require('electron');

    writeTextToClipboard('hello world');

    expect(clipboard.writeText).toHaveBeenCalledWith('hello world');
  });
});
