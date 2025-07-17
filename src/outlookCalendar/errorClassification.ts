import type { ErrorClassification, OutlookCalendarError } from './type';

/**
 * Error pattern matching for automated classification
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  classification: ErrorClassification;
}> = [
  // Exchange/EWS Server Errors
  {
    pattern: /Cannot read properties of undefined \(reading 'headers'\)/i,
    classification: {
      source: 'exchange',
      severity: 'high',
      code: 'EWS_NTLM_AUTH_FAILED',
      userMessage:
        'Unable to connect to Exchange server. The NTLM authentication failed.',
      suggestedActions: [
        'Verify your Exchange server URL is correct',
        'Check if your username and password are valid',
        'Ensure the Exchange server supports NTLM authentication',
        'Contact your IT administrator if the issue persists',
      ],
    },
  },
  {
    pattern: /The remote server returned an error: \(401\) Unauthorized/i,
    classification: {
      source: 'exchange',
      severity: 'high',
      code: 'EWS_UNAUTHORIZED',
      userMessage: 'Your Exchange credentials are invalid or expired.',
      suggestedActions: [
        'Verify your username and password are correct',
        'Check if your account is locked or disabled',
        'Contact your IT administrator to verify Exchange access',
      ],
    },
  },
  {
    pattern: /The remote server returned an error: \(404\) Not Found/i,
    classification: {
      source: 'exchange',
      severity: 'high',
      code: 'EWS_SERVER_NOT_FOUND',
      userMessage:
        'Exchange server not found. The server URL appears to be incorrect.',
      suggestedActions: [
        'Verify the Exchange server URL is correct',
        'Check if the server is accessible from your network',
        'Try using the full EWS endpoint URL (e.g., https://mail.company.com/ews/exchange.asmx)',
      ],
    },
  },
  {
    pattern: /getaddrinfo ENOTFOUND|ECONNREFUSED|timeout/i,
    classification: {
      source: 'network',
      severity: 'high',
      code: 'NETWORK_CONNECTION_FAILED',
      userMessage:
        'Cannot connect to Exchange server. Network connection failed.',
      suggestedActions: [
        'Check your internet connection',
        'Verify the Exchange server URL is accessible',
        'Check if there are firewall restrictions',
        'Try connecting from a different network',
      ],
    },
  },
  {
    pattern: /SSL|TLS|certificate/i,
    classification: {
      source: 'network',
      severity: 'medium',
      code: 'SSL_CERTIFICATE_ERROR',
      userMessage:
        'SSL/TLS certificate error when connecting to Exchange server.',
      suggestedActions: [
        'Check if the Exchange server has a valid SSL certificate',
        'Contact your IT administrator about certificate issues',
        'Verify the server URL uses HTTPS',
      ],
    },
  },

  // Rocket.Chat Server Errors
  {
    pattern: /Request failed with status code 401.*rocket.*chat/i,
    classification: {
      source: 'rocket_chat',
      severity: 'high',
      code: 'RC_UNAUTHORIZED',
      userMessage: 'Authentication with Rocket.Chat server failed.',
      suggestedActions: [
        'Log out and log back into Rocket.Chat',
        'Check if your Rocket.Chat session is still valid',
        'Contact your administrator if calendar integration is not enabled',
      ],
    },
  },
  {
    pattern: /Request failed with status code 500.*rocket.*chat/i,
    classification: {
      source: 'rocket_chat',
      severity: 'high',
      code: 'RC_SERVER_ERROR',
      userMessage: 'Rocket.Chat server encountered an internal error.',
      suggestedActions: [
        'Try again in a few minutes',
        'Contact your Rocket.Chat administrator',
        'Check if the calendar feature is properly configured on the server',
      ],
    },
  },
  {
    pattern: /calendar.*not.*enabled|calendar.*feature.*disabled/i,
    classification: {
      source: 'rocket_chat',
      severity: 'medium',
      code: 'RC_CALENDAR_DISABLED',
      userMessage:
        'Calendar integration is not enabled on this Rocket.Chat server.',
      suggestedActions: [
        'Contact your Rocket.Chat administrator to enable calendar integration',
        'Check if you have the necessary permissions for calendar features',
      ],
    },
  },

  // Desktop Application Errors
  {
    pattern: /Missing required Outlook credentials/i,
    classification: {
      source: 'desktop_app',
      severity: 'medium',
      code: 'MISSING_CREDENTIALS',
      userMessage: 'Outlook credentials are not configured.',
      suggestedActions: [
        'Go to Settings and configure your Outlook credentials',
        'Make sure all required fields are filled out',
      ],
    },
  },
  {
    pattern: /Failed to decrypt credentials/i,
    classification: {
      source: 'desktop_app',
      severity: 'medium',
      code: 'CREDENTIAL_DECRYPTION_FAILED',
      userMessage: 'Cannot decrypt your saved Outlook credentials.',
      suggestedActions: [
        'Try re-entering your Outlook credentials in Settings',
        'If the issue persists, clear your credentials and set them up again',
      ],
    },
  },
  {
    pattern: /Invalid Exchange server URL configuration/i,
    classification: {
      source: 'configuration',
      severity: 'medium',
      code: 'INVALID_EXCHANGE_URL',
      userMessage: 'The Exchange server URL is not properly configured.',
      suggestedActions: [
        'Check the Exchange server URL format (e.g., https://mail.company.com)',
        'Contact your IT administrator for the correct Exchange server URL',
        'Make sure the URL includes the protocol (https://)',
      ],
    },
  },

  // Authentication Errors
  {
    pattern: /NTLM.*authentication.*failed/i,
    classification: {
      source: 'authentication',
      severity: 'high',
      code: 'NTLM_AUTH_FAILED',
      userMessage: 'NTLM authentication with Exchange server failed.',
      suggestedActions: [
        'Verify your domain username and password',
        'Check if your domain is included in the username (DOMAIN\\username)',
        'Contact your IT administrator about NTLM authentication requirements',
      ],
    },
  },
];

/**
 * Classify an error based on its message and context
 */
