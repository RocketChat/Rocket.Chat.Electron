# @ewsjs/xhr Patches

These patches modify the `@ewsjs/xhr` library for Exchange Web Services communication.

## Verbose Logging

Both `xhrApi.ts` and `ntlmProvider.ts` have `verboseLog()` functions that respect the app's verbose logging setting.

**Critical**: The `verboseLog()` function must call `console.log()` internally, NOT itself.

```typescript
// CORRECT
const verboseLog = (...args: unknown[]) => {
  if ((global as any).isVerboseOutlookLoggingEnabled) {
    console.log('[XHR]', ...args); // calls console.log
  }
};

// WRONG - causes infinite recursion and crashes the app
const verboseLog = (...args: unknown[]) => {
  if ((global as any).isVerboseOutlookLoggingEnabled) {
    verboseLog('[XHR]', ...args); // calls itself!
  }
};
```

## How Patches Work

1. Source files in `patches-src/@ewsjs/xhr/src/` are the editable versions
2. Run `yarn patches:build` to generate the actual patch files in `patches/`
3. The patches are applied to `node_modules` during `yarn install` via pnpm patch mechanism

## Files

- `xhrApi.ts` - XHR request handling for EWS
- `ntlmProvider.ts` - NTLM authentication for on-premise Exchange servers
