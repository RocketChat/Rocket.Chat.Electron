export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    electronAPI?: {
      // Settings screen can set/clear the lock password
      setLockPassword?: (password: string) => Promise<unknown>;
      // Lock overlay can verify provided password
      verifyPassword?: (pwd: string) => Promise<boolean>;
      // Lock overlay can request unlocking the app
      unlockApp?: () => Promise<void>;
    };
  }
}
