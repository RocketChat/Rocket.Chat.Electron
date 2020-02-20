import { useCallableSaga } from '../components/SagaMiddlewareProvider';
import { getMisspelledWords } from '../sagas/spellChecking';

export const useMisspellingDetection = () => useCallableSaga(getMisspelledWords, []);
