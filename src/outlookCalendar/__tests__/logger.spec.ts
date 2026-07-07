import {
  outlookDebug,
  outlookError,
  outlookEventDetail,
  outlookInfo,
  outlookLog,
  outlookWarn,
} from '../logger';
import { setupOutlookLogger } from '../logger';

jest.mock('../../store', () => ({
  select: jest.fn(),
  watch: jest.fn(),
}));

import { select, watch } from '../../store';

describe('outlook logger', () => {
  let watchCallbacks: Array<(value: boolean) => void>;

  beforeEach(() => {
    watchCallbacks = [];
    (select as jest.Mock).mockImplementation((selector: any) => {
      if (selector.toString().includes('isVerboseOutlookLoggingEnabled')) {
        return false;
      }
      if (selector.toString().includes('isDetailedEventsLoggingEnabled')) {
        return false;
      }
      return false;
    });

    (watch as jest.Mock).mockImplementation((_: unknown, cb: (enabled: boolean) => void) => {
      watchCallbacks.push(cb);
      cb(false);
      return () => undefined;
    });

    jest.clearAllMocks();
  });

  it('sets log flags during setup from store selectors', () => {
    (select as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(false);

    setupOutlookLogger();

    expect(select).toHaveBeenCalledTimes(2);
    expect(watch).toHaveBeenCalledTimes(2);
  });

  it('updates flags when watch callbacks are triggered', () => {
    setupOutlookLogger();

    expect(watchCallbacks).toHaveLength(2);
    watchCallbacks[0](true);
    watchCallbacks[1](true);

    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    outlookLog('verbose message');
    outlookInfo('verbose info');
    outlookDebug('verbose debug');
    outlookEventDetail('detail');
    outlookWarn('warn msg');
    expect(consoleInfoSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('suppresses logs when flags are disabled', () => {
    setupOutlookLogger();
    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    watchCallbacks[0](false);
    watchCallbacks[1](false);

    outlookLog('suppressed');
    outlookInfo('suppressed');
    outlookDebug('suppressed');
    outlookEventDetail('suppressed');
    outlookError('suppressed');

    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
