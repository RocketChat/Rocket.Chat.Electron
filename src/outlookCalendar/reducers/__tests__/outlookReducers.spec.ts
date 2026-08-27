import { APP_SETTINGS_LOADED } from '../../../app/actions';
import { SETTINGS_SET_OUTLOOK_CALENDAR_SYNC_INTERVAL_CHANGED } from '../../../ui/actions';
import { allowInsecureOutlookConnections } from '../allowInsecureOutlookConnections';
import { outlookCalendarSyncInterval } from '../outlookCalendarSyncInterval';
import { outlookCalendarSyncIntervalOverride } from '../outlookCalendarSyncIntervalOverride';

describe('outlookCalendar reducers', () => {
  describe('outlookCalendarSyncInterval', () => {
    it('returns default and updates from settings action', () => {
      expect(outlookCalendarSyncInterval(undefined, { type: 'x' } as any)).toBe(
        60
      );
      expect(
        outlookCalendarSyncInterval(60, {
          type: SETTINGS_SET_OUTLOOK_CALENDAR_SYNC_INTERVAL_CHANGED,
          payload: 30,
        } as any)
      ).toBe(30);
      expect(
        outlookCalendarSyncInterval(60, {
          type: APP_SETTINGS_LOADED,
          payload: { outlookCalendarSyncInterval: 5 },
        } as any)
      ).toBe(5);
    });
  });

  describe('outlookCalendarSyncIntervalOverride', () => {
    it('loads override from settings', () => {
      expect(
        outlookCalendarSyncIntervalOverride(undefined, { type: 'x' } as any)
      ).toBeNull();
      expect(
        outlookCalendarSyncIntervalOverride(null, {
          type: APP_SETTINGS_LOADED,
          payload: { outlookCalendarSyncIntervalOverride: 20 },
        } as any)
      ).toBe(20);
      expect(
        outlookCalendarSyncIntervalOverride(20, {
          type: APP_SETTINGS_LOADED,
          payload: { outlookCalendarSyncIntervalOverride: null },
        } as any)
      ).toBeNull();
    });
  });

  describe('allowInsecureOutlookConnections', () => {
    it('loads from settings', () => {
      expect(
        allowInsecureOutlookConnections(undefined, { type: 'x' } as any)
      ).toBe(false);
      expect(
        allowInsecureOutlookConnections(false, {
          type: APP_SETTINGS_LOADED,
          payload: { allowInsecureOutlookConnections: true },
        } as any)
      ).toBe(true);
    });
  });
});
