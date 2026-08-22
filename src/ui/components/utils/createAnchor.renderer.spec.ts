import { createAnchor } from './createAnchor';
import { deleteAnchor } from './deleteAnchor';

describe('createAnchor / deleteAnchor', () => {
  afterEach(() => {
    const el = document.getElementById('test-anchor');
    if (el) {
      try {
        deleteAnchor(el);
      } catch {
        el.remove();
      }
    }
  });

  it('creates an element with id and reuses existing matching tag', () => {
    const a = createAnchor('test-anchor', 'div');
    expect(a.id).toBe('test-anchor');
    expect(a.tagName.toLowerCase()).toBe('div');
    const again = createAnchor('test-anchor', 'div');
    expect(again).toBe(a);
  });

  it('deleteAnchor removes registered element', () => {
    const a = createAnchor('test-anchor', 'div');
    deleteAnchor(a);
    expect(document.getElementById('test-anchor')).toBeNull();
  });
});
