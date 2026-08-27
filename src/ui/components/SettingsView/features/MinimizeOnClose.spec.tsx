import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED } from '../../../actions';
import { MinimizeOnClose } from './MinimizeOnClose';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type PartialState = {
  isMinimizeOnCloseEnabled: boolean;
  isTrayIconEnabled: boolean;
};

const makeStore = (partial: PartialState) => {
  const reducer = (state: PartialState = partial) => state;
  return createStore(reducer as any);
};

const renderMinimizeOnClose = (partial: PartialState) => {
  const store = makeStore(partial);
  const dispatchSpy = jest.spyOn(store, 'dispatch');
  render(
    <Provider store={store}>
      <MinimizeOnClose />
    </Provider>
  );
  return { dispatchSpy };
};

describe('MinimizeOnClose', () => {
  it('renders enabled when tray icon is off', () => {
    renderMinimizeOnClose({
      isMinimizeOnCloseEnabled: false,
      isTrayIconEnabled: false,
    });
    expect(screen.getByRole('checkbox')).not.toBeDisabled();
  });

  it('disables toggle and shows hint when tray icon is enabled', () => {
    renderMinimizeOnClose({
      isMinimizeOnCloseEnabled: true,
      isTrayIconEnabled: true,
    });
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(
      screen.getByText('settings.options.minimizeOnClose.disabledHint')
    ).toBeInTheDocument();
  });

  it('dispatches SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED on toggle', () => {
    const { dispatchSpy } = renderMinimizeOnClose({
      isMinimizeOnCloseEnabled: false,
      isTrayIconEnabled: false,
    });

    fireEvent.click(screen.getByRole('checkbox'));

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED,
      payload: true,
    });
  });
});
