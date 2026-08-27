import { invoke } from '../../ipc/renderer';
import { render, screen, userEvent, waitFor } from '../../ui/test-utils';
import type { Surfaces } from '../../ui/windowChrome/appearance';
import { CertificateRow } from './CertificateRow';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../../ipc/renderer', () => ({
  invoke: jest.fn(),
}));

const invokeMock = invoke as jest.MockedFunction<typeof invoke>;

const surfaces: Surfaces = {
  panel: '#fff',
  card: '#fff',
  sticky: '#fff',
  field: '#fff',
  hover: '#eee',
  selected: '#ddd',
  divider: '#ccc',
};

describe('CertificateRow remove confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invokeMock.mockResolvedValue(false as never);
  });

  it('does not remove the certificate when the confirm dialog is cancelled', async () => {
    const user = userEvent.setup();
    render(
      <CertificateRow domain='example.test' isTrusted surfaces={surfaces} />
    );

    invokeMock.mockResolvedValueOnce(false as never);
    await user.click(
      screen.getByRole('button', { name: 'certificatesManager.item.remove' })
    );

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        'settings-window/confirm-remove-certificate',
        'example.test'
      )
    );
    expect(invokeMock).not.toHaveBeenCalledWith(
      'certificatesManager/remove',
      'example.test'
    );
  });

  it('removes the certificate when the confirm dialog is accepted', async () => {
    const user = userEvent.setup();
    render(
      <CertificateRow domain='example.test' isTrusted surfaces={surfaces} />
    );

    invokeMock.mockResolvedValueOnce(true as never);
    await user.click(
      screen.getByRole('button', { name: 'certificatesManager.item.remove' })
    );

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        'certificatesManager/remove',
        'example.test'
      )
    );
  });
});