export function classifyError(
  error: Error | string,
  _context: Record<string, any> = {}
): ErrorClassification {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : '';
  const fullErrorText = `${errorMessage} ${stack}`.toLowerCase();

  // Try to match against known patterns
  for (const { pattern, classification } of ERROR_PATTERNS) {
    if (pattern.test(fullErrorText)) {
      return classification;
    }
  }

  // Fallback classification
  return {
    source: 'desktop_app',
    severity: 'medium',
    code: 'UNKNOWN_ERROR',
    userMessage:
      'An unexpected error occurred during calendar synchronization.',
    suggestedActions: [
      'Try the operation again',
      'Check your network connection',
      'Restart the application if the issue persists',
      'Contact support if the problem continues',
    ],
  };
}

/**
 * Create a comprehensive error object with classification
 */
export function createClassifiedError(
  error: Error | string,
  context: Record<string, any> = {}
): OutlookCalendarError {
  const classification = classifyError(error, context);
  const technicalMessage =
    error instanceof Error ? error.message : String(error);

  return {
    ...classification,
    technicalMessage,
    context: {
      ...context,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format error for logging with proper structure
 */
export function formatErrorForLogging(
  classifiedError: OutlookCalendarError,
  operationContext: string
): string {
  const { source, severity, code, userMessage, technicalMessage, context } =
    classifiedError;

  return `[OutlookCalendar] ${operationContext} failed - ${source.toUpperCase()} ERROR
┌─ Error Classification ─────────────────────────────────────
│ Source: ${source}
│ Severity: ${severity}
│ Code: ${code}
│ 
│ User Message: ${userMessage}
│ 
│ Technical Details: ${technicalMessage}
│ 
│ Context: ${JSON.stringify(context, null, 2)}
│ 
│ Suggested Actions:
${classifiedError.suggestedActions?.map((action) => `│ • ${action}`).join('\n') || '│ • Contact support'}
└────────────────────────────────────────────────────────────`;
}

/**
 * Generate user-friendly error message for UI display
 */
export function generateUserFriendlyMessage(
  classifiedError: OutlookCalendarError
): string {
  const { source, userMessage, suggestedActions } = classifiedError;

  let sourceDescription = '';
  switch (source) {
    case 'exchange':
      sourceDescription = 'Exchange Server';
      break;
    case 'rocket_chat':
      sourceDescription = 'Rocket.Chat Server';
      break;
    case 'desktop_app':
      sourceDescription = 'Desktop Application';
      break;
    case 'network':
      sourceDescription = 'Network Connection';
      break;
    case 'authentication':
      sourceDescription = 'Authentication';
      break;
    case 'configuration':
      sourceDescription = 'Configuration';
      break;
    default:
      sourceDescription = 'Unknown Source';
  }

  let message = `${sourceDescription} Error: ${userMessage}`;

  if (suggestedActions && suggestedActions.length > 0) {
    message += '\n\nWhat you can try:\n';
    message += suggestedActions.map((action) => `• ${action}`).join('\n');
  }

  return message;
}
