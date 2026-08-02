import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ComponentType } from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import {
  SETTINGS_SET_DEBUG_LOGGING_CHANGED,
  SETTINGS_SET_DETAILED_EVENTS_LOGGING_CHANGED,
  SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED,
  SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED,
  SETTINGS_SET_INTERNALVIDEOCHATWINDOW_OPT_IN_CHANGED,
  SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED,
  SETTINGS_SET_IS_TRAY_ICON_ENABLED_CHANGED,
  SETTINGS_SET_IS_VIDEO_CALL_WINDOW_PERSISTENCE_ENABLED_CHANGED,
  SETTINGS_SET_REPORT_OPT_IN_CHANGED,
  SETTINGS_SET_VERBOSE_OUTLOOK_LOGGING_CHANGED,
} from '../../../actions';
import { DebugLogging } from './DebugLogging';
import { DetailedEventsLogging } from './DetailedEventsLogging';
import { FlashFrame } from './FlashFrame';
import { HardwareAcceleration } from './HardwareAcceleration';
import { InternalVideoChatWindow } from './InternalVideoChatWindow';
import { ReportErrors } from './ReportErrors';
import { TransparentWindow } from './TransparentWindow';
import { TrayIcon } from './TrayIcon';
import { VerboseOutlookLogging } from './VerboseOutlookLogging';
import { VideoCallWindowPersistence } from './VideoCallWindowPersistence';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type ToggleCase = {
  name: string;
  Component: ComponentType;
  stateKey: string;
  actionType: string;
  extraState?: Record<string, unknown>;
};

const makeStore = (partial: Record<string, unknown>) => {
  const reducer = (state: Record<string, unknown> = partial) => state;
  return createStore(reducer as any);
};

const renderWithState = (
  Component: ComponentType,
  state: Record<string, unknown>
) => {
  const store = makeStore(state);
  const dispatchSpy = jest.spyOn(store, 'dispatch');
  const view = render(
    <Provider store={store}>
      <Component />
    </Provider>
  );
  return { store, dispatchSpy, ...view };
};

const simpleToggles: ToggleCase[] = [
  {
    name: 'DebugLogging',
    Component: DebugLogging,
    stateKey: 'isDebugLoggingEnabled',
    actionType: SETTINGS_SET_DEBUG_LOGGING_CHANGED,
  },
  {
    name: 'DetailedEventsLogging',
    Component: DetailedEventsLogging,
    stateKey: 'isDetailedEventsLoggingEnabled',
    actionType: SETTINGS_SET_DETAILED_EVENTS_LOGGING_CHANGED,
  },
  {
    name: 'HardwareAcceleration',
    Component: HardwareAcceleration,
    stateKey: 'isHardwareAccelerationEnabled',
    actionType: SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED,
  },
  {
    name: 'ReportErrors',
    Component: ReportErrors,
    stateKey: 'isReportEnabled',
    actionType: SETTINGS_SET_REPORT_OPT_IN_CHANGED,
  },
  {
    name: 'TrayIcon',
    Component: TrayIcon,
    stateKey: 'isTrayIconEnabled',
    actionType: SETTINGS_SET_IS_TRAY_ICON_ENABLED_CHANGED,
  },
  {
    name: 'TransparentWindow',
    Component: TransparentWindow,
    stateKey: 'isTransparentWindowEnabled',
    actionType: SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED,
  },
  {
    name: 'VerboseOutlookLogging',
    Component: VerboseOutlookLogging,
    stateKey: 'isVerboseOutlookLoggingEnabled',
    actionType: SETTINGS_SET_VERBOSE_OUTLOOK_LOGGING_CHANGED,
  },
  {
    name: 'VideoCallWindowPersistence',
    Component: VideoCallWindowPersistence,
    stateKey: 'isVideoCallWindowPersistenceEnabled',
    actionType: SETTINGS_SET_IS_VIDEO_CALL_WINDOW_PERSISTENCE_ENABLED_CHANGED,
  },
  {
    name: 'InternalVideoChatWindow',
    Component: InternalVideoChatWindow,
    stateKey: 'isInternalVideoChatWindowEnabled',
    actionType: SETTINGS_SET_INTERNALVIDEOCHATWINDOW_OPT_IN_CHANGED,
  },
  {
    name: 'FlashFrame',
    Component: FlashFrame,
    stateKey: 'isFlashFrameEnabled',
    actionType: SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED,
  },
];

describe.each(simpleToggles)(
  '$name',
  ({ Component, stateKey, actionType, extraState = {} }) => {
    it('renders unchecked when setting is false', () => {
      renderWithState(Component, { [stateKey]: false, ...extraState });
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('renders checked when setting is true', () => {
      renderWithState(Component, { [stateKey]: true, ...extraState });
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('dispatches change action on toggle', () => {
      const { dispatchSpy } = renderWithState(Component, {
        [stateKey]: false,
        ...extraState,
      });

      fireEvent.click(screen.getByRole('checkbox'));

      expect(dispatchSpy).toHaveBeenCalledWith({
        type: actionType,
        payload: true,
      });
    });
  }
);
