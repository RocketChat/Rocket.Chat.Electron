// Mock uuid to avoid ES module parsing issues
import { sanitizeExchangeUrl } from './getOutlookEvents';

jest.mock('uuid', () => ({
  v1: jest.fn(() => '00000000-0000-0000-0000-000000000000'),
  v4: jest.fn(() => '00000000-0000-0000-0000-000000000000'),
}));

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
        'https://mail.example.com/ews',
        'https://mail.example.com/ews/exchange.asmx',
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
        'mail.example.com:8443/ews',
        'https://mail.example.com:8443/ews/exchange.asmx',
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
        'https://mail.example.com/ews',
        'https://mail.example.com/ews/exchange.asmx',
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

  describe('URL validation and error handling', () => {
    describe('Invalid URL structures', () => {
      it('handles invalid protocol via fallback', () => {
        // The function uses fallback logic for invalid protocols
        const result = sanitizeExchangeUrl('invalid://domain.com');
        expect(result).toContain('/ews/exchange.asmx');
      });

      it('throws error for URL without hostname', () => {
        expect(() => sanitizeExchangeUrl('https://')).toThrow(
          /Failed to create valid Exchange URL/
        );
      });

      it('handles URLs without dots via fallback', () => {
        const result = sanitizeExchangeUrl('not-a-url');
        expect(result).toBe('https://not-a-url/ews/exchange.asmx');
      });

      it('handles URLs with double dots via fallback', () => {
        const result = sanitizeExchangeUrl('https://bad..domain.com');
        expect(result).toBe('https://bad..domain.com/ews/exchange.asmx');
      });

      it('handles URLs with double slashes by normalizing', () => {
        const result = sanitizeExchangeUrl('https://domain.com//bad//path');
        expect(result).toBe('https://domain.com/bad/path/ews/exchange.asmx');
      });
    });

    describe('Valid URLs with warnings', () => {
      // These should work but may generate warnings
      it('handles localhost URLs', () => {
        const result = sanitizeExchangeUrl('http://localhost/ews');
        expect(result).toBe('http://localhost/ews/exchange.asmx');
      });

      it('handles HTTP URLs (should warn but work)', () => {
        const result = sanitizeExchangeUrl('http://exchange.company.com');
        expect(result).toBe('http://exchange.company.com/ews/exchange.asmx');
      });

      it('handles non-standard ports', () => {
        const result = sanitizeExchangeUrl('https://mail.company.com:9443');
        expect(result).toBe('https://mail.company.com:9443/ews/exchange.asmx');
      });
    });

    describe('Fallback URL handling', () => {
      it('handles URLs without protocol', () => {
        const result = sanitizeExchangeUrl('mail.company.com');
        expect(result).toBe('https://mail.company.com/ews/exchange.asmx');
      });

      it('handles partial URLs with /ews', () => {
        const result = sanitizeExchangeUrl('mail.company.com/ews');
        expect(result).toBe('https://mail.company.com/ews/exchange.asmx');
      });

      it('handles complete fallback URLs', () => {
        const result = sanitizeExchangeUrl(
          'mail.company.com/ews/exchange.asmx'
        );
        expect(result).toBe('https://mail.company.com/ews/exchange.asmx');
      });
    });

    describe('Exchange-specific validation', () => {
      it('validates Exchange endpoint path', () => {
        const result = sanitizeExchangeUrl('https://mail.company.com');
        expect(result).toMatch(/\/ews\/exchange\.asmx$/);
      });

      it('preserves existing correct Exchange paths', () => {
        const input = 'https://mail.company.com/ews/exchange.asmx';
        const result = sanitizeExchangeUrl(input);
        expect(result).toBe(input);
      });

      it('corrects case in Exchange paths', () => {
        const result = sanitizeExchangeUrl(
          'https://mail.company.com/EWS/EXCHANGE.ASMX'
        );
        expect(result).toBe('https://mail.company.com/ews/exchange.asmx');
      });
    });

    describe('Detailed error scenarios', () => {
      it('handles input without dots via fallback', () => {
        const result = sanitizeExchangeUrl('not-a-url-at-all');
        expect(result).toBe('https://not-a-url-at-all/ews/exchange.asmx');
      });

      it('handles URLs with double dots', () => {
        const result = sanitizeExchangeUrl('https://bad..domain.com');
        expect(result).toBe('https://bad..domain.com/ews/exchange.asmx');
      });

      it('throws error for empty input', () => {
        expect(() => sanitizeExchangeUrl('')).toThrow(/Invalid server URL/);
      });
    });

    describe('Edge cases with validation', () => {
      it('handles URLs with query parameters', () => {
        const result = sanitizeExchangeUrl(
          'https://mail.company.com/ews?test=1'
        );
        expect(result).toBe(
          'https://mail.company.com/ews/exchange.asmx?test=1'
        );
      });

      it('handles URLs with fragments', () => {
        const result = sanitizeExchangeUrl(
          'https://mail.company.com/ews#fragment'
        );
        expect(result).toBe(
          'https://mail.company.com/ews/exchange.asmx#fragment'
        );
      });

      it('handles internationalized domain names', () => {
        const result = sanitizeExchangeUrl('https://mail.münchen.de');
        expect(result).toMatch(/ews\/exchange\.asmx$/);
      });
    });

    describe('Connectivity testing features', () => {
      it('handles connectivity testing gracefully when it fails', () => {
        // Test that even if connectivity testing fails, the function still returns a valid URL
        const result = sanitizeExchangeUrl('https://unreachable.example.com');
        expect(result).toBe(
          'https://unreachable.example.com/ews/exchange.asmx'
        );
      });

      it('runs connectivity testing automatically on this debugging branch', () => {
        // Connectivity testing runs automatically, validating the URL construction works
        const result = sanitizeExchangeUrl('https://mail.company.com');
        expect(result).toBe('https://mail.company.com/ews/exchange.asmx');
      });
    });

    describe('Production scenario tests', () => {
      it('handles the exact problematic URL from the original issue', () => {
        const result = sanitizeExchangeUrl('https://mail.example.com/ews');
        expect(result).toBe('https://mail.example.com/ews/exchange.asmx');
        expect(result).not.toContain('//ews');
        expect(result).not.toContain('/ews/ews');
      });

      it('handles URLs without protocol via fallback', () => {
        const result = sanitizeExchangeUrl('invalid-url');
        expect(result).toBe('https://invalid-url/ews/exchange.asmx');
      });
    });
  });
});
