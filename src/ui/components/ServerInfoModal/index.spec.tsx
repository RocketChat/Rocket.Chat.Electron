import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { ServerInfoModal } from '.';
import { CLOSE_SERVER_INFO_MODAL } from '../../actions';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../ServerInfoContent', () => ({
  __esModule: true,
  default: () => <div data-testid='server-info-content' />,
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
          close
        </button>
        {children}
      </div>
    ) : null,
}));

const makeStore = (partial: Record<string, unknown>) =>
  createStore((s = partial) => s as any);

describe('ServerInfoModal', () => {
  it('returns null without server data', () => {
    const store = makeStore({
      dialogs: { serverInfoModal: { isOpen: true, serverData: null } },
    });
    const { container } = render(
      <Provider store={store}>
        <ServerInfoModal />
      </Provider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders content and dispatches close', () => {
    const store = makeStore({
      dialogs: {
        serverInfoModal: {
          isOpen: true,
          serverData: {
            url: 'https://open.rocket.chat',
            version: '6.0.0',
          },
        },
      },
    });
    const spy = jest.spyOn(store, 'dispatch');
    render(
      <Provider store={store}>
        <ServerInfoModal />
      </Provider>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('server-info-content')).toBeInTheDocument();
    fireEvent.click(screen.getByText('close'));
    expect(spy).toHaveBeenCalledWith({ type: CLOSE_SERVER_INFO_MODAL });
  });
});
