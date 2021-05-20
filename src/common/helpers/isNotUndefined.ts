export const isNotUndefined = <T>(value: T | undefined): value is T =>
  value !== undefined;
