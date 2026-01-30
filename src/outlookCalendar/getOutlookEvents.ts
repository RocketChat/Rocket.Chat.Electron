/* eslint-disable new-cap */
import { XhrApi } from '@ewsjs/xhr';
import type { Appointment } from 'ews-javascript-api';
import {
  FolderId,
  CalendarView,
  DateTime,
  WellKnownFolderName,
  BasePropertySet,
  PropertySet,
  ConfigurationApi,
  WebCredentials,
  ExchangeService,
  ExchangeVersion,
  Uri,
  LegacyFreeBusyStatus,
} from 'ews-javascript-api';

import {
  createClassifiedError,
  formatErrorForLogging,
} from './errorClassification';
import { outlookLog, outlookError, outlookWarn } from './logger';
import type { OutlookCredentials, AppointmentData } from './type';

/**
 * Optional function to test basic connectivity to the Exchange server
 * This is not called by default to avoid network delays, but can be enabled for debugging
 */
const testExchangeConnectivity = async (
  exchangeUrl: string,
  timeoutMs: number = 5000
): Promise<boolean> => {
  try {
    outlookLog('Testing connectivity to Exchange server:', exchangeUrl);

    // Extract base URL for connectivity test
    const url = new URL(exchangeUrl);
    const baseUrl = `${url.protocol}//${url.host}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(baseUrl, {
      method: 'HEAD',
      signal: controller.signal,
      // Don't follow redirects for this test
      redirect: 'manual',
    });

    clearTimeout(timeoutId);

    // Any response (including errors) indicates the server is reachable
    outlookLog('Connectivity test result:', {
      url: baseUrl,
      status: response.status,
      reachable: true,
    });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outlookWarn('Connectivity test failed:', {
      url: exchangeUrl,
      error: errorMessage,
      note: 'This may be normal if the server requires authentication or has CORS restrictions',
    });

    return false;
  }
};

// Export the connectivity test function for manual testing/debugging
export const testExchangeServerConnectivity = testExchangeConnectivity;

/**
 * Connectivity testing is always enabled on this debugging branch
 */

/**
 * Sanitizes and constructs a proper Exchange Web Services (EWS) URL
 * Handles various input formats and edge cases to prevent URL construction errors
 *
 * Features:
 * - Native URL() constructor for robust parsing and validation
 * - Intelligent path segment handling to prevent duplication
 * - Support for various URL formats (base URLs, /ews paths, complete URLs)
 * - Case-insensitive path normalization
 * - Smart fallback for malformed URLs with protocol detection
 * - Automatic connectivity testing for debugging
 * - Extensive logging for troubleshooting
 *
 * @param serverUrl - The server URL from configuration (can be base URL or include EWS path)
 * @returns A properly formatted EWS endpoint URL
 *
 * Examples:
 * - 'https://mail.example.com' → 'https://mail.example.com/ews/exchange.asmx'
 * - 'https://mail.example.com/' → 'https://mail.example.com/ews/exchange.asmx'
 * - 'https://mail.example.com/ews' → 'https://mail.example.com/ews/exchange.asmx'
 * - 'https://mail.example.com/ews/' → 'https://mail.example.com/ews/exchange.asmx'
 * - 'https://mail.example.com/EWS' → 'https://mail.example.com/ews/exchange.asmx'
 * - 'https://mail.example.com/ews/exchange.asmx' → 'https://mail.example.com/ews/exchange.asmx'
 *
 * Debugging:
 * - Connectivity testing runs automatically on this debugging branch
 * - Check console logs for detailed validation information
 * - Use testExchangeServerConnectivity() function for manual connectivity testing
 */
export const sanitizeExchangeUrl = (serverUrl: string): string => {
  if (!serverUrl || typeof serverUrl !== 'string') {
    throw new Error('Invalid server URL: must be a non-empty string');
  }

  outlookLog('Starting URL sanitization for:', serverUrl);

  try {
    // Use URL constructor for parsing and validation
    const url = new URL(serverUrl);

    // Validate protocol
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(
        `Invalid protocol "${url.protocol}". Only HTTP and HTTPS are supported`
      );
    }

    // Validate hostname
    if (!url.hostname) {
      throw new Error('URL must have a valid hostname');
    }

    // Normalize and construct EWS path using URL properties
    let pathSegments = url.pathname
      .split('/')
      .filter((segment) => segment.length > 0) // Remove empty segments
      .map((segment) => segment.toLowerCase()); // Normalize case

    // Remove existing ews and exchange.asmx segments to avoid duplication
    pathSegments = pathSegments.filter(
      (segment) => segment !== 'ews' && segment !== 'exchange.asmx'
    );

    // Construct clean EWS path
    pathSegments.push('ews', 'exchange.asmx');
    url.pathname = `/${pathSegments.join('/')}`;

    const sanitizedUrl = url.toString();

    outlookLog('URL sanitization completed:', {
      input: serverUrl,
      output: sanitizedUrl,
      protocol: url.protocol,
      hostname: url.hostname,
      pathname: url.pathname,
    });

    if (!url.pathname.endsWith('/ews/exchange.asmx')) {
      throw new Error('Failed to construct proper EWS endpoint URL');
    }

    // Connectivity test for debugging
    outlookLog('Running connectivity test to check server reachability...');
    // Run connectivity test in background without blocking
    testExchangeConnectivity(sanitizedUrl).catch((error) => {
      outlookWarn('Background connectivity test failed:', {
        url: sanitizedUrl,
        error: error instanceof Error ? error.message : String(error),
        note: 'This does not affect the URL validation result',
      });
    });

    return sanitizedUrl;
  } catch (error) {
    // Enhanced fallback using URL constructor more intelligently
    outlookWarn('URL parsing failed, attempting fallback method:', {
      originalUrl: serverUrl,
      error: error instanceof Error ? error.message : String(error),
    });

    // Try to fix common URL issues
    let fallbackUrl = serverUrl.trim();

    // Add protocol if missing
    if (!fallbackUrl.match(/^https?:\/\//)) {
      fallbackUrl = `https://${fallbackUrl}`;
      outlookLog('Added default HTTPS protocol');
    }

    // Remove multiple slashes (except after protocol)
    fallbackUrl = fallbackUrl.replace(/([^:]\/)\/+/g, '$1');

    try {
      const url = new URL(fallbackUrl);

      // Validate basic requirements
      if (!url.hostname) {
        throw new Error('URL must have a valid hostname');
      }

      // Use the same clean path construction as main logic
      let pathSegments = url.pathname
        .split('/')
        .filter((segment) => segment.length > 0)
        .map((segment) => segment.toLowerCase());

      // Remove existing ews and exchange.asmx segments
      pathSegments = pathSegments.filter(
        (segment) => segment !== 'ews' && segment !== 'exchange.asmx'
      );

      // Construct clean EWS path
      pathSegments.push('ews', 'exchange.asmx');
      url.pathname = `/${pathSegments.join('/')}`;

      const finalUrl = url.toString();

      outlookLog('Fallback URL construction successful:', {
        input: serverUrl,
        fallback: fallbackUrl,
        output: finalUrl,
        protocol: url.protocol,
        hostname: url.hostname,
        pathname: url.pathname,
      });

      // Connectivity test for fallback URL too
      outlookLog('Running connectivity test on fallback URL...');
      testExchangeConnectivity(finalUrl).catch((error) => {
        outlookWarn('Fallback URL connectivity test failed:', {
          url: finalUrl,
          error: error instanceof Error ? error.message : String(error),
        });
      });

      return finalUrl;
    } catch (fallbackError) {
      const errorMessage = `Failed to create valid Exchange URL from "${serverUrl}". 
        Original error: ${error instanceof Error ? error.message : String(error)}. 
        Fallback error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}. 
        Please ensure the URL includes a valid protocol (http:// or https://) and hostname.`;

      outlookError('URL sanitization failed completely:', {
        input: serverUrl,
        originalError: error instanceof Error ? error.message : String(error),
        fallbackError:
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError),
      });

      throw new Error(errorMessage);
    }
  }
};

