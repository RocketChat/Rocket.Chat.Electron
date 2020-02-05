import { useCallableSaga } from '../components/SagaMiddlewareProvider';
import { getMisspelledWordsSaga } from '../sagas/spellChecking';

export const useMisspellingDetection = () => useCallableSaga(getMisspelledWordsSaga, []);
