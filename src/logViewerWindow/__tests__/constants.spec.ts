import {
  AUTO_REFRESH_INTERVAL_MS,
  SCROLL_DELAY_MS,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_DEFAULT_HEIGHT,
  SEARCH_DEBOUNCE_MS,
  VIRTUOSO_OVERSCAN,
} from '../constants';

describe('logViewerWindow constants', () => {
  it('contains expected default tuning values', () => {
    expect(AUTO_REFRESH_INTERVAL_MS).toBe(2000);
    expect(SCROLL_DELAY_MS).toBe(100);
    expect(WINDOW_DEFAULT_WIDTH).toBe(1700);
    expect(WINDOW_DEFAULT_HEIGHT).toBe(1080);
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
    expect(VIRTUOSO_OVERSCAN).toBe(50);
  });
});
