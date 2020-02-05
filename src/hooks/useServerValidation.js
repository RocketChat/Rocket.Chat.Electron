import { useCallableSaga } from '../components/SagaMiddlewareProvider';
import { validateHostSaga } from '../sagas/servers';

export const useServerValidation = () => useCallableSaga(validateHostSaga, []);
