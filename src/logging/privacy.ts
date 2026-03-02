/**
 * Privacy hooks for electron-log
 * Filters sensitive data before writing to log files
 *
 * Strategy:
 * 1. Field-based redaction (object keys) — precise, low false positives
 * 2. Pattern-based redaction (string content) — catches secrets in messages
 * 3. Partial masking where possible — preserves debugging utility
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Mask a value showing first/last N chars: "eyJhbG...xK9s" */
const mask = (value: string, keep = 4): string => {
  if (value.length <= keep * 2 + 3) return '[REDACTED]';
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
};

/** Luhn checksum — validates credit card numbers to avoid false positives */
const luhnCheck = (digits: string): boolean => {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
};

// ── Pattern-based redaction (applied to string content) ──────────────────────

/**
 * Key-value credential patterns.
 * Requires the value portion to be 8+ chars to avoid matching
 * short debug strings like "token expired" or "secret: no".
 */
const CREDENTIAL_KV_PATTERNS: { pattern: RegExp; label: string }[] = [
  {
    pattern: /password["'\s:=]+["']?([^"'\s,}\]]{8,})/gi,
    label: 'password',
  },
  { pattern: /passwd["'\s:=]+["']?([^"'\s,}\]]{8,})/gi, label: 'passwd' },
  { pattern: /secret["'\s:=]+["']?([^"'\s,}\]]{8,})/gi, label: 'secret' },
  {
    pattern: /api[_-]?key["'\s:=]+["']?([^"'\s,}\]]{8,})/gi,
    label: 'api_key',
  },
  {
    pattern: /auth[_-]?token["'\s:=]+["']?([^"'\s,}\]]{8,})/gi,
    label: 'auth_token',
  },
  {
    pattern: /access[_-]?token["'\s:=]+["']?([^"'\s,}\]]{8,})/gi,
    label: 'access_token',
  },
  {
    pattern: /refresh[_-]?token["'\s:=]+["']?([^"'\s,}\]]{8,})/gi,
    label: 'refresh_token',
  },
  {
    pattern: /x-auth-token["'\s:=]+["']?([^"'\s,}\]]{8,})/gi,
    label: 'x-auth-token',
  },
  {
    pattern: /authorization["'\s:=]+["']?([^"'\s,}\]]{8,})/gi,
    label: 'authorization',
  },
  {
    pattern: /client[_-]?secret["'\s:=]+["']?([^"'\s,}\]]{8,})/gi,
    label: 'client_secret',
  },
  {
    pattern: /private[_-]?key["'\s:=]+["']?([^"'\s,}\]]{8,})/gi,
    label: 'private_key',
  },
  {
    pattern: /webhook[_-]?url["'\s:=]+["']?([^"'\s,}\]]{8,})/gi,
    label: 'webhook_url',
  },
];

/** Standalone token/secret patterns (not key-value) */
const TOKEN_PATTERNS: {
  pattern: RegExp;
  replacer: (match: string, ...groups: string[]) => string;
}[] = [
  // Bearer tokens
  {
    pattern: /bearer\s+([a-zA-Z0-9._-]{20,})/gi,
    replacer: (_m, token) => `Bearer ${mask(token)}`,
  },
  // JWTs: three base64url segments separated by dots
  {
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g,
    replacer: (m) => mask(m, 6),
  },
  // URLs with embedded credentials: https://user:pass@host
  {
    pattern: /(https?:\/\/)([^:]+):([^@]+)@/gi,
    replacer: (_m, proto, user) => `${proto}${user}:[REDACTED]@`,
  },
  // Long hex strings (32+ chars) — likely API keys, hashes, tokens
  {
    pattern: /\b[a-fA-F0-9]{32,}\b/g,
    replacer: (m) => mask(m, 6),
  },
];

