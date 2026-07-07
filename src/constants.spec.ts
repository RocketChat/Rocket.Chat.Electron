import { DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB } from './constants';

describe('constants', () => {
  it('defines the E2E PDF preview size limit default', () => {
    expect(DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB).toBe(10);
  });

  it('can be compared deterministically as a number', () => {
    expect(typeof DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB).toBe('number');
  });
});
