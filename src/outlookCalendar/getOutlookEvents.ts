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

import type { OutlookCredentials, AppointmentData } from './type';

/**
 * Validates if a URL has proper basic structure
 */
const validateUrlStructure = (
  url: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check for basic URL structure
  if (!url.includes('.')) {
    errors.push(
      'URL must contain a domain with at least one dot (e.g., mail.example.com)'
    );
  }

  // Check for obvious malformed patterns
  if (url.includes('..')) {
    errors.push('URL contains consecutive dots which is invalid');
  }

  if (url.includes('//') && !url.includes('://')) {
    errors.push('URL contains double slashes without protocol');
  }

  // Check for valid characters (basic check)
  const invalidChars = /[<>{}|\\^`\s]/;
  if (invalidChars.test(url)) {
    errors.push('URL contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates URL using the native URL constructor and additional checks
 */
const validateUrlWithConstructor = (
  url: string
): { isValid: boolean; errors: string[]; parsedUrl?: URL } => {
  const errors: string[] = [];

  try {
    const parsedUrl = new URL(url);

    // Validate protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      errors.push(
        `Invalid protocol "${parsedUrl.protocol}". Only HTTP and HTTPS are supported`
      );
    }

    // Validate hostname
    if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
      errors.push('URL must have a valid hostname');
    }

    // Check for localhost or private IPs (warn but don't fail)
    if (
      parsedUrl.hostname === 'localhost' ||
      parsedUrl.hostname.startsWith('127.')
    ) {
      console.warn(
        '[OutlookCalendar] URL validation warning: Using localhost/loopback address'
      );
    }

    // Validate port if specified
    if (parsedUrl.port) {
      const portNum = parseInt(parsedUrl.port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        errors.push(
          `Invalid port number "${parsedUrl.port}". Must be between 1 and 65535`
        );
      }
    }

    // Check for reasonable hostname format
    if (
      parsedUrl.hostname &&
      !parsedUrl.hostname.includes('.') &&
      parsedUrl.hostname !== 'localhost'
    ) {
      errors.push(
        'Hostname should contain at least one dot for a valid domain'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      parsedUrl,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [
        `Invalid URL format: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
};

/**
 * Performs comprehensive URL validation and logs detailed error information
 */
const validateExchangeUrl = (
  originalUrl: string,
  sanitizedUrl: string
): boolean => {
  console.log('[OutlookCalendar] Validating Exchange URL:', {
    originalUrl,
    sanitizedUrl,
  });

  // Validate the sanitized URL structure
  const structureCheck = validateUrlStructure(sanitizedUrl);
  if (!structureCheck.isValid) {
    console.error('[OutlookCalendar] URL structure validation failed:', {
      url: sanitizedUrl,
      errors: structureCheck.errors,
    });
    return false;
  }

  // Validate using URL constructor
  const urlCheck = validateUrlWithConstructor(sanitizedUrl);
  if (!urlCheck.isValid) {
    console.error('[OutlookCalendar] URL constructor validation failed:', {
      url: sanitizedUrl,
      errors: urlCheck.errors,
    });
    return false;
  }

  // Additional Exchange-specific validations
  const exchangeErrors: string[] = [];

  if (urlCheck.parsedUrl) {
    const { parsedUrl } = urlCheck;

    // Check if the path looks like a valid Exchange endpoint
    const pathname = parsedUrl.pathname.toLowerCase();
    if (!pathname.includes('/ews/') || !pathname.endsWith('/exchange.asmx')) {
      exchangeErrors.push(
        'URL path should end with /ews/exchange.asmx for Exchange Web Services'
      );
    }

    // Warn about non-standard ports
    const { port } = parsedUrl;
    if (port && !['80', '443', '8080', '8443'].includes(port)) {
      console.warn(
        '[OutlookCalendar] URL validation warning: Using non-standard port',
        {
          port,
          url: sanitizedUrl,
          message: 'Ensure your Exchange server is accessible on this port',
        }
      );
    }

    // Check for HTTPS recommendation
    if (
      parsedUrl.protocol === 'http:' &&
      !parsedUrl.hostname.includes('localhost')
    ) {
      console.warn(
        '[OutlookCalendar] URL validation warning: Using HTTP instead of HTTPS',
        {
          url: sanitizedUrl,
          message:
            'HTTPS is recommended for Exchange connections in production',
        }
      );
    }
  }

  if (exchangeErrors.length > 0) {
    console.error('[OutlookCalendar] Exchange-specific validation failed:', {
      url: sanitizedUrl,
      errors: exchangeErrors,
    });
    return false;
  }

  console.log('[OutlookCalendar] URL validation passed:', {
    url: sanitizedUrl,
    protocol: urlCheck.parsedUrl?.protocol,
    hostname: urlCheck.parsedUrl?.hostname,
    port: urlCheck.parsedUrl?.port || 'default',
  });

  return true;
};

/**
 * Optional function to test basic connectivity to the Exchange server
 * This is not called by default to avoid network delays, but can be enabled for debugging
 */
const testExchangeConnectivity = async (
  exchangeUrl: string,
  timeoutMs: number = 5000
): Promise<boolean> => {
  try {
    console.log(
      '[OutlookCalendar] Testing connectivity to Exchange server:',
      exchangeUrl
    );

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
    console.log('[OutlookCalendar] Connectivity test result:', {
      url: baseUrl,
      status: response.status,
      reachable: true,
    });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[OutlookCalendar] Connectivity test failed:', {
      url: exchangeUrl,
      error: errorMessage,
      note: 'This may be normal if the server requires authentication or has CORS restrictions',
    });

    return false;
  }
};

