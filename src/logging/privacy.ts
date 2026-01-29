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
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
];

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
  return (message: any, _transport: any, transportName?: string) => {
    if (transportName !== 'file') return message;
    try {
      const sanitizedData = message.data.map((item: any) => {
        if (typeof item === 'string') return redactSensitiveData(item);
        if (typeof item === 'object' && item !== null)
          return redactObject(item);
        return item;
      });
      return { ...message, data: sanitizedData };
    } catch {
      return {
        ...message,
        data: ['[Privacy redaction failed]', ...message.data],
      };
    }
  };
};
