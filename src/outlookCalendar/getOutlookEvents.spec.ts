import { LegacyFreeBusyStatus, ExchangeService } from 'ews-javascript-api';

import { getOutlookEvents } from './getOutlookEvents';
import type { OutlookCredentials, AppointmentData } from './type';

// Mock the entire ews-javascript-api module
jest.mock('ews-javascript-api', () => {
  const actual = jest.requireActual('ews-javascript-api');
  return {
    ...actual,
    ExchangeService: jest.fn().mockImplementation(() => ({
      Credentials: null,
      Url: null,
      FindAppointments: jest.fn(),
      LoadPropertiesForItems: jest.fn(),
    })),
    ConfigurationApi: {
      ConfigureXHR: jest.fn(),
    },
  };
});

jest.mock('@ewsjs/xhr', () => ({
  XhrApi: jest.fn().mockImplementation(() => ({
    useNtlmAuthentication: jest.fn(),
  })),
}));

describe('getOutlookEvents - Timezone Handling', () => {
  const mockCredentials: OutlookCredentials = {
    login: 'test@example.com',
    password: 'password123',
    userId: 'user-123',
    serverUrl: 'https://exchange.example.com',
  };

  const testDate = new Date('2025-10-08T00:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Timezone Format Verification', () => {
    it('should preserve timezone offset using Format() instead of ToISOString()', async () => {
      // Mock DateTime objects with timezone offset (simulating Exchange Server in GMT+3)
      const mockStartDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T09:37:00.000+03:00'),
        ToISOString: jest.fn().mockReturnValue('2025-10-08T06:37:00.000Z'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 09:37:00 GMT+0300'),
      };

      const mockEndDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T10:37:00.000+03:00'),
        ToISOString: jest.fn().mockReturnValue('2025-10-08T07:37:00.000Z'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 10:37:00 GMT+0300'),
      };

      const mockAppointment = {
        Id: { UniqueId: 'test-appointment-id' },
        Subject: 'Team Meeting',
        Start: mockStartDateTime,
        End: mockEndDateTime,
        Body: { Text: 'Test meeting description' },
        IsAllDayEvent: false,
        IsCancelled: false,
        JoinOnlineMeetingUrl: undefined,
        ReminderMinutesBeforeStart: 15,
        LegacyFreeBusyStatus: LegacyFreeBusyStatus.Busy,
      };

      (
        ExchangeService as jest.MockedClass<typeof ExchangeService>
      ).mockImplementation((() => ({
        Credentials: null,
        Url: null,
        FindAppointments: jest.fn().mockResolvedValue({
          Items: [mockAppointment],
        }),
        LoadPropertiesForItems: jest.fn().mockResolvedValue(undefined),
      })) as any);

      const result = await getOutlookEvents(mockCredentials, testDate);

      // Verify Format() is called (new behavior)
      expect(mockStartDateTime.Format).toHaveBeenCalledWith(
        'YYYY-MM-DDTHH:mm:ss.SSSZ'
      );
      expect(mockEndDateTime.Format).toHaveBeenCalledWith(
        'YYYY-MM-DDTHH:mm:ss.SSSZ'
      );

      // Verify ToISOString() is NOT used for timestamps (would be old behavior)
      expect(mockStartDateTime.ToISOString).not.toHaveBeenCalled();
      expect(mockEndDateTime.ToISOString).not.toHaveBeenCalled();

      // Verify the result contains timezone-aware timestamps
      expect(result).toHaveLength(1);
      expect(result[0].startTime).toBe('2025-10-08T09:37:00.000+03:00');
      expect(result[0].endTime).toBe('2025-10-08T10:37:00.000+03:00');
    });

    it('should demonstrate the old behavior would have lost timezone info', async () => {
      // This test shows what the OLD behavior would have produced
      const mockStartDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T09:37:00.000+03:00'),
        ToISOString: jest.fn().mockReturnValue('2025-10-08T06:37:00.000Z'), // UTC conversion
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 09:37:00 GMT+0300'),
      };

      const mockEndDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T10:37:00.000+03:00'),
        ToISOString: jest.fn().mockReturnValue('2025-10-08T07:37:00.000Z'), // UTC conversion
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 10:37:00 GMT+0300'),
      };

      // The old behavior: startTime: appointment.Start.ToISOString()
      // eslint-disable-next-line new-cap
      const oldBehaviorStart = mockStartDateTime.ToISOString();
      // eslint-disable-next-line new-cap
      const oldBehaviorEnd = mockEndDateTime.ToISOString();

      // The new behavior: startTime: appointment.Start.Format('YYYY-MM-DDTHH:mm:ss.SSSZ')
      // eslint-disable-next-line new-cap
      const newBehaviorStart = mockStartDateTime.Format(
        'YYYY-MM-DDTHH:mm:ss.SSSZ'
      );
      // eslint-disable-next-line new-cap
      const newBehaviorEnd = mockEndDateTime.Format('YYYY-MM-DDTHH:mm:ss.SSSZ');

      // Demonstrate the difference
      expect(oldBehaviorStart).toBe('2025-10-08T06:37:00.000Z'); // Wrong: UTC, loses +03:00
      expect(newBehaviorStart).toBe('2025-10-08T09:37:00.000+03:00'); // Correct: preserves timezone

      expect(oldBehaviorEnd).toBe('2025-10-08T07:37:00.000Z'); // Wrong: UTC, loses +03:00
      expect(newBehaviorEnd).toBe('2025-10-08T10:37:00.000+03:00'); // Correct: preserves timezone

      // The 3-hour difference reported by customer
      const oldHour = parseInt(oldBehaviorStart.substring(11, 13));
      const newHour = parseInt(newBehaviorStart.substring(11, 13));
      expect(newHour - oldHour).toBe(3); // 09:37 - 06:37 = 3 hours
    });
  });

  describe('Different Timezone Scenarios', () => {
    it('should handle GMT+2 (Exchange Server timezone)', async () => {
      const mockStartDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T09:00:00.000+02:00'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 09:00:00 GMT+0200'),
      };

      const mockEndDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T10:00:00.000+02:00'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 10:00:00 GMT+0200'),
      };

      const mockAppointment = {
        Id: { UniqueId: 'test-id' },
        Subject: 'Test',
        Start: mockStartDateTime,
        End: mockEndDateTime,
        Body: { Text: '' },
        IsAllDayEvent: false,
        IsCancelled: false,
        LegacyFreeBusyStatus: LegacyFreeBusyStatus.Free,
      };

      (
        ExchangeService as jest.MockedClass<typeof ExchangeService>
      ).mockImplementation((() => ({
        Credentials: null,
        Url: null,
        FindAppointments: jest.fn().mockResolvedValue({
          Items: [mockAppointment],
        }),
        LoadPropertiesForItems: jest.fn().mockResolvedValue(undefined),
      })) as any);

      const result = await getOutlookEvents(mockCredentials, testDate);

      expect(result[0].startTime).toContain('+02:00');
      expect(result[0].endTime).toContain('+02:00');
    });

    it('should handle UTC timezone (Z notation)', async () => {
      const mockStartDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T09:00:00.000Z'),
        toString: jest.fn().mockReturnValue('Wed Oct 08 2025 09:00:00 GMT'),
      };

      const mockEndDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T10:00:00.000Z'),
        toString: jest.fn().mockReturnValue('Wed Oct 08 2025 10:00:00 GMT'),
      };

      const mockAppointment = {
        Id: { UniqueId: 'test-id' },
        Subject: 'UTC Meeting',
        Start: mockStartDateTime,
        End: mockEndDateTime,
        Body: { Text: '' },
        IsAllDayEvent: false,
        IsCancelled: false,
        LegacyFreeBusyStatus: LegacyFreeBusyStatus.Free,
      };

      (
        ExchangeService as jest.MockedClass<typeof ExchangeService>
      ).mockImplementation((() => ({
        Credentials: null,
        Url: null,
        FindAppointments: jest.fn().mockResolvedValue({
          Items: [mockAppointment],
        }),
        LoadPropertiesForItems: jest.fn().mockResolvedValue(undefined),
      })) as any);

      const result = await getOutlookEvents(mockCredentials, testDate);

      expect(result[0].startTime).toContain('Z');
      expect(result[0].endTime).toContain('Z');
    });

    it('should handle negative timezone offsets (Western Hemisphere)', async () => {
      const mockStartDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T09:00:00.000-05:00'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 09:00:00 GMT-0500'),
      };

      const mockEndDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T10:00:00.000-05:00'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 10:00:00 GMT-0500'),
      };

      const mockAppointment = {
        Id: { UniqueId: 'test-id' },
        Subject: 'NY Meeting',
        Start: mockStartDateTime,
        End: mockEndDateTime,
        Body: { Text: '' },
        IsAllDayEvent: false,
        IsCancelled: false,
        LegacyFreeBusyStatus: LegacyFreeBusyStatus.Free,
      };

      (
        ExchangeService as jest.MockedClass<typeof ExchangeService>
      ).mockImplementation((() => ({
        Credentials: null,
        Url: null,
        FindAppointments: jest.fn().mockResolvedValue({
          Items: [mockAppointment],
        }),
        LoadPropertiesForItems: jest.fn().mockResolvedValue(undefined),
      })) as any);

      const result = await getOutlookEvents(mockCredentials, testDate);

      expect(result[0].startTime).toContain('-05:00');
      expect(result[0].endTime).toContain('-05:00');
    });
  });

  describe('Complete Appointment Data Mapping', () => {
    it('should map all appointment fields correctly with timezone-aware timestamps', async () => {
      const mockStartDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T14:30:00.000+03:00'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 14:30:00 GMT+0300'),
      };

      const mockEndDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T15:30:00.000+03:00'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 15:30:00 GMT+0300'),
      };

      const mockAppointment = {
        Id: { UniqueId: 'full-test-id-123' },
        Subject: 'Important Client Meeting',
        Start: mockStartDateTime,
        End: mockEndDateTime,
        Body: { Text: 'Discuss Q4 roadmap and deliverables' },
        IsAllDayEvent: false,
        IsCancelled: false,
        JoinOnlineMeetingUrl: 'https://teams.microsoft.com/meet/xyz',
        ReminderMinutesBeforeStart: 30,
        LegacyFreeBusyStatus: LegacyFreeBusyStatus.Busy,
      };

      (
        ExchangeService as jest.MockedClass<typeof ExchangeService>
      ).mockImplementation((() => ({
        Credentials: null,
        Url: null,
        FindAppointments: jest.fn().mockResolvedValue({
          Items: [mockAppointment],
        }),
        LoadPropertiesForItems: jest.fn().mockResolvedValue(undefined),
      })) as any);

      const result = await getOutlookEvents(mockCredentials, testDate);

      expect(result).toHaveLength(1);

      const appointment: AppointmentData = result[0];

      // Verify timezone-aware timestamps
      expect(appointment.startTime).toBe('2025-10-08T14:30:00.000+03:00');
      expect(appointment.endTime).toBe('2025-10-08T15:30:00.000+03:00');

      // Verify ISO 8601 format with timezone
      expect(appointment.startTime).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/
      );
      expect(appointment.endTime).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/
      );

      // Verify all other fields
      expect(appointment.id).toBe('full-test-id-123');
      expect(appointment.subject).toBe('Important Client Meeting');
      expect(appointment.description).toBe(
        'Discuss Q4 roadmap and deliverables'
      );
      expect(appointment.isAllDay).toBe(false);
      expect(appointment.isCanceled).toBe(false);
      expect(appointment.meetingUrl).toBe(
        'https://teams.microsoft.com/meet/xyz'
      );
      expect(appointment.reminderMinutesBeforeStart).toBe(30);
      expect(appointment.busy).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle appointments without body text', async () => {
      const mockStartDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T09:00:00.000+03:00'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 09:00:00 GMT+0300'),
      };

      const mockEndDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T10:00:00.000+03:00'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 10:00:00 GMT+0300'),
      };

      const mockAppointment = {
        Id: { UniqueId: 'no-body-id' },
        Subject: 'Quick Sync',
        Start: mockStartDateTime,
        End: mockEndDateTime,
        Body: undefined, // No body
        IsAllDayEvent: false,
        IsCancelled: false,
        LegacyFreeBusyStatus: LegacyFreeBusyStatus.Free,
      };

      (
        ExchangeService as jest.MockedClass<typeof ExchangeService>
      ).mockImplementation((() => ({
        Credentials: null,
        Url: null,
        FindAppointments: jest.fn().mockResolvedValue({
          Items: [mockAppointment],
        }),
        LoadPropertiesForItems: jest.fn().mockResolvedValue(undefined),
      })) as any);

      const result = await getOutlookEvents(mockCredentials, testDate);

      expect(result[0].description).toBe('');
      expect(result[0].startTime).toBe('2025-10-08T09:00:00.000+03:00');
    });

    it('should handle all-day events with timezone', async () => {
      const mockStartDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T00:00:00.000+03:00'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 00:00:00 GMT+0300'),
      };

      const mockEndDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T23:59:59.999+03:00'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 23:59:59 GMT+0300'),
      };

      const mockAppointment = {
        Id: { UniqueId: 'all-day-id' },
        Subject: 'Conference Day',
        Start: mockStartDateTime,
        End: mockEndDateTime,
        Body: { Text: 'All day conference' },
        IsAllDayEvent: true,
        IsCancelled: false,
        LegacyFreeBusyStatus: LegacyFreeBusyStatus.Busy,
      };

      (
        ExchangeService as jest.MockedClass<typeof ExchangeService>
      ).mockImplementation((() => ({
        Credentials: null,
        Url: null,
        FindAppointments: jest.fn().mockResolvedValue({
          Items: [mockAppointment],
        }),
        LoadPropertiesForItems: jest.fn().mockResolvedValue(undefined),
      })) as any);

      const result = await getOutlookEvents(mockCredentials, testDate);

      expect(result[0].isAllDay).toBe(true);
      expect(result[0].startTime).toContain('+03:00');
      expect(result[0].endTime).toContain('+03:00');
    });

    it('should handle multiple appointments with different timezones', async () => {
      const mockAppointment1 = {
        Id: { UniqueId: 'meeting-1' },
        Subject: 'Morning Meeting',
        Start: {
          Format: jest.fn().mockReturnValue('2025-10-08T09:00:00.000+02:00'),
          toString: jest
            .fn()
            .mockReturnValue('Wed Oct 08 2025 09:00:00 GMT+0200'),
        },
        End: {
          Format: jest.fn().mockReturnValue('2025-10-08T10:00:00.000+02:00'),
          toString: jest
            .fn()
            .mockReturnValue('Wed Oct 08 2025 10:00:00 GMT+0200'),
        },
        Body: { Text: 'First meeting' },
        IsAllDayEvent: false,
        IsCancelled: false,
        LegacyFreeBusyStatus: LegacyFreeBusyStatus.Busy,
      };

      const mockAppointment2 = {
        Id: { UniqueId: 'meeting-2' },
        Subject: 'Afternoon Call',
        Start: {
          Format: jest.fn().mockReturnValue('2025-10-08T15:00:00.000+03:00'),
          toString: jest
            .fn()
            .mockReturnValue('Wed Oct 08 2025 15:00:00 GMT+0300'),
        },
        End: {
          Format: jest.fn().mockReturnValue('2025-10-08T16:00:00.000+03:00'),
          toString: jest
            .fn()
            .mockReturnValue('Wed Oct 08 2025 16:00:00 GMT+0300'),
        },
        Body: { Text: 'Second meeting' },
        IsAllDayEvent: false,
        IsCancelled: false,
        LegacyFreeBusyStatus: LegacyFreeBusyStatus.Free,
      };

      (
        ExchangeService as jest.MockedClass<typeof ExchangeService>
      ).mockImplementation((() => ({
        Credentials: null,
        Url: null,
        FindAppointments: jest
          .fn()
          .mockResolvedValue({ Items: [mockAppointment1, mockAppointment2] }),
        LoadPropertiesForItems: jest.fn().mockResolvedValue(undefined),
      })) as any);

      const result = await getOutlookEvents(mockCredentials, testDate);

      expect(result).toHaveLength(2);
      expect(result[0].startTime).toContain('+02:00');
      expect(result[1].startTime).toContain('+03:00');
    });
  });

  describe('Console Logging', () => {
    it('should log appointment details with timezone for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      const mockStartDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T09:37:00.000+03:00'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 09:37:00 GMT+0300'),
      };

      const mockEndDateTime = {
        Format: jest.fn().mockReturnValue('2025-10-08T10:37:00.000+03:00'),
        toString: jest
          .fn()
          .mockReturnValue('Wed Oct 08 2025 10:37:00 GMT+0300'),
      };

      const mockAppointment = {
        Id: { UniqueId: 'log-test-id' },
        Subject: 'Debug Meeting',
        Start: mockStartDateTime,
        End: mockEndDateTime,
        Body: { Text: '' },
        IsAllDayEvent: false,
        IsCancelled: false,
        LegacyFreeBusyStatus: LegacyFreeBusyStatus.Free,
      };

      (
        ExchangeService as jest.MockedClass<typeof ExchangeService>
      ).mockImplementation((() => ({
        Credentials: null,
        Url: null,
        FindAppointments: jest.fn().mockResolvedValue({
          Items: [mockAppointment],
        }),
        LoadPropertiesForItems: jest.fn().mockResolvedValue(undefined),
      })) as any);

      await getOutlookEvents(mockCredentials, testDate);

      // Verify logging includes timezone info
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Outlook Sync] Appointment:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Debug Meeting')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('2025-10-08T09:37:00.000+03:00')
      );
    });
  });
});
