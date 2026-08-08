import { isFacetSelected, toggleFacet } from '../filters';

const LEVELS = ['error', 'warn', 'info'];

describe('isFacetSelected', () => {
  it('treats an empty selection as everything selected', () => {
    expect(isFacetSelected([], 'error')).toBe(true);
    expect(isFacetSelected([], 'warn')).toBe(true);
  });

  it('honours an explicit selection', () => {
    expect(isFacetSelected(['error'], 'error')).toBe(true);
    expect(isFacetSelected(['error'], 'warn')).toBe(false);
  });
});

describe('toggleFacet', () => {
  it('expands "all" into an explicit selection when one option is removed', () => {
    expect(toggleFacet([], 'warn', LEVELS)).toEqual(['error', 'info']);
  });

  it('collapses back to "all" once every option is selected again', () => {
    expect(toggleFacet(['error', 'info'], 'warn', LEVELS)).toEqual([]);
  });

  it('collapses to "all" rather than leaving nothing selected', () => {
    expect(toggleFacet(['warn'], 'warn', LEVELS)).toEqual([]);
  });

  it('removes an option from a partial selection', () => {
    expect(toggleFacet(['error', 'warn'], 'error', LEVELS)).toEqual(['warn']);
  });

  it('adds an option to a partial selection', () => {
    expect(toggleFacet(['error'], 'info', LEVELS)).toEqual(['error', 'info']);
  });

  it('collapses stale selections that outgrew the option list', () => {
    expect(toggleFacet(['error', 'warn', 'gone'], 'info', LEVELS)).toEqual([]);
  });

  it('never mutates the incoming selection', () => {
    const selected = ['error'];
    toggleFacet(selected, 'info', LEVELS);
    expect(selected).toEqual(['error']);
  });
});
