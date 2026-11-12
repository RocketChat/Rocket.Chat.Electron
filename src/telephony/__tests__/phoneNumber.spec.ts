import { parseTelephonyLink } from '../links';
import { normalizePhoneNumber } from '../phoneNumber';

describe('normalizePhoneNumber', () => {
  it.each([
    ['+49 40 123456', '+4940123456'],
    ['+49\u00a040\u00a0123456', '+4940123456'],
    ['\u202a+49 40 123456\u202c', '+4940123456'],
    ['\u200e+49 40 123\u200b456', '+4940123456'],
    ['+1 (800) 555-0199', '+18005550199'],
    ['040 / 123 456', '040123456'],
    ['Tel: +49 40 123456', '+4940123456'],
    ['0049 40 123456', '004940123456'],
    ['*21#', '*21#'],
  ])('strips formatting from %j', (input, expected) => {
    expect(normalizePhoneNumber(input)).toBe(expected);
  });

  it.each([
    ['+49 (0)40 123456', '+4940123456'],
    ['+49 (0) 40 / 123 456-78', '+494012345678'],
    ['+44 (0)20 7123 4567', '+442071234567'],
    ['+33 (0)1 23 45 67 89', '+33123456789'],
    ['0049 (0)40 123456', '004940123456'],
    ['Tel: +49 (0)40 123456', '+4940123456'],
    ['+49 (0) 30 1234-567', '+49301234567'],
    ['0049 (0) 30 1234567', '0049301234567'],
  ])(
    'drops the (0) trunk prefix after a country code in %j',
    (input, expected) => {
      expect(normalizePhoneNumber(input)).toBe(expected);
    }
  );

  it('keeps a leading zero in parentheses for national numbers', () => {
    expect(normalizePhoneNumber('(040) 123456')).toBe('040123456');
    expect(normalizePhoneNumber('(0) 40 123456')).toBe('040123456');
  });

  it('does not add a country code or convert 00 to a plus sign', () => {
    expect(normalizePhoneNumber('0 30 1234567')).toBe('0301234567');
    expect(normalizePhoneNumber('0049 30 123456')).toBe('004930123456');
  });

  it('keeps a (0) that is not directly after the country code', () => {
    expect(normalizePhoneNumber('+49 40 123(0)456')).toBe('+49401230456');
    expect(normalizePhoneNumber('+49 40 (0)123456')).toBe('+49400123456');
    expect(normalizePhoneNumber('+49 (0)40 123(0)456')).toBe('+49401230456');
  });

  it('keeps the digits in the order they were written', () => {
    expect(normalizePhoneNumber('+49 40 123 0(456)')).toBe('+49401230456');
    expect(normalizePhoneNumber('+49 40 123456-0')).toBe('+49401234560');
  });

  it.each([
    ['+1 800 555 0199 ext. 23', '+18005550199'],
    ['+1 800 555 0199 ext 23', '+18005550199'],
    ['+1 800 555 0199 extension: 23', '+18005550199'],
    ['+1 800 555 0199 x23', '+18005550199'],
    ['+1 800 555 0199 X 23', '+18005550199'],
    ['+1 (800) 555-0199 x123', '+18005550199'],
    ['+1 800 555 0199;ext=23', '+18005550199'],
    ['030 123 456 ext. 12', '030123456'],
    ['+4930123456,,12', '+4930123456'],
    ['+49 30 123456, 0171 987', '+4930123456'],
  ])('drops the extension from %j', (input, expected) => {
    expect(normalizePhoneNumber(input)).toBe(expected);
  });

  it('keeps # and * in service codes', () => {
    expect(normalizePhoneNumber('*21*0301234567#')).toBe('*21*0301234567#');
  });

  it('does not read letters inside words as an extension marker', () => {
    expect(normalizePhoneNumber('Fax 040 123456')).toBe('040123456');
    expect(normalizePhoneNumber('Text 040 123456')).toBe('040123456');
  });

  it('converts full-width digits and plus sign', () => {
    expect(normalizePhoneNumber('＋４９ ４０ １２３４５６')).toBe(
      '+4940123456'
    );
  });

  it('keeps only one leading plus sign', () => {
    expect(normalizePhoneNumber('+49 +40 123')).toBe('+4940123');
  });

  it('returns an empty string when nothing is dialable', () => {
    expect(normalizePhoneNumber('')).toBe('');
    expect(normalizePhoneNumber('not a number')).toBe('');
    expect(normalizePhoneNumber('\u202a\u202c')).toBe('');
  });
});

describe('parseTelephonyLink number normalization', () => {
  it.each([
    ['tel:+49%20(0)40%20123456', '+4940123456'],
    ['tel:040/123456', '040123456'],
    ['tel:+49-30-123%2056', '+493012356'],
    ['callto:+49%E2%80%AA40123456', '+4940123456'],
    ['tel:%EF%BC%8B49%2040%20123456', '+4940123456'],
  ])('normalizes %j', (input, expected) => {
    expect(parseTelephonyLink(input)).toEqual({
      phoneNumber: expected,
      rawUri: input,
    });
  });

  it('keeps RFC 3966 parameters after the number', () => {
    expect(parseTelephonyLink('tel:+1 234;ext=5678')?.phoneNumber).toBe(
      '+1234;ext=5678'
    );
    expect(
      parseTelephonyLink('tel:123;phone-context=example.com')?.phoneNumber
    ).toBe('123;phone-context=example.com');
  });

  it('rejects a link with no digits in the number', () => {
    expect(parseTelephonyLink('tel:abc')).toBeNull();
    expect(parseTelephonyLink('tel:;ext=5678')).toBeNull();
  });
});
