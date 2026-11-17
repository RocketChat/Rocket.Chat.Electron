// The main process builds the worker env. A packaged build drops the store
// switch, so only a dev build can select the snapshot store. This module
// must not import the worker code: the main process loads it, and the worker
// code loads the native search module.
export const workerEnvOf = (
  env: Record<string, string | undefined>,
  isPackaged: boolean
): Record<string, string> => {
  const workerEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) workerEnv[key] = value;
  }
  if (isPackaged) delete workerEnv.ROCKETCHAT_E2EE_SEARCH_STORE;
  return workerEnv;
};
