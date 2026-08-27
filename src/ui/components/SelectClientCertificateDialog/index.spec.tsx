import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { SelectClientCertificateDialog } from '.';
import {
  CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
} from '../../../navigation/actions';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../Dialog', () => ({
  Dialog: ({
    children,
    isVisible,
    onClose,
  }: {
    children: React.ReactNode;
    isVisible?: boolean;
    onClose?: () => void;
  }) =>
    isVisible ? (
      <div role='dialog'>
        <button type='button' onClick={onClose}>
          dismiss
        </button>
        {children}
      </div>
    ) : null,
}));

const listeners = new Map<string, (action: any) => void>();

jest.mock('../../../store', () => ({
  listen: (type: string, listener: (action: any) => void) => {
    listeners.set(type, listener);
    return () => listeners.delete(type);
  },
}));

jest.mock('../../../store/fsa', () => ({
  isRequest: (action: any) => Boolean(action?.meta?.id),
}));

const cert = {
  subjectName: 'Alice',
  issuerName: 'CA',
  fingerprint: 'fp-1',
  validStart: 1_700_000_000,
  validExpiry: 1_800_000_000,
};

const makeStore = (partial: Record<string, unknown>) => {
  const reducer = (state = partial) => state;
  return createStore(reducer as any);
};

describe('SelectClientCertificateDialog', () => {
  beforeEach(() => {
    listeners.clear();
  });

  it('renders certificates when dialog is open', () => {
    const store = makeStore({
      openDialog: 'select-client-certificate',
      clientCertificates: [cert],
    });
    render(
      <Provider store={store}>
        <SelectClientCertificateDialog />
      </Provider>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('CA')).toBeInTheDocument();
  });

  it('dispatches select and dismiss actions', () => {
    const store = makeStore({
      openDialog: 'select-client-certificate',
      clientCertificates: [cert],
    });
    const spy = jest.spyOn(store, 'dispatch');
    render(
      <Provider store={store}>
        <SelectClientCertificateDialog />
      </Provider>
    );

    act(() => {
      listeners.get(CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED)?.({
        type: CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
        meta: { id: 'req-1' },
      });
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'dialog.selectClientCertificate.select',
      })
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
        payload: 'fp-1',
      })
    );

    fireEvent.click(screen.getByText('dismiss'));
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
      })
    );
  });
});
