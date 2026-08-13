/**
 * Next page size for the log list.
 *
 * This has to settle: the virtual list keeps firing `endReached` while the last
 * row stays in view, so returning a larger number once everything is already
 * rendered re-renders forever and wedges the renderer. Returning `visibleCount`
 * unchanged lets React bail out of the update instead.
 */
export const advanceVisibleCount = (
  visibleCount: number,
  totalCount: number,
  pageSize: number
): number => {
  if (visibleCount >= totalCount) {
    return visibleCount;
  }
  return Math.min(visibleCount + pageSize, totalCount);
};
