/**
 * Privacy hooks for electron-log
 * Filters sensitive data before writing to log files
 */

const SENSITIVE_PATTERNS: RegExp[] = [
  /password["'\s:=]+["']?[^"'\s,}\]]+/gi,
  /passwd["'\s:=]+["']?[^"'\s,}\]]+/gi,
  /secret["'\s:=]+["']?[^"'\s,}\]]+/gi,
  /token["'\s:=]+["']?[^"'\s,}\]]+/gi,
  /api[_-]?key["'\s:=]+["']?[^"'\s,}\]]+/gi,
  /auth[_-]?token["'\s:=]+["']?[^"'\s,}\]]+/gi,
  /access[_-]?token["'\s:=]+["']?[^"'\s,}\]]+/gi,
  /refresh[_-]?token["'\s:=]+["']?[^"'\s,}\]]+/gi,
  /bearer\s+[a-zA-Z0-9._-]+/gi,
  /authorization["'\s:=]+["']?[^"'\s,}\]]+/gi,
  /x-auth-token["'\s:=]+["']?[^"'\s,}\]]+/gi,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
];

// Keys that together indicate a Redux state dump (need 3+ to trigger)
const STATE_SIGNATURE_KEYS = [
  'apppath',
  'appversion',
  'servers',
  'clientcertificates',
  'currentview',
  'allowedjitsiServers',
  'downloads',
  'isupdatingenabled',
  'istrayiconenabled',
  'rootwindowstate',
];

/**
 * Detects if an object looks like a Redux state dump
 * Returns true if object has 3+ state signature keys
 */
const isStateDump = (obj: any): boolean => {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return false;
  }
  const keys = Object.keys(obj).map((k) => k.toLowerCase());
  const matchCount = STATE_SIGNATURE_KEYS.filter((k) =>
    keys.includes(k)
  ).length;
  return matchCount >= 3;
};

export const redactSensitiveData = (text: string): string => {
  let result = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
};

const redactObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return redactSensitiveData(obj);
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (typeof obj === 'object') {
    // Check if this looks like a Redux state dump
    if (isStateDump(obj)) {
      return '[Redux State Redacted]';
    }
    // Also check for nested state (e.g., { state: { appPath: ... } })
    if (obj.state && isStateDump(obj.state)) {
      // Use destructuring to avoid infinite recursion - process all keys except 'state'
      const { state: _state, ...rest } = obj;
      return { ...redactObject(rest), state: '[Redux State Redacted]' };
    }

    const result: any = {};
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('authorization')
      ) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactObject(obj[key]);
      }
    }
    return result;
  }
  return obj;
};

export const createPrivacyHook = () => {
  return (message: any, _transport: any, _transportName?: string) => {
    try {
      // Guard against non-array data
      const data = Array.isArray(message.data) ? message.data : [message.data];
      const sanitizedData = data.map((item: any) => {
        if (typeof item === 'string') return redactSensitiveData(item);
        if (typeof item === 'object' && item !== null)
          return redactObject(item);
        return item;
      });
      return { ...message, data: sanitizedData };
    } catch {
      // Don't emit raw data on failure - only safe placeholder
      return {
        ...message,
        data: ['[Privacy redaction failed]'],
      };
    }
  };
};
