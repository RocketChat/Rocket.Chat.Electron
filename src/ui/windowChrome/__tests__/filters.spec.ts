import { isFacetSelected, toggleFacet } from '../filters';

const OPTIONS = ['error', 'warn', 'info'];

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
    expect(toggleFacet([], 'warn', OPTIONS)).toEqual(['error', 'info']);
  });

  it('collapses back to "all" once every option is selected again', () => {
    expect(toggleFacet(['error', 'info'], 'warn', OPTIONS)).toEqual([]);
  });

  it('collapses to "all" rather than leaving nothing selected', () => {
    expect(toggleFacet(['warn'], 'warn', OPTIONS)).toEqual([]);
  });

  it('removes an option from a partial selection', () => {
    expect(toggleFacet(['error', 'warn'], 'error', OPTIONS)).toEqual(['warn']);
  });

  it('adds an option to a partial selection', () => {
    expect(toggleFacet(['error'], 'info', OPTIONS)).toEqual(['error', 'info']);
  });

  it('collapses stale selections that outgrew the option list', () => {
    expect(toggleFacet(['error', 'warn', 'gone'], 'info', OPTIONS)).toEqual([]);
  });

  it('never mutates the incoming selection', () => {
    const selected = ['error'];
    toggleFacet(selected, 'info', OPTIONS);
    expect(selected).toEqual(['error']);
  });
});
