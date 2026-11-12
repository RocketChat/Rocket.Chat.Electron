// Invisible formatting characters that apps such as Outlook and Teams wrap
// around copied phone numbers: soft hyphen, zero-width spaces and joiners,
// bidirectional marks, embeddings, isolates and the byte-order mark.
const INVISIBLE_FORMAT_CHARACTERS =
  /[\u00ad\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\ufeff]/g;

// "ext. 23", "extension 23", "x23", a ";ext=23" URI parameter or a ",23"
// dialer pause. A dialer cannot dial the extension digits as part of the
// number, so everything from the marker on is dropped and the main line is
// dialed. '#' is not a marker, because service codes such as "*21#" use it.
const EXTENSION_MARKER =
  /(?:[;,]|(?<=[\d)\s])(?:ext(?:ension)?\.?|x)\s*[:.#]?\s*(?=\d))/i;

// "(0)" directly after the country code is the national trunk prefix that
// some countries print (+49 (0)40 ..., +44 (0)20 ...). It is not dialed in
// the international format. A "(0)" later in the number is a written digit.
const TRUNK_PREFIX_AFTER_COUNTRY_CODE =
  /^([^\d+]*(?:\+|00)[\s.-]*\d{1,3}[\s.-]*)\(\s*0\s*\)/;

const stripToDialableCharacters = (text: string): string =>
  text.replace(/[^\d+*#]/g, '').replace(/(?!^)\+/g, '');

/**
 * Reduces free-form phone number text to the characters a dialer accepts:
 * digits, '*', '#' and one leading '+'. Returns an empty string when nothing
 * dialable is left. The digits stay in the order they were written.
 */
export const normalizePhoneNumber = (text: string): string => {
  const visibleText = text
    .normalize('NFKC')
    .replace(INVISIBLE_FORMAT_CHARACTERS, '');

  const extensionMatch = EXTENSION_MARKER.exec(visibleText);
  const mainNumber = extensionMatch
    ? visibleText.slice(0, extensionMatch.index)
    : visibleText;

  return stripToDialableCharacters(
    mainNumber.replace(TRUNK_PREFIX_AFTER_COUNTRY_CODE, '$1')
  );
};
