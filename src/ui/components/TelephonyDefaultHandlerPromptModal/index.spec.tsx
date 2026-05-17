import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import type { RootState } from '../../../store/rootReducer';
import {
  TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE,
  TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN_SETTINGS_CLICKED,
} from '../../actions';
import { TelephonyDefaultHandlerPromptModal } from './index';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Dialog uses showModal() which is not available in jsdom.
// Mock to a simple conditional wrapper focused on content/dispatch logic.
jest.mock('../Dialog', () => ({
  Dialog: ({
    children,
    isVisible,
    onClose,
  }: {
    children?: ReactNode;
    isVisible?: boolean;
    onClose?: () => void;
  }) =>
    isVisible ? (
      <div data-testid='dialog' role='dialog'>
        <button data-testid='dialog-close' onClick={onClose}>
          close
        </button>
        {children}
      </div>
    ) : null,
}));

type PartialState = Pick<RootState, 'dialogs'>;

const makeStore = (partial: PartialState) => {
  const reducer = (state: PartialState = partial) => state;
  return createStore(reducer as any);
};

const openState = (): PartialState => ({
  dialogs: {
    telephonyDefaultHandlerPrompt: { isOpen: true },
    telephonyServerSelect: null,
    serverInfoModal: { isOpen: false, serverData: null },
  } as unknown as RootState['dialogs'],
});

const closedState = (): PartialState => ({
  dialogs: {
    telephonyDefaultHandlerPrompt: { isOpen: false },
    telephonyServerSelect: null,
    serverInfoModal: { isOpen: false, serverData: null },
  } as unknown as RootState['dialogs'],
});

describe('TelephonyDefaultHandlerPromptModal', () => {
  it('renders nothing when isOpen=false', () => {
    const store = makeStore(closedState());
    const { container } = render(
      <Provider store={store}>
        <TelephonyDefaultHandlerPromptModal />
      </Provider>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders title and both body paragraphs when isOpen=true', () => {
    const store = makeStore(openState());
    render(
      <Provider store={store}>
        <TelephonyDefaultHandlerPromptModal />
      </Provider>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText('telephony.defaultHandlerPrompt.title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('telephony.defaultHandlerPrompt.body')
    ).toBeInTheDocument();
    expect(
      screen.getByText('telephony.defaultHandlerPrompt.body2')
    ).toBeInTheDocument();
  });

  it('dismiss button dispatches TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE only', () => {
    const store = makeStore(openState());
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <TelephonyDefaultHandlerPromptModal />
      </Provider>
    );

    fireEvent.click(screen.getByText('telephony.defaultHandlerPrompt.dismiss'));

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith({
      type: TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE,
    });
  });

  it('open settings button dispatches OPEN_SETTINGS_CLICKED then CLOSE in order', () => {
    const store = makeStore(openState());
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <TelephonyDefaultHandlerPromptModal />
      </Provider>
    );

    fireEvent.click(
      screen.getByText('telephony.defaultHandlerPrompt.openSettings')
    );

    expect(dispatchSpy).toHaveBeenCalledTimes(2);
    expect(dispatchSpy).toHaveBeenNthCalledWith(1, {
      type: TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN_SETTINGS_CLICKED,
    });
    expect(dispatchSpy).toHaveBeenNthCalledWith(2, {
      type: TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE,
    });
  });
});
