import { useCallableSaga } from '../components/SagaMiddlewareProvider';
import { getCorrectionsForMisspellingSaga } from '../sagas/spellChecking';

export const useCorrectionsForMisspelling = () => useCallableSaga(getCorrectionsForMisspellingSaga, []);
