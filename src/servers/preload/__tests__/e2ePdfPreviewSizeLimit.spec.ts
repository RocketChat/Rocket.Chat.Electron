import { DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB } from '../../../constants';
import { safeSelect } from '../../../store';
import { getE2ePdfPreviewSizeLimit } from '../e2ePdfPreviewSizeLimit';

jest.mock('../../../store', () => ({
  safeSelect: jest.fn(),
}));

describe('e2ePdfPreviewSizeLimit', () => {
  it('uses configured value when present', () => {
    const safeSelectMock = safeSelect as jest.Mock;
    const state = { e2ePdfPreviewSizeLimit: 2048 };
    safeSelectMock.mockImplementation((selector: (value: unknown) => number) =>
      selector(state as never)
    );

    const limit = getE2ePdfPreviewSizeLimit();

    expect(limit).toBe(2048);
  });

  it('falls back to default when setting is missing', () => {
    const safeSelectMock = safeSelect as jest.Mock;
    const state = { e2ePdfPreviewSizeLimit: undefined };
    safeSelectMock.mockImplementation((selector: (value: unknown) => number) =>
      selector(state as never)
    );

    const limit = getE2ePdfPreviewSizeLimit();

    expect(limit).toBe(DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB);
  });
});
