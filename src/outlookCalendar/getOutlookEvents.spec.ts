import { sanitizeExchangeUrl } from './getOutlookEvents';

describe('Exchange URL Sanitization', () => {
  describe('Base URL scenarios', () => {
    it.each([
      [
        'https://mail.example.com',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com///',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      ['http://mail.example.com', 'http://mail.example.com/ews/exchange.asmx'],
      [
        'https://mail.example.com:8443',
        'https://mail.example.com:8443/ews/exchange.asmx',
      ],
    ])('transforms base URL %s into %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });

  describe('URLs with /ews path', () => {
    it.each([
      [
        'https://mail.example.com/ews',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/ews/',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/ews///',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.intra.cea.fr/ews',
        'https://mail.intra.cea.fr/ews/exchange.asmx',
      ],
    ])('transforms EWS path URL %s into %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });

  describe('Case-insensitive scenarios', () => {
    it.each([
      [
        'https://mail.example.com/EWS',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/Ews',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/EWS/',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/EWS/EXCHANGE.ASMX',
        'https://mail.example.com/ews/exchange.asmx',
      ],
    ])('handles case-insensitive URL %s into %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });

  describe('Already complete URLs', () => {
    it.each([
      [
        'https://mail.example.com/ews/exchange.asmx',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/ews/exchange.asmx/',
        'https://mail.example.com/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/EWS/EXCHANGE.ASMX',
        'https://mail.example.com/ews/exchange.asmx',
      ],
    ])('preserves complete URL %s as %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });

  describe('URLs with subpaths', () => {
    it.each([
      [
        'https://mail.example.com/outlook',
        'https://mail.example.com/outlook/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/mail/ews',
        'https://mail.example.com/mail/ews/exchange.asmx',
      ],
      [
        'https://mail.example.com/subdir/path',
        'https://mail.example.com/subdir/path/ews/exchange.asmx',
      ],
    ])('handles subpaths %s into %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });

  describe('Fallback for malformed URLs', () => {
    it.each([
      ['mail.example.com', 'https://mail.example.com/ews/exchange.asmx'],
      ['mail.example.com/ews', 'https://mail.example.com/ews/exchange.asmx'],
      [
        'mail.example.com:443/ews',
        'https://mail.example.com:443/ews/exchange.asmx',
      ],
    ])('handles URLs without protocol %s into %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });

  describe('Error handling', () => {
    it.each([
      ['', 'Invalid server URL: must be a non-empty string'],
      [null as any, 'Invalid server URL: must be a non-empty string'],
      [undefined as any, 'Invalid server URL: must be a non-empty string'],
      [123 as any, 'Invalid server URL: must be a non-empty string'],
    ])('throws error for invalid input %s', (input, expectedError) => {
      expect(() => sanitizeExchangeUrl(input)).toThrow(expectedError);
    });
  });

  describe('Real-world examples', () => {
    it.each([
      // The original problematic case from the issue
      [
        'https://mail.intra.cea.fr/ews',
        'https://mail.intra.cea.fr/ews/exchange.asmx',
      ],

      // Common Office 365 patterns
      [
        'https://outlook.office365.com/ews',
        'https://outlook.office365.com/ews/exchange.asmx',
      ],
      [
        'https://outlook.office365.com',
        'https://outlook.office365.com/ews/exchange.asmx',
      ],

      // On-premises Exchange patterns
      [
        'https://mail.company.com/exchange',
        'https://mail.company.com/exchange/ews/exchange.asmx',
      ],
      [
        'https://exchange.company.com',
        'https://exchange.company.com/ews/exchange.asmx',
      ],

      // Legacy configurations
      [
        'https://mail.company.com/ews/exchange.asmx',
        'https://mail.company.com/ews/exchange.asmx',
      ],
    ])('handles real-world URL %s correctly as %s', (input, expected) => {
      const result = sanitizeExchangeUrl(input);
      expect(result).toBe(expected);
    });
  });
});
