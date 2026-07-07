import { SYSTEM_LOCKING_SCREEN, SYSTEM_SUSPENDING } from '../actions';

describe('userPresence/actions', () => {
  it('exposes expected action type constants', () => {
    expect(SYSTEM_LOCKING_SCREEN).toBe('system/locking-screen');
    expect(SYSTEM_SUSPENDING).toBe('system/suspending');
  });
});
