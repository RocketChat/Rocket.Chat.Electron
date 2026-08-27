import { advanceVisibleCount } from '../pagination';

describe('advanceVisibleCount', () => {
  it('advances by a page while entries remain', () => {
    expect(advanceVisibleCount(100, 1000, 100)).toBe(200);
  });

  it('never overshoots the total', () => {
    expect(advanceVisibleCount(100, 130, 100)).toBe(130);
  });

  it('settles once everything is shown, so endReached cannot loop', () => {
    expect(advanceVisibleCount(130, 130, 100)).toBe(130);
    expect(advanceVisibleCount(500, 130, 100)).toBe(500);
  });

  it('settles on an empty list', () => {
    expect(advanceVisibleCount(100, 0, 100)).toBe(100);
  });

  it('reaches the end in a bounded number of steps', () => {
    let count = 100;
    let steps = 0;
    while (advanceVisibleCount(count, 1000, 100) !== count) {
      count = advanceVisibleCount(count, 1000, 100);
      steps += 1;
      expect(steps).toBeLessThan(20);
    }
    expect(count).toBe(1000);
  });
});
