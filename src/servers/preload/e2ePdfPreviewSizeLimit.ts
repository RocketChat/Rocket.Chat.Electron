import { DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB } from '../../constants';
import { safeSelect } from '../../store';

export const getE2ePdfPreviewSizeLimit = (): number =>
  safeSelect(({ e2ePdfPreviewSizeLimit }) => e2ePdfPreviewSizeLimit) ??
  DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB;
