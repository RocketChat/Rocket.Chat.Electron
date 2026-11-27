// Errors of a state that the app expects, such as a call before a feature
// opens. Electron logs every rejected IPC handler at error level, with the
// stack, through console.error. The console override skips that line for
// these errors. The code that throws one logs the state itself.
const expected = new WeakSet<object>();

export const markExpectedError = <T extends Error>(error: T): T => {
  expected.add(error);
  return error;
};

export const isExpectedError = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && expected.has(value);
