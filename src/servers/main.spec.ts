import { convertToURL } from './main';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp'),
  },
}));

jest.mock('../app/main/app', () => ({
  packageJsonInformation: { productName: 'Rocket.Chat', version: '4.0.0' },
}));

jest.mock('../ipc/main', () => ({
  invoke: jest.fn(),
}));

jest.mock('../store', () => ({
  select: jest.fn(),
  dispatch: jest.fn(),
  listen: jest.fn(() => jest.fn()),
  watch: jest.fn(() => jest.fn()),
}));

jest.mock('../ui/main/rootWindow', () => ({
  getRootWindow: jest.fn(async () => ({
    webContents: {},
  })),
}));

jest.mock('../ui/main/serverView', () => ({
  getWebContentsByServerUrl: jest.fn(),
}));

describe('servers/main convertToURL', () => {
  it('parses absolute http and https urls', () => {
    expect(convertToURL('https://open.rocket.chat').href).toBe(
      'https://open.rocket.chat/'
    );
    expect(convertToURL('http://localhost:3000').href).toBe(
      'http://localhost:3000/'
    );
  });

  it('prefixes bare hostnames with https', () => {
    expect(convertToURL('open.rocket.chat').protocol).toBe('https:');
    expect(convertToURL('open.rocket.chat').hostname).toBe('open.rocket.chat');
  });

  it('preserves host and path for credentialed urls', () => {
    const url = convertToURL('https://user:pass@open.rocket.chat/path');
    expect(url.hostname).toBe('open.rocket.chat');
    expect(url.pathname).toBe('/path/');
  });

  it('ensures trailing slash on pathname', () => {
    expect(
      convertToURL('https://open.rocket.chat/channel/general').pathname
    ).toBe('/channel/general/');
  });
});
