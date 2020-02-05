import { spellCheckingSaga, getCorrectionsForMisspellingSaga, getMisspelledWordsSaga } from './sagas';
import { useSaga, useCallableSaga } from '../SagaMiddlewareProvider';

export function SpellCheckingProvider({ children }) {
	useSaga(spellCheckingSaga, []);

	return children;
}

export const useCorrectionsForMisspelling = () => useCallableSaga(getCorrectionsForMisspellingSaga, []);

export const useMisspellingDetection = () => useCallableSaga(getMisspelledWordsSaga, []);
