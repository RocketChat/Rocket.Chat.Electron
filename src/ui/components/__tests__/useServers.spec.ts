import { useServers } from '../hooks/useServers';

const useSelector = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (...args: unknown[]) => useSelector(...args),
}));

describe('ui/components/hooks/useServers', () => {
  it('marks selected server when URL matches current view', () => {
    const state = {
      currentView: { url: 'https://alpha.example/path' },
      servers: [
        { url: 'https://alpha.example/path', id: 'a' },
        { url: 'https://beta.example/path', id: 'b' },
      ],
    };

    const selector = jest.fn((fn: (state: any) => any) => fn(state));
    useSelector.mockImplementation((fn: any) => selector(fn));

    const servers = useServers();
    expect(servers).toEqual([
      { url: 'https://alpha.example/path', id: 'a', selected: true },
      { url: 'https://beta.example/path', id: 'b', selected: false },
    ]);
  });

  it('treats non-object currentView as not selected', () => {
    const state = {
      currentView: 'server',
      servers: [{ url: 'https://alpha.example/path', id: 'a' }],
    };

    useSelector.mockImplementation((fn: any) => fn(state));
    const servers = useServers();

    expect(servers).toEqual([
      { url: 'https://alpha.example/path', id: 'a', selected: false },
    ]);
  });
});
