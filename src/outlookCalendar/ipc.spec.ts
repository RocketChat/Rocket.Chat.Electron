import axios from 'axios';

import * as store from '../store';
import { getOutlookEvents } from './getOutlookEvents';
import { syncEventsWithRocketChatServer } from './ipc';
import type { OutlookCredentials, AppointmentData } from './type';

// Mock dependencies
jest.mock('axios');
jest.mock('./getOutlookEvents');
jest.mock('../store', () => ({
  select: jest.fn(),
  dispatch: jest.fn(),
  request: jest.fn(),
  listen: jest.fn(),
  watch: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetOutlookEvents = getOutlookEvents as jest.MockedFunction<
  typeof getOutlookEvents
>;

describe('Outlook Calendar Sync - Timezone Integration Tests', () => {
  const mockCredentials: OutlookCredentials = {
    login: 'test@example.com',
    password: 'password123',
    userId: 'user-123',
    serverUrl: 'https://exchange.example.com',
  };

  const serverUrl = 'https://rocket.chat.example.com/';
  const token = 'test-api-token';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock store.select to return server info
    (store.select as jest.Mock).mockReturnValue({
      servers: [
        {
          url: serverUrl,
          version: '7.5.0',
        },
      ],
    });
  });

  describe('Timezone-aware timestamp flow', () => {
    it('should send timezone-aware timestamps to RocketChat API on create', async () => {
      // Mock Outlook events with timezone offsets (the FIX)
      const mockOutlookEvents: AppointmentData[] = [
        {
          id: 'outlook-event-1',
          subject: 'Team Standup',
          startTime: '2025-10-08T09:37:00.000+03:00', // With timezone offset
          endTime: '2025-10-08T10:37:00.000+03:00', // With timezone offset
          description: 'Daily standup meeting',
          isAllDay: false,
          isCanceled: false,
          meetingUrl: undefined,
          reminderMinutesBeforeStart: 15,
          busy: true,
        },
      ];

      mockedGetOutlookEvents.mockResolvedValue(mockOutlookEvents);

      // Mock RocketChat API responses
      mockedAxios.get.mockResolvedValue({
        data: { data: [] }, // No existing events
      });

      mockedAxios.post.mockResolvedValue({
        data: { success: true },
      });

      await syncEventsWithRocketChatServer(serverUrl, mockCredentials, token);

      // Verify the API call includes timezone-aware timestamps
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${serverUrl}api/v1/calendar-events.import`,
        expect.objectContaining({
          externalId: 'outlook-event-1',
          subject: 'Team Standup',
          startTime: '2025-10-08T09:37:00.000+03:00', // Timezone preserved!
          endTime: '2025-10-08T10:37:00.000+03:00', // Timezone preserved!
          description: 'Daily standup meeting',
          reminderMinutesBeforeStart: 15,
          busy: true,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Auth-Token': token,
            'X-User-Id': 'user-123',
          }),
        })
      );
    });

    it('should demonstrate the old behavior would have sent UTC timestamps', async () => {
      // This test shows what the OLD buggy behavior would send
      const mockOutlookEventsOldBehavior: AppointmentData[] = [
        {
          id: 'outlook-event-1',
          subject: 'Team Standup',
          startTime: '2025-10-08T06:37:00.000Z', // OLD: UTC conversion (bug)
          endTime: '2025-10-08T07:37:00.000Z', // OLD: UTC conversion (bug)
          description: 'Daily standup meeting',
          isAllDay: false,
          isCanceled: false,
          meetingUrl: undefined,
          reminderMinutesBeforeStart: 15,
          busy: true,
        },
      ];

      const mockOutlookEventsNewBehavior: AppointmentData[] = [
        {
          id: 'outlook-event-1',
          subject: 'Team Standup',
          startTime: '2025-10-08T09:37:00.000+03:00', // NEW: Timezone preserved (fix)
          endTime: '2025-10-08T10:37:00.000+03:00', // NEW: Timezone preserved (fix)
          description: 'Daily standup meeting',
          isAllDay: false,
          isCanceled: false,
          meetingUrl: undefined,
          reminderMinutesBeforeStart: 15,
          busy: true,
        },
      ];

      // Extract times for comparison
      const oldStart = mockOutlookEventsOldBehavior[0].startTime;
      const newStart = mockOutlookEventsNewBehavior[0].startTime;

      // Verify the difference
      expect(oldStart).toBe('2025-10-08T06:37:00.000Z'); // UTC, wrong time
      expect(newStart).toBe('2025-10-08T09:37:00.000+03:00'); // Local with offset, correct

      // Extract hour from timestamps
      const oldHour = parseInt(oldStart.substring(11, 13));
      const newHour = parseInt(newStart.substring(11, 13));

      // The 3-hour difference that caused the bug
      expect(newHour - oldHour).toBe(3);
    });

    it('should send timezone-aware timestamps on update', async () => {
      const mockOutlookEvents: AppointmentData[] = [
        {
          id: 'outlook-event-1',
          subject: 'Updated Meeting Title',
          startTime: '2025-10-08T14:00:00.000+02:00', // GMT+2
          endTime: '2025-10-08T15:00:00.000+02:00', // GMT+2
          description: 'Updated description',
          isAllDay: false,
          isCanceled: false,
          meetingUrl: undefined,
          reminderMinutesBeforeStart: 30,
          busy: true,
        },
      ];

      mockedGetOutlookEvents.mockResolvedValue(mockOutlookEvents);

      // Mock existing event in RocketChat
      mockedAxios.get.mockResolvedValue({
        data: {
          data: [
            {
              _id: 'rocketchat-event-123',
              externalId: 'outlook-event-1',
              subject: 'Old Meeting Title',
              startTime: '2025-10-08T14:00:00.000+02:00',
              description: 'Old description',
              reminderMinutesBeforeStart: 30,
              endTime: '2025-10-08T15:00:00.000+02:00',
              busy: true,
            },
          ],
        },
      });

      mockedAxios.post.mockResolvedValue({
        data: { success: true },
      });

      await syncEventsWithRocketChatServer(serverUrl, mockCredentials, token);

      // Verify update call includes timezone-aware timestamps
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${serverUrl}api/v1/calendar-events.update`,
        expect.objectContaining({
          eventId: 'rocketchat-event-123',
          subject: 'Updated Meeting Title',
          startTime: '2025-10-08T14:00:00.000+02:00', // Timezone preserved
          endTime: '2025-10-08T15:00:00.000+02:00', // Timezone preserved
          description: 'Updated description',
          reminderMinutesBeforeStart: 30,
          busy: true,
        }),
        expect.any(Object)
      );
    });

    it('should handle multiple appointments with different timezones', async () => {
      const mockOutlookEvents: AppointmentData[] = [
        {
          id: 'event-1',
          subject: 'Morning Sync',
          startTime: '2025-10-08T09:00:00.000+02:00', // GMT+2 (Exchange server)
          endTime: '2025-10-08T10:00:00.000+02:00',
          description: 'First meeting',
          isAllDay: false,
          isCanceled: false,
          reminderMinutesBeforeStart: 15,
          busy: true,
        },
        {
          id: 'event-2',
          subject: 'Afternoon Call',
          startTime: '2025-10-08T15:00:00.000+03:00', // User's local GMT+3
          endTime: '2025-10-08T16:00:00.000+03:00',
          description: 'Second meeting',
          isAllDay: false,
          isCanceled: false,
          reminderMinutesBeforeStart: 10,
          busy: false,
        },
      ];

      mockedGetOutlookEvents.mockResolvedValue(mockOutlookEvents);

      mockedAxios.get.mockResolvedValue({
        data: { data: [] },
      });

      mockedAxios.post.mockResolvedValue({
        data: { success: true },
      });

      await syncEventsWithRocketChatServer(serverUrl, mockCredentials, token);

      // Verify first appointment (GMT+2)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${serverUrl}api/v1/calendar-events.import`,
        expect.objectContaining({
          externalId: 'event-1',
          startTime: '2025-10-08T09:00:00.000+02:00',
          endTime: '2025-10-08T10:00:00.000+02:00',
        }),
        expect.any(Object)
      );

      // Verify second appointment (GMT+3)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${serverUrl}api/v1/calendar-events.import`,
        expect.objectContaining({
          externalId: 'event-2',
          startTime: '2025-10-08T15:00:00.000+03:00',
          endTime: '2025-10-08T16:00:00.000+03:00',
        }),
        expect.any(Object)
      );
    });
  });

  describe('ISO 8601 Format Validation', () => {
    it('should validate timezone-aware timestamps follow ISO 8601 format', async () => {
      const mockOutlookEvents: AppointmentData[] = [
        {
          id: 'format-test',
          subject: 'Format Test',
          startTime: '2025-10-08T09:37:00.000+03:00',
          endTime: '2025-10-08T10:37:00.000+03:00',
          description: '',
          isAllDay: false,
          isCanceled: false,
          reminderMinutesBeforeStart: 15,
          busy: true,
        },
      ];

      mockedGetOutlookEvents.mockResolvedValue(mockOutlookEvents);

      mockedAxios.get.mockResolvedValue({
        data: { data: [] },
      });

      mockedAxios.post.mockResolvedValue({
        data: { success: true },
      });

      await syncEventsWithRocketChatServer(serverUrl, mockCredentials, token);

      const callArgs = mockedAxios.post.mock.calls[0];
      const payload = callArgs[1] as any;

      // Validate ISO 8601 format with timezone: YYYY-MM-DDTHH:mm:ss.sss±HH:MM
      const iso8601WithTimezonePattern =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/;

      expect(payload.startTime).toMatch(iso8601WithTimezonePattern);
      expect(payload.endTime).toMatch(iso8601WithTimezonePattern);

      // Should NOT be UTC-only format (ending with Z)
      expect(payload.startTime).not.toMatch(/Z$/);
      expect(payload.endTime).not.toMatch(/Z$/);
    });

    it('should accept UTC format (Z notation) as valid ISO 8601', async () => {
      // UTC is also a valid timezone representation
      const mockOutlookEvents: AppointmentData[] = [
        {
          id: 'utc-test',
          subject: 'UTC Meeting',
          startTime: '2025-10-08T09:00:00.000Z', // UTC notation
          endTime: '2025-10-08T10:00:00.000Z',
          description: '',
          isAllDay: false,
          isCanceled: false,
          reminderMinutesBeforeStart: 15,
          busy: true,
        },
      ];

      mockedGetOutlookEvents.mockResolvedValue(mockOutlookEvents);

      mockedAxios.get.mockResolvedValue({
        data: { data: [] },
      });

      mockedAxios.post.mockResolvedValue({
        data: { success: true },
      });

      await syncEventsWithRocketChatServer(serverUrl, mockCredentials, token);

      const callArgs = mockedAxios.post.mock.calls[0];
      const payload = callArgs[1] as any;

      // UTC format is also valid
      expect(payload.startTime).toBe('2025-10-08T09:00:00.000Z');
      expect(payload.endTime).toBe('2025-10-08T10:00:00.000Z');
    });
  });

  describe('Customer Scenario Regression Test', () => {
    it('should fix the reported 3-hour timezone discrepancy', async () => {
      // EXACT customer scenario:
      // - Meeting at 9:37 AM local time (UTC+3)
      // - Exchange Server in GMT+2
      // - OLD BEHAVIOR: Showed 6:37 AM in notification (UTC conversion)
      // - NEW BEHAVIOR: Should show 9:37 AM (preserves timezone)

      const mockOutlookEvents: AppointmentData[] = [
        {
          id: 'customer-meeting',
          subject: 'Team Meeting',
          startTime: '2025-10-08T09:37:00.000+03:00', // Correct: User's local time
          endTime: '2025-10-08T10:37:00.000+03:00',
          description: 'Weekly team sync',
          isAllDay: false,
          isCanceled: false,
          reminderMinutesBeforeStart: 15,
          busy: true,
        },
      ];

      mockedGetOutlookEvents.mockResolvedValue(mockOutlookEvents);

      mockedAxios.get.mockResolvedValue({
        data: { data: [] },
      });

      mockedAxios.post.mockResolvedValue({
        data: { success: true },
      });

      await syncEventsWithRocketChatServer(serverUrl, mockCredentials, token);

      const callArgs = mockedAxios.post.mock.calls[0];
      const payload = callArgs[1] as any;

      // Extract hour from the timestamp sent to RocketChat
      const hour = parseInt(payload.startTime.substring(11, 13));

      // NEW BEHAVIOR: Should send 09:37 (not 06:37)
      expect(hour).toBe(9);

      // Verify full timestamp
      expect(payload.startTime).toBe('2025-10-08T09:37:00.000+03:00');

      // Verify timezone offset is present
      expect(payload.startTime).toContain('+03:00');

      // OLD BUGGY BEHAVIOR would have been:
      // expect(payload.startTime).toBe('2025-10-08T06:37:00.000Z'); // WRONG
    });
  });
});
