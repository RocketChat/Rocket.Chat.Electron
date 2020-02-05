import { updatesSaga } from './sagas';
import { useSaga } from '../SagaMiddlewareProvider';

export function UpdatesProvider({ children }) {
	useSaga(updatesSaga, []);

	return children;
}
