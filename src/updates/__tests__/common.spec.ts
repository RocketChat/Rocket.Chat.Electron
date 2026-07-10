import { UPDATE_CHANNELS } from '../common';

describe('updates/common', () => {
  it('exports ordered update channels', () => {
    expect(UPDATE_CHANNELS).toEqual(['latest', 'beta', 'alpha']);
  });
});
