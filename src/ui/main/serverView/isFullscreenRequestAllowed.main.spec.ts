import { isFullscreenRequestAllowed } from './index';

describe('isFullscreenRequestAllowed', () => {
  const servers = [{ url: 'https://chat.example.com' }];

  it('allows the server page itself', () => {
    expect(
      isFullscreenRequestAllowed(
        {
          requestingUrl: 'https://chat.example.com/channel/general',
          isMainFrame: true,
          topLevelUrl: 'https://chat.example.com/channel/general',
        },
        servers
      )
    ).toBe(true);
  });

  it('allows an embedded player iframe on a server page', () => {
    expect(
      isFullscreenRequestAllowed(
        {
          requestingUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
          isMainFrame: false,
          topLevelUrl: 'https://chat.example.com/channel/general',
        },
        servers
      )
    ).toBe(true);
  });

  it('denies a main frame that is not a configured server', () => {
    expect(
      isFullscreenRequestAllowed(
        {
          requestingUrl: 'https://evil.example.com/',
          isMainFrame: true,
          topLevelUrl: 'https://evil.example.com/',
        },
        servers
      )
    ).toBe(false);
  });

  it('denies an iframe whose top-level page is not a configured server', () => {
    expect(
      isFullscreenRequestAllowed(
        {
          requestingUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
          isMainFrame: false,
          topLevelUrl: 'https://evil.example.com/',
        },
        servers
      )
    ).toBe(false);
  });

  it('denies an iframe when the top-level URL is unknown', () => {
    expect(
      isFullscreenRequestAllowed(
        {
          requestingUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
          isMainFrame: false,
          topLevelUrl: undefined,
        },
        servers
      )
    ).toBe(false);
  });
});
