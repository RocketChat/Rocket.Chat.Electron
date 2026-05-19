import { safeSelect } from '../../store';

export const getE2ePdfPreviewSizeLimit = (): number =>
  safeSelect(({ e2ePdfPreviewSizeLimit }) => e2ePdfPreviewSizeLimit) ?? 10;
