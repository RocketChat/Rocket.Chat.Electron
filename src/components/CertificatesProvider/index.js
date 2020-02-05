import { certificatesSaga } from './sagas';
import { useSaga } from '../SagaMiddlewareProvider';

export function CertificatesProvider({ children }) {
	useSaga(certificatesSaga, []);

	return children;
}
