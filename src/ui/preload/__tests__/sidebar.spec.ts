/**
 * @jest-environment jsdom
 */
export {};

import { handleTrafficLightsSpacing } from '../sidebar';

const mockWatch = jest.fn();

jest.mock('../../../store', () => ({
  watch: (...args: unknown[]) => mockWatch(...args),
}));

const originalPlatform = process.platform;

describe('ui/preload/sidebar', () => {
  let style: { id: string; innerHTML: string };
  let onSideBarVisibilityChange: (isSideBarVisible: boolean) => void;

  beforeEach(() => {
    mockWatch.mockReset();
    style = { id: '', innerHTML: '' };
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    jest.spyOn(document, 'createElement').mockReturnValue(style as any);
    jest.spyOn(document.head, 'append').mockImplementation(() => undefined);
    mockWatch.mockImplementation((_, cb) => {
      onSideBarVisibilityChange = cb as (isSideBarVisible: boolean) => void;
      return undefined;
    });
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  it('does nothing outside darwin', () => {
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
    });

    handleTrafficLightsSpacing();
    expect(mockWatch).not.toHaveBeenCalled();
  });

  it('adds a style listener on darwin and updates spacing', () => {
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });

    handleTrafficLightsSpacing();
    expect(document.getElementById).toHaveBeenCalledWith('sidebar-padding');
    expect(document.createElement).toHaveBeenCalledWith('style');
    expect(style.id).toBe('sidebar-padding');
    expect(document.head.append).toHaveBeenCalledWith(style as unknown as Node);

    onSideBarVisibilityChange(true);
    expect(style.innerHTML).toContain('padding-top: 0 !important');

    onSideBarVisibilityChange(false);
    expect(style.innerHTML).toContain('padding-top: 10px !important');
  });
});
