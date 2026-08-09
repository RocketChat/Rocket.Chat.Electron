/**
 * Facet selections use "empty means everything", so an untouched filter stays
 * valid when new options show up in the data.
 *
 * Toggling expands "all" into an explicit list first, then collapses back to
 * "all" once every option is selected again — or once none is, which would
 * otherwise leave the list showing nothing with no way back from the sidebar.
 */
export const toggleFacet = <T extends string>(
  selected: T[],
  option: T,
  universe: T[]
): T[] => {
  const current = selected.length === 0 ? universe : selected;
  const next = current.includes(option)
    ? current.filter((value) => value !== option)
    : [...current, option];

  if (next.length === 0 || next.length >= universe.length) {
    return [];
  }

  return next;
};

export const isFacetSelected = <T extends string>(
  selected: T[],
  option: T
): boolean => selected.length === 0 || selected.includes(option);
