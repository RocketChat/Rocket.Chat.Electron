import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { createStore } from 'redux';

import { App } from './App';

jest.mock('react-i18next', () => ({
  I18nextProvider: ({ children }: any) => children,
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('i18next', () => ({
  __esModule: true,
  default: { t: (k: string) => k, language: 'en' },
}));

jest.mock('./Shell', () => ({
  Shell: () => <div data-testid='shell'>shell</div>,
}));

jest.mock('./utils/ErrorCatcher', () => ({
  ErrorCatcher: ({ children }: any) => <>{children}</>,
}));

describe('App', () => {
  it('wraps Shell with store provider', () => {
    const store = createStore(() => ({}));
    render(<App reduxStore={store} />);
    expect(screen.getByTestId('shell')).toBeInTheDocument();
  });
});
