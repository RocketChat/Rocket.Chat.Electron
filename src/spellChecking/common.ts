export type Dictionary = {
  name: string;
  enabled?: boolean;
};

export const compareDictionaries = (a: Dictionary, b: Dictionary): number =>
  a.name.localeCompare(b.name);
