// The module of the E2E client of the web client, for scripts that run in the
// page (puppeteer page.evaluate).
//
// The Meteor client has a global `require`. On the Vite dev server of the core
// (`yarn dev`, the page loads /@vite/client), that `require` does not know the
// client modules. There the page imports the source file through its /@fs/
// URL. Vite gives the app the same URL for the file, so the import returns the
// module instance that the app uses.
//
// installE2eModule(page, coreDir) adds `window.__harnessE2e()` to each
// document of the page. It resolves to the module, or rejects while the
// client is not loaded yet. Call it before the first navigation of the page.

import { realpathSync } from 'node:fs';
import { join } from 'node:path';

export const E2E_MODULE_PATH = 'client/lib/e2ee/rocketchat.e2e.ts';

export const e2eModuleViteUrl = (coreDir) =>
  `/@fs${realpathSync(join(coreDir, 'apps', 'meteor', E2E_MODULE_PATH))}`;

export const installE2eModule = (page, coreDir) =>
  page.evaluateOnNewDocument(
    (meteorPath, viteUrl) => {
      window.__harnessE2e = async () =>
        document.querySelector('script[src^="/@vite/client"]')
          ? import(viteUrl)
          : window.require(meteorPath);
    },
    `/${E2E_MODULE_PATH}`,
    e2eModuleViteUrl(coreDir)
  );
