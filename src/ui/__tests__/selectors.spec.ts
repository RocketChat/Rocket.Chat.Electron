import type { RootState } from '../../store/rootReducer';
import {
  selectGlobalBadge,
  selectGlobalBadgeCount,
  selectGlobalBadgeText,
  selectActiveServerPresence,
} from '../selectors';

const state = (servers: any[]): RootState =>
  ({ servers }) as unknown as RootState;

describe('ui/selectors', () => {
  it('computes a numeric global badge from server badge counts', () => {
    expect(selectGlobalBadge(state([{ badge: 2 }, { badge: 3 }]))).toBe(5);
    expect(selectGlobalBadgeCount(state([{ badge: 2 }, { badge: '•' }]))).toBe(
      2
    );
  });

  it('returns bullet when no numeric sum but at least one bullet is present', () => {
    expect(selectGlobalBadge(state([{ badge: '•' }, { badge: null }]))).toBe(
      '•'
    );
    expect(selectGlobalBadgeText(state([{ badge: '•' }]))).toBe('•');
  });

  it('returns undefined for no matching badges and empty badge text when blank', () => {
    expect(
      selectGlobalBadge(state([{ badge: null }, { badge: undefined }]))
    ).toBeUndefined();
    expect(selectGlobalBadgeText(state([{ badge: null }]))).toBe('');
  });

  it('renders badge text for number badge and count selector', () => {
    expect(selectGlobalBadgeText(state([{ badge: 9 }]))).toBe('9');
    expect(selectGlobalBadgeCount(state([{ badge: '•' }, { badge: 7 }]))).toBe(
      7
    );
  });

  it('does not throw when a server has a malformed url', () => {
    const rootState = {
      servers: [{ url: 'not a url', title: 'Bad Server' }],
      currentView: { url: 'https://server.test' },
    } as unknown as RootState;

    expect(() => selectActiveServerPresence(rootState)).not.toThrow();
    expect(selectActiveServerPresence(rootState).url).toBeUndefined();
  });

  it('overrides connection to disconnected when presence disconnection is simulated', () => {
    const rootState = {
      servers: [
        {
          url: 'https://server.test',
          title: 'Server',
          presenceConnection: 'connected',
        },
      ],
      currentView: { url: 'https://server.test' },
      isPresenceDisconnectionSimulated: true,
    } as unknown as RootState;

    expect(selectActiveServerPresence(rootState).connection).toBe(
      'disconnected'
    );
  });

  it('keeps the real connection when presence disconnection is not simulated', () => {
    const rootState = {
      servers: [
        {
          url: 'https://server.test',
          title: 'Server',
          presenceConnection: 'connected',
        },
      ],
      currentView: { url: 'https://server.test' },
      isPresenceDisconnectionSimulated: false,
    } as unknown as RootState;

    expect(selectActiveServerPresence(rootState).connection).toBe('connected');
  });

  it('passes through the failed flag from the active server', () => {
    const rootState = {
      servers: [
        {
          url: 'https://server.test',
          title: 'Server',
          failed: true,
        },
      ],
      currentView: { url: 'https://server.test' },
    } as unknown as RootState;

    expect(selectActiveServerPresence(rootState).failed).toBe(true);
  });

  it('flags isAddingServer when the current view is the add-workspace screen, even with existing servers', () => {
    const rootState = {
      servers: [{ url: 'https://server.test', title: 'Server' }],
      currentView: 'add-new-server',
    } as unknown as RootState;

    expect(selectActiveServerPresence(rootState).isAddingServer).toBe(true);
    expect(selectActiveServerPresence(rootState).hasServers).toBe(true);
  });

  it('does not flag isAddingServer when a server is selected', () => {
    const rootState = {
      servers: [{ url: 'https://server.test', title: 'Server' }],
      currentView: { url: 'https://server.test' },
    } as unknown as RootState;

    expect(selectActiveServerPresence(rootState).isAddingServer).toBe(false);
  });
});
