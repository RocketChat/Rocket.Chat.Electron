import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import ActionButton from './ActionButton';
import CertificateItem from './CertificateItem';
import { CertificatesManager } from './CertificatesManager';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const invokeMock = jest.fn();
jest.mock('../../../ipc/renderer', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

const makeStore = (partial: Record<string, unknown>) => {
  const reducer = (state = partial) => state;
  return createStore(reducer as any);
};

describe('CertificatesManager', () => {
  beforeEach(() => {
    invokeMock.mockClear();
  });

  it('renders trusted and not-trusted certificate tables', () => {
    const store = makeStore({
      trustedCertificates: { 'https://trusted.example': 'pem' },
      notTrustedCertificates: { 'https://blocked.example': 'pem' },
    });

    render(
      <Provider store={store}>
        <CertificatesManager />
      </Provider>
    );

    expect(
      screen.getByText('certificatesManager.trustedCertificates')
    ).toBeInTheDocument();
    expect(
      screen.getByText('certificatesManager.notTrustedCertificates')
    ).toBeInTheDocument();
    expect(screen.getByText('https://trusted.example')).toBeInTheDocument();
    expect(screen.getByText('https://blocked.example')).toBeInTheDocument();
  });

  it('CertificateItem invokes remove channel on action click', () => {
    render(
      <table>
        <tbody>
          <CertificateItem url='https://remove.me' />
        </tbody>
      </table>
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'certificatesManager.item.remove' })
    );
    expect(invokeMock).toHaveBeenCalledWith(
      'certificatesManager/remove',
      'https://remove.me'
    );
  });

  it('ActionButton renders children', () => {
    render(<ActionButton onClick={jest.fn()}>Go</ActionButton>);
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });
});
