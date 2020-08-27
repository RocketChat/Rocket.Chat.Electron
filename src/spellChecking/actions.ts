import { Dictionary } from './common';

export const SPELL_CHECKING_DICTIONARIES_LOADED = 'spell-checking/dictionaries-loaded';
export const SPELL_CHECKING_DICTIONARIES_UPDATED = 'spell-checking/dictionaries-updated';
export const SPELL_CHECKING_MISSPELT_WORDS_REQUESTED = 'spell-checking/misspelt-words-requested';
export const SPELL_CHECKING_MISSPELT_WORDS_RESPONDED = 'spell-checking/misspelt-words-responded';
export const SPELL_CHECKING_READY = 'spell-checking/ready';

export type SpellCheckingActionTypeToPayloadMap = {
  [SPELL_CHECKING_DICTIONARIES_LOADED]: Dictionary[];
  [SPELL_CHECKING_DICTIONARIES_UPDATED]: Dictionary[];
  [SPELL_CHECKING_MISSPELT_WORDS_REQUESTED]: string[];
  [SPELL_CHECKING_MISSPELT_WORDS_RESPONDED]: string[];
  [SPELL_CHECKING_READY]: never;
};
