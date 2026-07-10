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

type PartialState = Pick<RootState, 'navigationLayout' | 'isMenuBarEnabled'>;

const makeStore = (partial: PartialState) => {
  const reducer = (state: PartialState = partial) => state;
  return createStore(reducer as any);
};

describe('NavigationLayout', () => {
  it('checks workspace tabs option when navigationLayout=tabs', () => {
    const store = makeStore({
      navigationLayout: 'tabs',
      isMenuBarEnabled: true,
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
      isMenuBarEnabled: true,
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
      isMenuBarEnabled: true,
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
      isMenuBarEnabled: true,
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

  describe('on linux with the menu bar hidden', () => {
    const originalPlatform = process.platform;

    beforeAll(() => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });
    });

    afterAll(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });

    it('disables the workspace tabs option when navigationLayout=sidebar', () => {
      const store = makeStore({
        navigationLayout: 'sidebar',
        isMenuBarEnabled: false,
      });
      render(
        <Provider store={store}>
          <NavigationLayout />
        </Provider>
      );
      const [workspaceTabs, workspaceBar] = screen.getAllByRole('radio');
      expect(workspaceTabs).toBeDisabled();
      expect(workspaceBar).not.toBeDisabled();
    });

    it('keeps the workspace tabs option enabled when navigationLayout is already tabs', () => {
      const store = makeStore({
        navigationLayout: 'tabs',
        isMenuBarEnabled: false,
      });
      render(
        <Provider store={store}>
          <NavigationLayout />
        </Provider>
      );
      const [workspaceTabs] = screen.getAllByRole('radio');
      expect(workspaceTabs).not.toBeDisabled();
    });
  });
});
