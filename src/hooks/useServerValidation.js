import { useCallableSaga } from '../components/SagaMiddlewareProvider';
import { validateServerUrl } from '../sagas/servers';

export const useServerValidation = () => useCallableSaga(validateServerUrl, []);
