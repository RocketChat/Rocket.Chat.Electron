/**
 * @jest-environment jsdom
 */
import { createAnchor } from './createAnchor';
import { deleteAnchor, registerAnchor } from './deleteAnchor';

describe('createAnchor', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('creates a div anchor by default and appends it to the body', () => {
    const anchor = createAnchor('anchor-default');

    expect(anchor.tagName.toLowerCase()).toBe('div');
    expect(anchor.id).toBe('anchor-default');
    expect(document.getElementById('anchor-default')).toBe(anchor);
    expect(anchor.parentElement).toBe(document.body);
  });

  it('creates an anchor using the requested tag name', () => {
    const anchor = createAnchor('anchor-span', 'span');

    expect(anchor.tagName.toLowerCase()).toBe('span');
    expect(document.body.contains(anchor)).toBe(true);
  });

  it('reuses an existing anchor when id and tag match', () => {
    const first = createAnchor('anchor-reuse');
    const second = createAnchor('anchor-reuse');

    expect(second).toBe(first);
    expect(document.querySelectorAll('#anchor-reuse')).toHaveLength(1);
  });

  it('creates a fresh anchor when an element with the id exists but the tag differs', () => {
    const first = createAnchor('anchor-tag-mismatch', 'div');
    const second = createAnchor('anchor-tag-mismatch', 'span');

    expect(second).not.toBe(first);
    expect(second.tagName.toLowerCase()).toBe('span');
  });

  it('registers a cleanup function that removes the anchor on deleteAnchor', () => {
    const anchor = createAnchor('anchor-cleanup');

    expect(document.body.contains(anchor)).toBe(true);

    deleteAnchor(anchor);

    expect(document.body.contains(anchor)).toBe(false);
    expect(document.getElementById('anchor-cleanup')).toBeNull();
  });
});

describe('deleteAnchor', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('invokes the cleanup callback registered for the element', () => {
    const element = document.createElement('div');
    const cleanup = jest.fn();
    registerAnchor(element, cleanup);

    deleteAnchor(element);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('does nothing for an element that was never registered', () => {
    const element = document.createElement('div');

    expect(() => deleteAnchor(element)).not.toThrow();
  });

  it('runs the latest cleanup callback when an element is re-registered', () => {
    const element = document.createElement('div');
    const first = jest.fn();
    const second = jest.fn();

    registerAnchor(element, first);
    registerAnchor(element, second);
    deleteAnchor(element);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
