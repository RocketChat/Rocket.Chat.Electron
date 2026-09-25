import { isUiServedFromServer, prepareIndexHtml } from './uiOverride';

const viteIndex =
  '<!DOCTYPE html><html><head><base href="/" /><script type="module" src="/bundle/index-abc.js"></script></head><body><div id="react-root"></div></body></html>';

describe('prepareIndexHtml', () => {
  it('injects the runtime config the Meteor server would provide', () => {
    const html = prepareIndexHtml(
      viteIndex,
      'https://open.rocket.chat',
      'https://builds.example/pr-1/'
    );

    expect(html).toContain(
      '<head><script>window.__meteor_runtime_config__ = {"ROOT_URL":"https://open.rocket.chat/","ROOT_URL_PATH_PREFIX":""};</script>'
    );
    expect(html).toContain('<base href="/" />');
    expect(html).toContain('UI preview: https://builds.example/pr-1/');
  });

  it('keeps a server path prefix in the base href and runtime config', () => {
    const html = prepareIndexHtml(
      viteIndex,
      'https://example.com/chat',
      'https://builds.example/pr-1/'
    );

    expect(html).toContain('<base href="/chat/" />');
    expect(html).toContain(
      '"ROOT_URL":"https://example.com/chat/","ROOT_URL_PATH_PREFIX":"/chat"'
    );
  });

  it('escapes the bundle URL shown in the badge', () => {
    const html = prepareIndexHtml(
      viteIndex,
      'https://open.rocket.chat',
      'https://builds.example/"><script>x</script>'
    );

    expect(html).not.toContain('<script>x</script>');
  });
});

describe('isUiServedFromServer', () => {
  it('sends server routes to the server', () => {
    expect(isUiServedFromServer('/api/v1/me', '')).toBe(true);
    expect(isUiServedFromServer('/chat/avatar/user', '/chat')).toBe(true);
  });

  it('lets client routes load the preview UI', () => {
    expect(isUiServedFromServer('/home', '')).toBe(false);
    expect(isUiServedFromServer('/chat/channel/general', '/chat')).toBe(false);
  });
});
