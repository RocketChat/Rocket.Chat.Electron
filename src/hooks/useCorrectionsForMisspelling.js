import { useCallableSaga } from '../components/SagaMiddlewareProvider';
import { getCorrectionsForMisspelling } from '../sagas/spellChecking';

export const useCorrectionsForMisspelling = () => useCallableSaga(getCorrectionsForMisspelling, []);
