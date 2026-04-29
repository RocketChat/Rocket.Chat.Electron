import type { Server } from '../common';
import { setServerBuildSignals } from './serverBuild';

export const setGitCommitHash = (
  gitCommitHash: Server['gitCommitHash']
): void => {
  setServerBuildSignals({ buildId: gitCommitHash, buildIdSource: 'commit' });
};
