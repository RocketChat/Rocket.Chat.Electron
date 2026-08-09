import { screen } from 'electron';

import { select } from '../../store';
import { getSavedWindowBounds } from './secondaryWindowState';

jest.mock('electron', () => ({
  screen: { getAllDisplays: jest.fn() },
}));

jest.mock('../../store', () => ({
  select: jest.fn(),
  dispatch: jest.fn(),
}));

const mockSelect = select as jest.MockedFunction<typeof select>;
const mockGetAllDisplays = screen.getAllDisplays as jest.Mock;

const withSaved = (bounds: unknown) => {
  mockSelect.mockImplementation((selector: any) =>
    selector({ secondaryWindowStates: { downloads: bounds } })
  );
};

describe('getSavedWindowBounds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllDisplays.mockReturnValue([
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
    ]);
  });

  it('returns bounds that land on a display', () => {
    withSaved({ x: 100, y: 80, width: 900, height: 600 });

    expect(getSavedWindowBounds('downloads')).toEqual({
      x: 100,
      y: 80,
      width: 900,
      height: 600,
    });
  });

  it('keeps a window that merely overlaps an edge', () => {
    withSaved({ x: -40, y: 20, width: 900, height: 600 });

    expect(getSavedWindowBounds('downloads')).not.toBeUndefined();
  });

  it('drops bounds on a display that is no longer attached', () => {
    // Saved on a second monitor that has since been unplugged.
    withSaved({ x: 3000, y: 200, width: 900, height: 600 });

    expect(getSavedWindowBounds('downloads')).toBeUndefined();
  });

  it('ignores nothing-saved and malformed entries', () => {
    withSaved(undefined);
    expect(getSavedWindowBounds('downloads')).toBeUndefined();

    withSaved({ x: 10, y: 10 });
    expect(getSavedWindowBounds('downloads')).toBeUndefined();

    withSaved({ x: 10, y: 10, width: 0, height: 600 });
    expect(getSavedWindowBounds('downloads')).toBeUndefined();

    withSaved({ x: NaN, y: 10, width: 900, height: 600 });
    expect(getSavedWindowBounds('downloads')).toBeUndefined();
  });

  it('returns nothing when the window has no saved entry', () => {
    mockSelect.mockImplementation((selector: any) =>
      selector({ secondaryWindowStates: {} })
    );

    expect(getSavedWindowBounds('settings')).toBeUndefined();
  });
});