/** PII patterns */
const PII_PATTERNS: { pattern: RegExp; replacer: (match: string) => string }[] =
  [
    // Email addresses — require 2+ char local part, exclude npm-style package scopes
    // Negative lookbehind for @ prevents matching @scope/package patterns
    {
      pattern: /\b[A-Za-z0-9._%+-]{2,}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      replacer: (m) => {
        // Don't redact package scopes or internal identifiers
        if (
          m.includes('/') ||
          m.endsWith('.js') ||
          m.endsWith('.ts') ||
          m.endsWith('.log') ||
          /^\d+@\d+/.test(m)
        ) {
          return m;
        }
        const [local, domain] = m.split('@');
        return `${local[0]}***@${domain}`;
      },
    },
    // Credit card numbers (13-19 digits, optionally separated by spaces/dashes)
    {
      pattern: /\b(?:\d[ -]*?){13,19}\b/g,
      replacer: (m) => {
        const digits = m.replace(/[^0-9]/g, '');
        if (digits.length < 13 || digits.length > 19) return m;
        if (!luhnCheck(digits)) return m; // Not a valid CC — don't redact
        return `****${digits.slice(-4)}`;
      },
    },
    // IP addresses (IPv4) — partial mask preserving subnet
    {
      pattern: /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g,
      replacer: (m) => {
        // Don't redact localhost, version numbers, or common non-IP patterns
        if (
          m === '127.0.0.1' ||
          m === '0.0.0.0' ||
          m.startsWith('192.168.') ||
          m.startsWith('10.') ||
          m.startsWith('172.')
        ) {
          return m;
        }
        const parts = m.split('.');
        return `${parts[0]}.${parts[1]}.*.*`;
      },
    },
  ];

// ── Field-based redaction (applied to object keys) ───────────────────────────

const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwd',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'session_id',
  'sessionid',
  'credential',
  'private_key',
  'privatekey',
  'access_key',
  'accesskey',
  'client_secret',
  'webhook',
];

/** Keys that are safe even though they partially match sensitive patterns */
const SAFE_KEY_PATTERNS = [
  'token_type',
  'tokentype',
  'token_expired',
  'token_expiry',
  'session_count',
  'password_changed',
  'password_policy',
  'webhook_enabled',
];

const isSensitiveKey = (key: string): boolean => {
  const lower = key.toLowerCase();
  // Check safe patterns first (allowlist)
  if (SAFE_KEY_PATTERNS.some((safe) => lower === safe)) return false;
  return SENSITIVE_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
};

// ── Redux state dump detection ───────────────────────────────────────────────

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

// ── Core redaction functions ─────────────────────────────────────────────────

export const redactSensitiveData = (text: string): string => {
  let result = text;

  // Key-value credential patterns — replace the whole match
  for (const { pattern, label } of CREDENTIAL_KV_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, `${label}: [REDACTED]`);
  }

  // Standalone token patterns — use custom replacers for partial masking
  for (const { pattern, replacer } of TOKEN_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, replacer);
  }

  // PII patterns — use custom replacers for partial masking
  for (const { pattern, replacer } of PII_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, replacer);
  }

  return result;
};

const redactObject = (obj: any, depth = 0, seen = new WeakSet()): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return redactSensitiveData(obj);

  // Prevent stack overflow on deeply nested objects
  if (depth > 10) return '[Nested Object Redacted]';

  if (typeof obj === 'object') {
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);
  }

  if (Array.isArray(obj))
    return obj.map((item) => redactObject(item, depth + 1, seen));

  if (typeof obj === 'object') {
    if (isStateDump(obj)) {
      return '[Redux State Redacted]';
    }
    if (obj.state && isStateDump(obj.state)) {
      const { state: _state, ...rest } = obj;
      return {
        ...redactObject(rest, depth + 1, seen),
        state: '[Redux State Redacted]',
      };
    }

    const result: any = {};
    for (const key of Object.keys(obj)) {
      if (isSensitiveKey(key)) {
        const val = obj[key];
        // Partial mask string values for debugging context
        result[key] =
          typeof val === 'string' && val.length > 8 ? mask(val) : '[REDACTED]';
      } else {
        result[key] = redactObject(obj[key], depth + 1, seen);
      }
    }
    return result;
  }
  return obj;
};

// ── electron-log hook ────────────────────────────────────────────────────────

let privacyHookFailed = false;

export const createPrivacyHook = () => {
  return (message: any, _transport: any, _transportName?: string) => {
    try {
      const data = Array.isArray(message.data) ? message.data : [message.data];
      const sanitizedData = data.map((item: any) => {
        if (typeof item === 'string') return redactSensitiveData(item);
        if (typeof item === 'object' && item !== null)
          return redactObject(item);
        return item;
      });
      return { ...message, data: sanitizedData };
    } catch {
      if (!privacyHookFailed) {
        privacyHookFailed = true;
        process.stderr.write(
          '[privacy] redaction hook threw; falling back to placeholder\n'
        );
      }
      return {
        level: message.level,
        date: message.date,
        data: ['[Privacy redaction failed]'],
      };
    }
  };
};
