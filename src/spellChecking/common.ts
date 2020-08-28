export type Dictionary = {
  name: string;
  enabled?: boolean;
  aff?: string;
  dic?: string;
};

export const compareDictionaries = (a: Dictionary, b: Dictionary): number =>
  a.name.localeCompare(b.name);
