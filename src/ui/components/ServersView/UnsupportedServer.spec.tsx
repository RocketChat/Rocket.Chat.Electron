import { ipcRenderer } from 'electron';

import { render, screen, userEvent } from '../../test-utils';
import UnsupportedServer from './UnsupportedServer';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key} ${JSON.stringify(options)}` : key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
  },
}));

const invokeMock = ipcRenderer.invoke as jest.MockedFunction<
  typeof ipcRenderer.invoke
>;

const SERVER_URL = 'https://chat.example.com/';

describe('UnsupportedServer', () => {
  beforeEach(() => {
    invokeMock.mockClear();
  });

  it('renders the check again button when isSupported is false', () => {
    render(
      <UnsupportedServer
        isSupported={false}
        fetchState='error'
        instanceDomain='chat.example.com'
        serverUrl={SERVER_URL}
      />
    );

    expect(
      screen.getByText('unsupportedServer.checkAgain')
    ).toBeInTheDocument();
  });

  it('invokes refresh-supported-versions with the server url on click', async () => {
    const user = userEvent.setup();
    render(
      <UnsupportedServer
        isSupported={false}
        fetchState='error'
        instanceDomain='chat.example.com'
        serverUrl={SERVER_URL}
      />
    );

    await user.click(screen.getByText('unsupportedServer.checkAgain'));

    expect(invokeMock).toHaveBeenCalledWith(
      'refresh-supported-versions',
      SERVER_URL
    );
  });

  it('does not render the blocking gate when isSupported is true', () => {
    render(
      <UnsupportedServer
        isSupported
        fetchState='success'
        instanceDomain='chat.example.com'
        serverUrl={SERVER_URL}
      />
    );

    expect(
      screen.queryByText('unsupportedServer.checkAgain')
    ).not.toBeInTheDocument();
  });

  it('does not render the blocking gate while a fresh validation is loading', () => {
    render(
      <UnsupportedServer
        isSupported={false}
        fetchState='loading'
        instanceDomain='chat.example.com'
        serverUrl={SERVER_URL}
      />
    );

    expect(
      screen.queryByText('unsupportedServer.checkAgain')
    ).not.toBeInTheDocument();
  });
});
