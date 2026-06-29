import { createRef } from 'react';

import { act, render } from '../../test-utils';
import { ReparentingContainer } from './ReparentingContainer';

describe('ReparentingContainer', () => {
  it('renders keyed children reparented out of the inner container div', () => {
    const { container } = render(
      <ReparentingContainer>
        <span key='a'>alpha</span>
        <span key='b'>beta</span>
      </ReparentingContainer>
    );

    expect(container).toHaveTextContent('alpha');
    expect(container).toHaveTextContent('beta');

    const containerNodes = container.querySelectorAll('[data-container]');
    expect(containerNodes).toHaveLength(2);
  });

  it('forwards a ref to the inner container div', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <ReparentingContainer ref={ref}>
        <span key='a'>alpha</span>
      </ReparentingContainer>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('copies the inner div attributes onto each reparented child node', () => {
    // ReparentingContainer spreads extra props onto its inner div at runtime,
    // but its prop type only declares `children`; cast to exercise that path.
    const Container = ReparentingContainer as unknown as React.FC<
      React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }
    >;

    const { container } = render(
      <Container className='wrapper' data-foo='bar'>
        <span key='a'>alpha</span>
      </Container>
    );

    const node = container.querySelector('[data-container]');
    expect(node).not.toBeNull();
    expect(node).toHaveClass('wrapper');
    expect(node).toHaveAttribute('data-foo', 'bar');
  });

  it('reuses the same DOM node for a child kept across re-renders', () => {
    const { container, rerender } = render(
      <ReparentingContainer>
        <span key='a'>alpha</span>
      </ReparentingContainer>
    );

    const nodeBefore = container.querySelector('[data-container]');

    rerender(
      <ReparentingContainer>
        <span key='a'>alpha-updated</span>
      </ReparentingContainer>
    );

    const nodeAfter = container.querySelector('[data-container]');
    expect(nodeAfter).toBe(nodeBefore);
    expect(nodeAfter).toHaveTextContent('alpha-updated');
  });

  it('adds a node when a new keyed child is introduced', () => {
    const { container, rerender } = render(
      <ReparentingContainer>
        <span key='a'>alpha</span>
      </ReparentingContainer>
    );

    expect(container.querySelectorAll('[data-container]')).toHaveLength(1);

    rerender(
      <ReparentingContainer>
        <span key='a'>alpha</span>
        <span key='b'>beta</span>
      </ReparentingContainer>
    );

    expect(container.querySelectorAll('[data-container]')).toHaveLength(2);
    expect(container).toHaveTextContent('beta');
  });

  it('removes a dropped child node after the deferred cleanup timeout elapses', () => {
    jest.useFakeTimers();

    try {
      const { container, rerender } = render(
        <ReparentingContainer>
          <span key='a'>alpha</span>
          <span key='b'>beta</span>
        </ReparentingContainer>
      );

      expect(container.querySelectorAll('[data-container]')).toHaveLength(2);

      rerender(
        <ReparentingContainer>
          <span key='a'>alpha</span>
        </ReparentingContainer>
      );

      // The dropped node is scheduled for removal but not removed yet.
      expect(container.querySelectorAll('[data-container]')).toHaveLength(2);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(container.querySelectorAll('[data-container]')).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('clears all reparented nodes after the deferred unmount cleanup elapses', () => {
    jest.useFakeTimers();

    try {
      const { unmount } = render(
        <ReparentingContainer>
          <span key='a'>alpha</span>
          <span key='b'>beta</span>
        </ReparentingContainer>
      );

      expect(document.querySelectorAll('[data-container]')).toHaveLength(2);

      unmount();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(document.querySelectorAll('[data-container]')).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('reparents children without an explicit key (flattenChildren assigns a synthetic key)', () => {
    const { container } = render(
      <ReparentingContainer>
        <span>no-key</span>
      </ReparentingContainer>
    );

    expect(container.querySelectorAll('[data-container]')).toHaveLength(1);
  });
});