export const getOutlookEvents = async (
  credentials: OutlookCredentials,
  date: Date
): Promise<AppointmentData[]> => {
  outlookLog('Starting getOutlookEvents', {
    userId: credentials.userId,
    serverUrl: credentials.serverUrl,
    date: date.toISOString(),
    hasLogin: !!credentials.login,
    hasPassword: !!credentials.password,
  });

  try {
    const { login, password, serverUrl } = credentials;

    // Validate required credentials
    if (!login || !password || !serverUrl) {
      const error = new Error('Missing required Outlook credentials');
      const classifiedError = createClassifiedError(error, {
        operation: 'credential_validation',
        hasLogin: !!login,
        hasPassword: !!password,
        hasServerUrl: !!serverUrl,
        userId: credentials.userId,
      });

      outlookError(
        formatErrorForLogging(classifiedError, 'Credential validation')
      );
      throw error;
    }

    outlookLog('Initializing Exchange connection');
    // Exchange 2016 compatibility: Allow self-signed certificates
    // This is commonly needed for on-premises Exchange servers
    // NOTE: rejectUnauthorized disabled for production - uncomment for testing with self-signed certs
    const xhrApi = new XhrApi({
      decompress: true,
      // rejectUnauthorized: false, // Allows self-signed/internal CA certificates (disabled for production)
    });
    xhrApi.useNtlmAuthentication(login, password);

    ConfigurationApi.ConfigureXHR(xhrApi);

    const exchange = new ExchangeService(ExchangeVersion.Exchange2013);
    // This credentials object isn't used when ntlm is active, but the lib still requires it.
    exchange.Credentials = new WebCredentials(login, password);

    try {
      const exchangeUrl = sanitizeExchangeUrl(serverUrl);
      exchange.Url = new Uri(exchangeUrl);
      outlookLog('Exchange URL set:', exchangeUrl);
    } catch (error) {
      const classifiedError = createClassifiedError(error as Error, {
        operation: 'exchange_url_configuration',
        serverUrl,
        userId: credentials.userId,
      });

      outlookError(
        formatErrorForLogging(classifiedError, 'Exchange URL configuration')
      );

      throw new Error(
        `Invalid Exchange server URL configuration: ${classifiedError.technicalMessage}`
      );
    }

    const validatedDate = new Date(date);
    outlookLog('Searching for appointments on:', validatedDate.toDateString());

    const folderId = new FolderId(WellKnownFolderName.Calendar);
    const minTime = new DateTime(
      validatedDate.getFullYear(),
      validatedDate.getMonth() + 1,
      validatedDate.getDate()
    );
    const maxTime = new DateTime(
      validatedDate.getFullYear(),
      validatedDate.getMonth() + 1,
      validatedDate.getDate(),
      23,
      59,
      59
    );

    const view = new CalendarView(minTime, maxTime);
    let appointments: Appointment[] = [];

    try {
      outlookLog('Fetching appointments from Exchange server...');
      const findResult = await exchange.FindAppointments(folderId, view);
      appointments = findResult.Items as Appointment[];
      outlookLog('Found', appointments.length, 'appointments');
    } catch (error) {
      const classifiedError = createClassifiedError(error as Error, {
        operation: 'fetch_appointments',
        serverUrl: credentials.serverUrl,
        userId: credentials.userId,
        exchangeUrl: exchange.Url?.ToString(),
      });

      outlookError(
        formatErrorForLogging(
          classifiedError,
          'Fetch appointments from Exchange'
        )
      );

      throw new Error(
        `Failed to fetch appointments: ${classifiedError.technicalMessage}`
      );
    }
    // Filter out appointments that end exactly at midnight
    const filtered = appointments.filter(
      (appointment) => appointment.End > minTime
    );

    if (filtered.length === 0) {
      return [];
    }

    const propertySet = new PropertySet(BasePropertySet.FirstClassProperties);
    try {
      outlookLog('Loading properties for', filtered.length, 'appointments');
      await exchange.LoadPropertiesForItems(filtered, propertySet);
      outlookLog('Successfully loaded appointment properties');
    } catch (error) {
      const classifiedError = createClassifiedError(error as Error, {
        operation: 'load_appointment_properties',
        appointmentCount: filtered.length,
        serverUrl: credentials.serverUrl,
        userId: credentials.userId,
      });

      outlookError(
        formatErrorForLogging(classifiedError, 'Load appointment properties')
      );

      throw new Error(
        `Failed to load appointment properties: ${classifiedError.technicalMessage}`
      );
    }

    outlookLog('Processing', filtered.length, 'appointments');
    return filtered.map<AppointmentData>((appointment, index) => {
      let description = '';
      try {
        if (appointment.Body?.Text) {
          description = appointment.Body.Text;
        }
      } catch (error) {
        outlookWarn(
          `Failed to get description for appointment ${index}:`,
          error
        );
        // Ignore errors when the appointment body is missing.
      }

      // Check if the busy status is Busy
      // LegacyFreeBusyStatus enum: Free = 0, Tentative = 1, Busy = 2, OOF = 3
      const isBusy =
        appointment.LegacyFreeBusyStatus === LegacyFreeBusyStatus.Busy;

      try {
        const appointmentData = {
          id: appointment.Id.UniqueId,
          subject: appointment.Subject,
          startTime: appointment.Start.ToISOString(),
          endTime: appointment.End.ToISOString(),
          description,
          isAllDay: appointment.IsAllDayEvent ?? false,
          isCanceled: appointment.IsCancelled ?? false,
          meetingUrl: appointment.JoinOnlineMeetingUrl ?? undefined,
          reminderMinutesBeforeStart:
            appointment.ReminderMinutesBeforeStart ?? undefined,
          busy: isBusy,
        };

        outlookLog(`Processed appointment ${index + 1}/${filtered.length}:`, {
          id: appointmentData.id,
          subject: appointmentData.subject,
          startTime: appointmentData.startTime,
          busy: appointmentData.busy,
        });

        return appointmentData;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        outlookError(`Failed to process appointment ${index}:`, {
          error: errorMessage,
          appointmentId: appointment.Id?.UniqueId,
          subject: appointment.Subject,
        });
        throw new Error(`Failed to process appointment: ${errorMessage}`);
      }
    });
  } catch (error) {
    const classifiedError = createClassifiedError(error as Error, {
      operation: 'get_outlook_events',
      serverUrl: credentials.serverUrl,
      userId: credentials.userId,
      date: date.toISOString(),
    });

    outlookError(formatErrorForLogging(classifiedError, 'Get Outlook Events'));

    throw new Error(
      `Outlook calendar sync failed: ${classifiedError.technicalMessage}`
    );
  }
};
