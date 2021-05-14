import { CERTIFICATES_LOADED } from '../common/actions/navigationActions';
import type { RootState } from '../common/reducers';
import { dispatch } from '../common/store';
import { joinUserPath } from './joinUserPath';
import { readJsonObject } from './readJsonObject';

export const mergeTrustedCertificates = async (
  state: RootState
): Promise<RootState> => {
  const userTrustedCertificates = await readJsonObject(
    joinUserPath('certificate.json')
  );

  const merged = {
    ...state.trustedCertificates,
    ...Object.fromEntries(
      Object.entries(userTrustedCertificates).filter(
        (pair): pair is [string, string] =>
          typeof pair[0] === 'string' && typeof pair[1] === 'string'
      )
    ),
  };

  dispatch({
    type: CERTIFICATES_LOADED,
    payload: merged,
  });

  return {
    ...state,
    trustedCertificates: merged,
  };
};
