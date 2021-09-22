import * as core from '@actions/core';

import { run, runElectronBuilder } from './shell';

export const disableSpotlightIndexing = (): Promise<void> =>
  core.group(
    'Disable Spotlight indexing (to avoid errors of DMG generation)',
    () => run(`sudo mdutil -a -i off`)
  );

export const packOnMacOS = (): Promise<void> =>
  runElectronBuilder(`--mac --universal`, {
    CSC_LINK: core.getInput('mac_csc_link'),
    CSC_KEY_PASSWORD: core.getInput('mac_csc_key_password'),
    IS_PULL_REQUEST: 'false',
    APPLEID: core.getInput('mac_apple_id'),
    APPLEIDPASS: core.getInput('mac_apple_id_password'),
    ASC_PROVIDER: core.getInput('mac_asc_provider'),
  });
