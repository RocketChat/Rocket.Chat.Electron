import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import {
  SETTINGS_SET_E2E_PDF_PREVIEW_SIZE_LIMIT_CHANGED,
  SETTINGS_SET_IS_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK_ENABLED_CHANGED,
  SETTINGS_SET_OUTLOOK_CALENDAR_SYNC_INTERVAL_CHANGED,
  SETTINGS_NTLM_CREDENTIALS_CHANGED,
  SETTINGS_SELECTED_BROWSER_CHANGED,
} from '../../../actions';
import { APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET } from '../../../../app/actions';
import { AvailableBrowsers } from './AvailableBrowsers';
import { E2ePdfPreviewSizeLimit } from './E2ePdfPreviewSizeLimit';
import { NTLMCredentials } from './NTLMCredentials';
import { OutlookCalendarSyncInterval } from './OutlookCalendarSyncInterval';
import { ScreenCaptureFallback } from './ScreenCaptureFallback';
import { ThemeAppearance } from './ThemeAppearance';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const makeStore = (partial: Record<string, unknown>) => {
  const reducer = (state = partial) => state;
  return createStore(reducer as any);
};

const renderWith = (ui: React.ReactElement, state: Record<string, unknown>) => {
  const store = makeStore(state);
  const dispatchSpy = jest.spyOn(store, 'dispatch');
  render(<Provider store={store}>{ui}</Provider>);
  return { dispatchSpy };
};

describe('more settings features', () => {
  describe('ScreenCaptureFallback', () => {
    it('dispatches toggle and disables when forced', () => {
      const { dispatchSpy } = renderWith(<ScreenCaptureFallback />, {
        isVideoCallScreenCaptureFallbackEnabled: false,
        screenCaptureFallbackForced: false,
      });
      fireEvent.click(screen.getByRole('checkbox'));
      expect(dispatchSpy).toHaveBeenCalledWith({
        type: SETTINGS_SET_IS_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK_ENABLED_CHANGED,
        payload: true,
      });
    });

    it('is disabled and shows forced description when forced', () => {
      renderWith(<ScreenCaptureFallback />, {
        isVideoCallScreenCaptureFallbackEnabled: false,
        screenCaptureFallbackForced: true,
      });
      expect(screen.getByRole('checkbox')).toBeDisabled();
      expect(
        screen.getByText(
          'settings.options.videoCallScreenCaptureFallback.forcedDescription'
        )
      ).toBeInTheDocument();
    });
  });

  describe('E2ePdfPreviewSizeLimit', () => {
    it('clamps and dispatches on change', () => {
      const { dispatchSpy } = renderWith(<E2ePdfPreviewSizeLimit />, {
        e2ePdfPreviewSizeLimit: 10,
      });
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '999' } });
      expect(dispatchSpy).toHaveBeenCalledWith({
        type: SETTINGS_SET_E2E_PDF_PREVIEW_SIZE_LIMIT_CHANGED,
        payload: 500,
      });
    });

    it('ignores non-numeric input', () => {
      const { dispatchSpy } = renderWith(<E2ePdfPreviewSizeLimit />, {
        e2ePdfPreviewSizeLimit: 10,
      });
      fireEvent.change(screen.getByRole('spinbutton'), {
        target: { value: 'abc' },
      });
      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('OutlookCalendarSyncInterval', () => {
    it('returns null when overridden', () => {
      const { container } = render(
        <Provider
          store={makeStore({
            outlookCalendarSyncIntervalOverride: 5,
            outlookCalendarSyncInterval: 15,
          })}
        >
          <OutlookCalendarSyncInterval />
        </Provider>
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('dispatches clamped interval', () => {
      const { dispatchSpy } = renderWith(<OutlookCalendarSyncInterval />, {
        outlookCalendarSyncIntervalOverride: null,
        outlookCalendarSyncInterval: 15,
      });
      fireEvent.change(screen.getByRole('spinbutton'), {
        target: { value: '0' },
      });
      expect(dispatchSpy).toHaveBeenCalledWith({
        type: SETTINGS_SET_OUTLOOK_CALENDAR_SYNC_INTERVAL_CHANGED,
        payload: 1,
      });
    });
  });

  describe('NTLMCredentials', () => {
    it('toggles and updates domains on blur', () => {
      const { dispatchSpy } = renderWith(<NTLMCredentials />, {
        isNTLMCredentialsEnabled: true,
        allowedNTLMCredentialsDomains: 'old.com',
      });
      fireEvent.click(screen.getByRole('checkbox'));
      expect(dispatchSpy).toHaveBeenCalledWith({
        type: SETTINGS_NTLM_CREDENTIALS_CHANGED,
        payload: false,
      });

      const input = screen.getByPlaceholderText(
        '*example.com, *foobar.com, *baz'
      );
      fireEvent.blur(input, { target: { value: 'new.com' } });
      expect(dispatchSpy).toHaveBeenCalledWith({
        type: APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET,
        payload: 'new.com',
      });
    });
  });

  describe('AvailableBrowsers', () => {
    it('renders loading placeholder when no browsers', () => {
      renderWith(<AvailableBrowsers />, {
        availableBrowsers: [],
        selectedBrowser: null,
      });
      expect(
        screen.getByText('settings.options.availableBrowsers.title')
      ).toBeInTheDocument();
      expect(
        screen.getByText('settings.options.availableBrowsers.description')
      ).toBeInTheDocument();
      // Fuselage Select uses aria disabled via class when empty
      expect(screen.getByRole('button').className).toMatch(/disabled/);
    });

    it('enables select when browsers are available', () => {
      renderWith(<AvailableBrowsers />, {
        availableBrowsers: ['Chrome', 'Firefox'],
        selectedBrowser: null,
      });
      expect(screen.getByRole('button').className).not.toMatch(/disabled/);
      expect(
        screen.getByText('settings.options.availableBrowsers.title')
      ).toBeInTheDocument();
      // Keep import used for type-level linkage to action constant
      expect(SETTINGS_SELECTED_BROWSER_CHANGED).toBeDefined();
    });
  });

  describe('ThemeAppearance', () => {
    it('renders theme preference field', () => {
      renderWith(<ThemeAppearance />, { userThemePreference: 'auto' });
      expect(
        screen.getByText('settings.options.themeAppearance.title')
      ).toBeInTheDocument();
      expect(
        screen.getByText('settings.options.themeAppearance.description')
      ).toBeInTheDocument();
    });
  });
});
