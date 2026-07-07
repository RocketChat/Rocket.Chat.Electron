import * as utils from '../index';
import { meetsMinimumVersion } from '../versionUtils';

describe('utils index', () => {
  it('re-exports utility members', () => {
    expect(utils.openExternal).toBeDefined();
    expect(utils.meetsMinimumVersion).toBe(meetsMinimumVersion);
  });
});