/**
 * Enhanced validation function that optionally includes connectivity testing
 */
const validateExchangeUrlWithConnectivity = async (
  originalUrl: string,
  sanitizedUrl: string,
  testConnectivity: boolean = false
): Promise<boolean> => {
  // Run standard validation first
  const isValid = validateExchangeUrl(originalUrl, sanitizedUrl);

  if (!isValid || !testConnectivity) {
    return isValid;
  }

  // Optional connectivity test (disabled by default to avoid delays)
  try {
    const isReachable = await testExchangeConnectivity(sanitizedUrl);
    if (!isReachable) {
      console.warn(
        '[OutlookCalendar] URL validation warning: Server may not be reachable',
        {
          url: sanitizedUrl,
          suggestion: 'Check network connectivity and firewall settings',
        }
      );
      // Don't fail validation just because of connectivity issues
    }
  } catch (error) {
    console.warn('[OutlookCalendar] Connectivity test error:', error);
  }

  return isValid;
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

  console.log('[OutlookCalendar] Starting URL sanitization for:', serverUrl);

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

    console.log('[OutlookCalendar] URL sanitization completed:', {
      input: serverUrl,
      output: sanitizedUrl,
      protocol: url.protocol,
      hostname: url.hostname,
      pathname: url.pathname,
    });

    // Quick validation of the result
    if (!sanitizedUrl.endsWith('/ews/exchange.asmx')) {
      throw new Error('Failed to construct proper EWS endpoint URL');
    }

    // Connectivity test for debugging
    console.log(
      '[OutlookCalendar] Running connectivity test to check server reachability...'
    );
    // Run connectivity test in background without blocking
    testExchangeConnectivity(sanitizedUrl).catch((error) => {
      console.warn('[OutlookCalendar] Background connectivity test failed:', {
        url: sanitizedUrl,
        error: error instanceof Error ? error.message : String(error),
        note: 'This does not affect the URL validation result',
      });
    });

    return sanitizedUrl;
  } catch (error) {
    // Enhanced fallback using URL constructor more intelligently
    console.warn(
      '[OutlookCalendar] URL parsing failed, attempting fallback method:',
      {
        originalUrl: serverUrl,
        error: error instanceof Error ? error.message : String(error),
      }
    );

    // Try to fix common URL issues
    let fallbackUrl = serverUrl.trim();

    // Add protocol if missing
    if (!fallbackUrl.match(/^https?:\/\//)) {
      fallbackUrl = `https://${fallbackUrl}`;
      console.log('[OutlookCalendar] Added default HTTPS protocol');
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

      console.log('[OutlookCalendar] Fallback URL construction successful:', {
        input: serverUrl,
        fallback: fallbackUrl,
        output: finalUrl,
        protocol: url.protocol,
        hostname: url.hostname,
        pathname: url.pathname,
      });

      // Connectivity test for fallback URL too
      console.log(
        '[OutlookCalendar] Running connectivity test on fallback URL...'
      );
      testExchangeConnectivity(finalUrl).catch((error) => {
        console.warn(
          '[OutlookCalendar] Fallback URL connectivity test failed:',
          {
            url: finalUrl,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      });

      return finalUrl;
    } catch (fallbackError) {
      const errorMessage = `Failed to create valid Exchange URL from "${serverUrl}". 
        Original error: ${error instanceof Error ? error.message : String(error)}. 
        Fallback error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}. 
        Please ensure the URL includes a valid protocol (http:// or https://) and hostname.`;

      console.error('[OutlookCalendar] URL sanitization failed completely:', {
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
  console.log('[OutlookCalendar] Starting getOutlookEvents', {
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
      console.error('[OutlookCalendar] Credential validation failed:', {
        hasLogin: !!login,
        hasPassword: !!password,
        hasServerUrl: !!serverUrl,
      });
      throw error;
    }

    console.log('[OutlookCalendar] Initializing Exchange connection');
    const xhrApi = new XhrApi({ decompress: true });
    xhrApi.useNtlmAuthentication(login, password);

    ConfigurationApi.ConfigureXHR(xhrApi);

    const exchange = new ExchangeService(ExchangeVersion.Exchange2013);
    // This credentials object isn't used when ntlm is active, but the lib still requires it.
    exchange.Credentials = new WebCredentials(login, password);

    try {
      const exchangeUrl = sanitizeExchangeUrl(serverUrl);
      exchange.Url = new Uri(exchangeUrl);
      console.log('[OutlookCalendar] Exchange URL set:', exchangeUrl);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('[OutlookCalendar] Failed to set Exchange URL:', {
        serverUrl,
        error: errorMessage,
        suggestion:
          'Please verify the Exchange server URL configuration. Expected format: https://mail.example.com or https://mail.example.com/ews',
      });
      throw new Error(
        `Invalid Exchange server URL configuration: ${errorMessage}`
      );
    }

    const validatedDate = new Date(date);
    console.log(
      '[OutlookCalendar] Searching for appointments on:',
      validatedDate.toDateString()
    );

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
      console.log(
        '[OutlookCalendar] Fetching appointments from Exchange server...'
      );
      const findResult = await exchange.FindAppointments(folderId, view);
      appointments = findResult.Items as Appointment[];
      console.log(
        '[OutlookCalendar] Found',
        appointments.length,
        'appointments'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorType =
        error instanceof Error ? error.constructor.name : 'Unknown';
      console.error(
        '[OutlookCalendar] Failed to fetch appointments from Exchange:',
        {
          error: errorMessage,
          serverUrl: credentials.serverUrl,
          userId: credentials.userId,
          errorType,
        }
      );
      return Promise.reject(
        new Error(`Failed to fetch appointments: ${errorMessage}`)
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
      console.log(
        '[OutlookCalendar] Loading properties for',
        filtered.length,
        'appointments'
      );
      await exchange.LoadPropertiesForItems(filtered, propertySet);
      console.log(
        '[OutlookCalendar] Successfully loaded appointment properties'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        '[OutlookCalendar] Failed to load appointment properties:',
        {
          error: errorMessage,
          appointmentCount: filtered.length,
          serverUrl: credentials.serverUrl,
        }
      );
      return Promise.reject(
        new Error(`Failed to load appointment properties: ${errorMessage}`)
      );
    }

    console.log(
      '[OutlookCalendar] Processing',
      filtered.length,
      'appointments'
    );
    return filtered.map<AppointmentData>((appointment, index) => {
      let description = '';
      try {
        if (appointment.Body?.Text) {
          description = appointment.Body.Text;
        }
      } catch (error) {
        console.warn(
          `[OutlookCalendar] Failed to get description for appointment ${index}:`,
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

        console.log(
          `[OutlookCalendar] Processed appointment ${index + 1}/${filtered.length}:`,
          {
            id: appointmentData.id,
            subject: appointmentData.subject,
            startTime: appointmentData.startTime,
            busy: appointmentData.busy,
          }
        );

        return appointmentData;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[OutlookCalendar] Failed to process appointment ${index}:`,
          {
            error: errorMessage,
            appointmentId: appointment.Id?.UniqueId,
            subject: appointment.Subject,
          }
        );
        throw new Error(`Failed to process appointment: ${errorMessage}`);
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[OutlookCalendar] getOutlookEvents failed:', {
      error: errorMessage,
      serverUrl: credentials.serverUrl,
      userId: credentials.userId,
      date: date.toISOString(),
    });
    return Promise.reject(
      new Error(`Outlook calendar sync failed: ${errorMessage}`)
    );
  }
};
