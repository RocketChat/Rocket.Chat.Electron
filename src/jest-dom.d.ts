// Registers @testing-library/jest-dom matcher types on jest's global
// `expect` for type-checking (`tsc --noEmit`). The package ships the same
// augmentation, but it is only reachable through a nested triple-slash
// reference that TypeScript does not propagate under this project's classic
// `node` module resolution. It also cannot live under `src/.jest/`, because
// TypeScript excludes dot-prefixed directories from the compilation program.
// The matching runtime side-effect import lives in `src/.jest/setup.ts`.
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // The signature must mirror @types/jest's `Matchers<R, T = {}>` exactly so
    // the declarations merge; renaming or retyping the parameters breaks it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/ban-types
    interface Matchers<R = void, T = {}>
      extends TestingLibraryMatchers<
        ReturnType<typeof expect.stringContaining>,
        R
      > {}
  }
}
