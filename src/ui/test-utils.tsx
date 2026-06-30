/* eslint-disable import/export */
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { Provider } from 'react-redux';
import type { Store } from 'redux';
import { createStore } from 'redux';

import type { RootState } from '../store/rootReducer';
import { rootReducer } from '../store/rootReducer';

/*
 * i18n strategy for component specs:
 * components use `useTranslation` / `Trans` from `react-i18next`. To keep
 * specs deterministic (no async i18n boot, translation keys returned verbatim)
 * each spec file MUST declare the mock below at the TOP of the file. The mock
 * cannot live in this helper — jest.mock only hoists when it sits in the spec
 * module itself. Copy this block into every component spec:
 *
 *   jest.mock('react-i18next', () => ({
 *     useTranslation: () => ({
 *       t: (key: string) => key,
 *       i18n: { language: 'en', changeLanguage: jest.fn() },
 *     }),
 *     Trans: ({ children }: { children: React.ReactNode }) => children,
 *     initReactI18next: { type: '3rdParty', init: () => {} },
 *   }));
 */

type RenderWithStoreOptions = Omit<RenderOptions, 'wrapper'> & {
  preloadedState?: Partial<RootState>;
  store?: Store;
};

export const renderWithStore = (
  ui: ReactElement<any>,
  {
    preloadedState,
    store = createStore(rootReducer, preloadedState as any),
    ...renderOptions
  }: RenderWithStoreOptions = {}
) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

export * from '@testing-library/react';
export { userEvent };
