/**
 * A facet's selection: `null` while the reader has not touched it, which means
 * everything and keeps including options that show up in the data later, or an
 * explicit list of what they picked — including none at all.
 *
 * Untouched and "none selected" have to be distinguishable. Folding them
 * together, as an empty array did, meant unchecking the last option silently
 * ticked every box again, so the list could never be emptied from the sidebar.
 */
export type FacetSelection<T extends string = string> = T[] | null;

/**
 * Toggles one option, expanding "everything" into an explicit list first and
 * collapsing back to it once every option is picked again — so a facet the
 * reader has fully re-selected keeps taking in new options.
 */
export const toggleFacet = <T extends string>(
  selected: FacetSelection<T>,
  option: T,
  universe: T[]
): FacetSelection<T> => {
  const current =
    selected === null
      ? universe
      : selected.filter((value) => universe.includes(value));
  const next = current.includes(option)
    ? current.filter((value) => value !== option)
    : [...current, option];

  if (next.length >= universe.length) {
    return null;
  }

  return next;
};

/**
 * A value outside the facet's universe (e.g. a status the facet doesn't
 * offer as an option) can never be narrowed out by that facet, so it always
 * matches regardless of the current selection.
 */
export const isFacetSelected = <T extends string>(
  selected: FacetSelection<T>,
  option: T,
  universe?: readonly T[]
): boolean =>
  selected === null ||
  (universe !== undefined && !universe.includes(option)) ||
  selected.includes(option);

/** Whether the reader has narrowed this facet at all. */
export const isFacetNarrowed = <T extends string>(
  selected: FacetSelection<T>
): boolean => selected !== null;

/**
 * Persisted selections are user-editable JSON, so never trust their shape: only
 * an array is an explicit selection, anything else means untouched.
 */
export const readFacetSelection = <T extends string>(
  stored: unknown
): FacetSelection<T> => (Array.isArray(stored) ? (stored as T[]) : null);
