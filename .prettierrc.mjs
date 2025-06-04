import config from '@rocket.chat/prettier-config/fuselage/index.js';

export default {
  ...config,
  trailingComma: 'es5',
  semi: false,
  endOfLine: 'cr',
  singleQuote: true,
};
