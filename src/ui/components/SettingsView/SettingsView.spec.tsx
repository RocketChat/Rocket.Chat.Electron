import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { SettingsView } from './SettingsView';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('./GeneralTab', () => ({
  GeneralTab: () => <div data-testid='general-tab' />,
}));
jest.mock('./CertificatesTab', () => ({
  CertificatesTab: () => <div data-testid='certificates-tab' />,
}));
jest.mock('./VoiceVideoTab', () => ({
  VoiceVideoTab: () => <div data-testid='voice-video-tab' />,
}));
jest.mock('./DeveloperTab', () => ({
  DeveloperTab: () => <div data-testid='developer-tab' />,
}));

const makeStore = (partial: Record<string, unknown>) => {
  const reducer = (state = partial) => state;
  return createStore(reducer as any);
};

describe('SettingsView', () => {
  it('is hidden when currentView is not settings', () => {
    const store = makeStore({
      currentView: 'downloads',
      isDeveloperModeEnabled: false,
    });
    const { container } = render(
      <Provider store={store}>
        <SettingsView />
      </Provider>
    );
    expect(container.firstChild).toHaveStyle({ display: 'none' });
  });

  it('shows general tab by default and switches tabs', () => {
    const store = makeStore({
      currentView: 'settings',
      isDeveloperModeEnabled: true,
    });
    render(
      <Provider store={store}>
        <SettingsView />
      </Provider>
    );

    expect(screen.getByText('settings.title')).toBeInTheDocument();
    expect(screen.getByTestId('general-tab')).toBeInTheDocument();

    fireEvent.click(screen.getByText('settings.certificates'));
    expect(screen.getByTestId('certificates-tab')).toBeInTheDocument();

    fireEvent.click(screen.getByText('settings.voiceVideo'));
    expect(screen.getByTestId('voice-video-tab')).toBeInTheDocument();

    fireEvent.click(screen.getByText('settings.developer'));
    expect(screen.getByTestId('developer-tab')).toBeInTheDocument();
  });

  it('hides developer tab when developer mode is off', () => {
    const store = makeStore({
      currentView: 'settings',
      isDeveloperModeEnabled: false,
    });
    render(
      <Provider store={store}>
        <SettingsView />
      </Provider>
    );
    expect(screen.queryByText('settings.developer')).not.toBeInTheDocument();
  });
});
