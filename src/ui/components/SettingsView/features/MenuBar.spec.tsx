import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED } from '../../../actions';
import { MenuBar } from './MenuBar';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type PartialState = {
  isMenuBarEnabled: boolean;
  navigationLayout: 'sidebar' | 'tabs';
};

const makeStore = (partial: PartialState) => {
  const reducer = (state: PartialState = partial) => state;
  return createStore(reducer as any);
};

const renderMenuBar = (partial: PartialState) => {
  const store = makeStore(partial);
  const dispatchSpy = jest.spyOn(store, 'dispatch');
  render(
    <Provider store={store}>
      <MenuBar />
    </Provider>
  );
  return { dispatchSpy };
};

describe('MenuBar', () => {
  it('renders checked and enabled when sidebar layout allows toggle-off', () => {
    renderMenuBar({ isMenuBarEnabled: true, navigationLayout: 'sidebar' });
    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeChecked();
    expect(toggle).not.toBeDisabled();
  });

  it('keeps the toggle enabled for tabs layout', () => {
    renderMenuBar({ isMenuBarEnabled: true, navigationLayout: 'tabs' });
    expect(screen.getByRole('checkbox')).not.toBeDisabled();
  });

  it('dispatches SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED on toggle', () => {
    const { dispatchSpy } = renderMenuBar({
      isMenuBarEnabled: false,
      navigationLayout: 'sidebar',
    });

    fireEvent.click(screen.getByRole('checkbox'));

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED,
      payload: true,
    });
  });
});
