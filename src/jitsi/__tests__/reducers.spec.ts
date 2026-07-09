import { APP_SETTINGS_LOADED } from '../../app/actions';
import {
  JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED,
  JITSI_SERVER_CAPTURE_SCREEN_PERMISSIONS_CLEARED,
} from '../actions';
import { allowedJitsiServers } from '../reducers';

export {};

describe('jitsi/reducers', () => {
  it('loads from app settings payload', () => {
    const result = allowedJitsiServers(
      {},
      {
        type: APP_SETTINGS_LOADED,
        payload: {
          allowedJitsiServers: {
            'existing.example': true,
          },
        },
      }
    );

    expect(result).toEqual({ 'existing.example': true });
  });

  it('defaults allowed servers when app settings have no payload', () => {
    const result = allowedJitsiServers({ 'old.example': true }, {
      type: APP_SETTINGS_LOADED,
      payload: {},
    } as never);

    expect(result).toEqual({});
  });

  it('updates allowlist when permission result is returned', () => {
    const result = allowedJitsiServers(
      { 'existing.example': true },
      {
        type: JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED,
        payload: {
          jitsiServer: 'new.example',
          allowed: false,
        },
      }
    );

    expect(result).toEqual({
      'existing.example': true,
      'new.example': false,
    });
  });

  it('clears allowed jitsi servers', () => {
    const result = allowedJitsiServers(
      { 'existing.example': true, 'old.example': false },
      {
        type: JITSI_SERVER_CAPTURE_SCREEN_PERMISSIONS_CLEARED,
      } as never
    );

    expect(result).toEqual({});
  });

  it('returns existing state for unknown actions', () => {
    const state = { 'existing.example': true };
    const result = allowedJitsiServers(
      state as Record<string, boolean>,
      {
        type: 'UNKNOWN',
      } as never
    );

    expect(result).toEqual(state);
  });

  it('starts from an empty object when state is undefined', () => {
    const result = allowedJitsiServers(
      undefined as unknown as Record<string, boolean>,
      {
        type: 'UNKNOWN',
      } as never
    );

    expect(result).toEqual({});
  });
});
