import {
  isFacetNarrowed,
  isFacetSelected,
  readFacetSelection,
  toggleFacet,
} from '../filters';

const OPTIONS = ['error', 'warn', 'info'];

describe('isFacetSelected', () => {
  it('treats an untouched facet as everything selected', () => {
    expect(isFacetSelected(null, 'error')).toBe(true);
    expect(isFacetSelected(null, 'warn')).toBe(true);
  });

  it('honours an explicit selection', () => {
    expect(isFacetSelected(['error'], 'error')).toBe(true);
    expect(isFacetSelected(['error'], 'warn')).toBe(false);
  });

  it('treats an empty selection as nothing selected', () => {
    expect(isFacetSelected([], 'error')).toBe(false);
  });

  it('always matches a value outside the facet universe, even when narrowed', () => {
    expect(isFacetSelected(['error'], 'all', OPTIONS)).toBe(true);
    expect(isFacetSelected([], 'all', OPTIONS)).toBe(true);
  });

  it('honours an explicit selection for a value inside the universe', () => {
    expect(isFacetSelected(['error'], 'warn', OPTIONS)).toBe(false);
  });
});

describe('toggleFacet', () => {
  it('expands "all" into an explicit selection when one option is removed', () => {
    expect(toggleFacet(null, 'warn', OPTIONS)).toEqual(['error', 'info']);
  });

  it('collapses back to "all" once every option is selected again', () => {
    expect(toggleFacet(['error', 'info'], 'warn', OPTIONS)).toBeNull();
  });

  it('lets the reader clear the last option instead of ticking them all back', () => {
    expect(toggleFacet(['warn'], 'warn', OPTIONS)).toEqual([]);
  });

  it('adds back to an emptied facet', () => {
    expect(toggleFacet([], 'warn', OPTIONS)).toEqual(['warn']);
  });

  it('removes an option from a partial selection', () => {
    expect(toggleFacet(['error', 'warn'], 'error', OPTIONS)).toEqual(['warn']);
  });

  it('adds an option to a partial selection', () => {
    expect(toggleFacet(['error'], 'info', OPTIONS)).toEqual(['error', 'info']);
  });

  it('collapses stale selections that outgrew the option list once every current option is picked', () => {
    expect(toggleFacet(['error', 'warn', 'gone'], 'info', OPTIONS)).toBeNull();
  });

  it('does not let a stale persisted value inflate the count and force-collapse to "all"', () => {
    expect(toggleFacet(['error', 'gone'], 'warn', OPTIONS)).toEqual([
      'error',
      'warn',
    ]);
  });

  it('drops stale values instead of counting them toward the universe', () => {
    expect(toggleFacet(['gone'], 'error', OPTIONS)).toEqual(['error']);
  });

  it('never mutates the incoming selection', () => {
    const selected = ['error'];
    toggleFacet(selected, 'info', OPTIONS);
    expect(selected).toEqual(['error']);
  });
});

describe('isFacetNarrowed', () => {
  it('is false while the facet is untouched', () => {
    expect(isFacetNarrowed(null)).toBe(false);
  });

  it('is true for any explicit selection, including none', () => {
    expect(isFacetNarrowed(['error'])).toBe(true);
    expect(isFacetNarrowed([])).toBe(true);
  });
});

describe('readFacetSelection', () => {
  it('keeps an array as an explicit selection', () => {
    expect(readFacetSelection(['error'])).toEqual(['error']);
    expect(readFacetSelection([])).toEqual([]);
  });

  it('treats anything else as untouched', () => {
    expect(readFacetSelection(undefined)).toBeNull();
    expect(readFacetSelection('error')).toBeNull();
    expect(readFacetSelection({ error: true })).toBeNull();
  });
});
