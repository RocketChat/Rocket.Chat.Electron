export const SPELL_CHECKING_TOGGLED = 'spell-checking/toggled';
export const SPELL_CHECKING_LANGUAGE_TOGGLED =
  'spell-checking/language-toggled';

export type SpellCheckingActionTypeToPayloadMap = {
  [SPELL_CHECKING_TOGGLED]: boolean;
  [SPELL_CHECKING_LANGUAGE_TOGGLED]: { name: string; enabled: boolean };
};
