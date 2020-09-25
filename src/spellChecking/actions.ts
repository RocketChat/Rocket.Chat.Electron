import { Dictionary } from './common';

export const SPELL_CHECKING_DICTIONARIES_LOADED = 'spell-checking/dictionaries-loaded';
export const SPELL_CHECKING_READY = 'spell-checking/ready';

export type SpellCheckingActionTypeToPayloadMap = {
  [SPELL_CHECKING_DICTIONARIES_LOADED]: Dictionary[];
  [SPELL_CHECKING_READY]: never;
};
