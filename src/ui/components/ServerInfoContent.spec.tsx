import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import ServerInfoContent from './ServerInfoContent';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('../../servers/supportedVersions/main', () => ({
  isServerVersionSupported: jest.fn(async () => ({
    supported: true,
  })),
  getExpirationMessageTranslated: jest.fn(() => undefined),
}));

describe('ServerInfoContent', () => {
  it('renders url and version labels', () => {
    const { unmount } = render(
      <ServerInfoContent url='https://open.rocket.chat' version='6.5.0' />
    );
    expect(screen.getByText('serverInfo.title')).toBeInTheDocument();
    expect(screen.getByText('https://open.rocket.chat')).toBeInTheDocument();
    expect(screen.getByText('6.5.0')).toBeInTheDocument();
    unmount();
  });

  it('hides title in modal mode and shows exchange url', () => {
    const { unmount } = render(
      <ServerInfoContent
        url='https://open.rocket.chat'
        version='6.5.0'
        exchangeUrl='https://exchange.example'
        isModal
      />
    );
    expect(screen.queryByText('serverInfo.title')).not.toBeInTheDocument();
    expect(screen.getByText('https://exchange.example')).toBeInTheDocument();
    unmount();
  });

  it('shows loading and error fetch states', () => {
    const { rerender, unmount } = render(
      <ServerInfoContent
        url='https://open.rocket.chat'
        supportedVersions={{ versions: [] } as any}
        supportedVersionsFetchState='loading'
      />
    );
    expect(screen.getByText(/serverInfo\.status\.loading/)).toBeInTheDocument();

    rerender(
      <ServerInfoContent
        url='https://open.rocket.chat'
        supportedVersions={{ versions: [] } as any}
        supportedVersionsFetchState='error'
      />
    );
    expect(screen.getByText(/serverInfo\.status\.error/)).toBeInTheDocument();
    unmount();
  });
});
