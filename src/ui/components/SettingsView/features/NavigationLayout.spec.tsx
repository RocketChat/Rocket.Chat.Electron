import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED } from '../../../actions';
import { NavigationLayout } from './NavigationLayout';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type PartialState = Pick<RootState, 'navigationLayout'>;

const makeStore = (partial: PartialState) => {
  const reducer = (state: PartialState = partial) => state;
  return createStore(reducer as any);
};

describe('NavigationLayout', () => {
  it('checks workspace tabs option when navigationLayout=tabs', () => {
    const store = makeStore({
      navigationLayout: 'tabs',
    });
    render(
      <Provider store={store}>
        <NavigationLayout />
      </Provider>
    );
    const [workspaceTabs, workspaceBar] = screen.getAllByRole('radio');
    expect(workspaceTabs).toBeChecked();
    expect(workspaceBar).not.toBeChecked();
  });

  it('checks workspace bar option when navigationLayout=sidebar', () => {
    const store = makeStore({
      navigationLayout: 'sidebar',
    });
    render(
      <Provider store={store}>
        <NavigationLayout />
      </Provider>
    );
    const [workspaceTabs, workspaceBar] = screen.getAllByRole('radio');
    expect(workspaceTabs).not.toBeChecked();
    expect(workspaceBar).toBeChecked();
  });

  it('dispatches SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED with "sidebar" when workspace bar is selected', () => {
    const store = makeStore({
      navigationLayout: 'tabs',
    });
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <NavigationLayout />
      </Provider>
    );
    const [, workspaceBar] = screen.getAllByRole('radio');
    fireEvent.click(workspaceBar);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED,
      payload: 'sidebar',
    });
  });

  it('dispatches SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED with "tabs" when workspace tabs is selected', () => {
    const store = makeStore({
      navigationLayout: 'sidebar',
    });
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <NavigationLayout />
      </Provider>
    );
    const [workspaceTabs] = screen.getAllByRole('radio');
    fireEvent.click(workspaceTabs);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED,
      payload: 'tabs',
    });
  });

  it('keeps all workspace switcher options enabled regardless of menu bar state', () => {
    const store = makeStore({
      navigationLayout: 'sidebar',
    });
    render(
      <Provider store={store}>
        <NavigationLayout />
      </Provider>
    );
    const radios = screen.getAllByRole('radio');
    for (const radio of radios) {
      expect(radio).not.toBeDisabled();
    }
  });
});
