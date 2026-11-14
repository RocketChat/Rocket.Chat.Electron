/**
 * @jest-environment jsdom
 */
import {
  handleImageLoad,
  handleResize,
  handleScroll,
  injectEmojiSizingStyles,
  listenToMessageScrollEvents,
  markUserInitiatedScroll,
  pinContainerToBottom,
  resetUserInitiatedScroll,
  setFollowingBottom,
  getFollowingBottom,
} from '../messageScroll';

describe('ui/preload/messageScroll', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
    addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    resetUserInitiatedScroll();
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    resetUserInitiatedScroll();
  });

  it('registers all required listeners and injects sizing styles on initialize', () => {
    const cleanup = listenToMessageScrollEvents();

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'load',
      expect.any(Function),
      true
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      true
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'wheel',
      expect.any(Function),
      { passive: true, capture: true }
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'touchmove',
      expect.any(Function),
      { passive: true, capture: true }
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'pointerdown',
      expect.any(Function),
      { passive: true, capture: true }
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      true
    );

    const styleEl = document.getElementById(
      'rcx-custom-emoji-intrinsic-sizing'
    );
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('contain: size layout');
    expect(styleEl?.textContent).toContain('width: 1.5em');
    expect(styleEl?.textContent).toContain('width: 2.75em');
    expect(styleEl?.textContent).toContain('aspect-ratio');
    expect(styleEl?.textContent).toContain(':where(');
    expect(styleEl?.textContent).toContain('background-size: contain');

    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'load',
      expect.any(Function),
      true
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      true
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'wheel',
      expect.any(Function),
      true
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'touchmove',
      expect.any(Function),
      true
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'pointerdown',
      expect.any(Function),
      true
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      true
    );
    expect(
      document.getElementById('rcx-custom-emoji-intrinsic-sizing')
    ).toBeNull();
  });

  it('does not re-inject styles if stylesheet is already present', () => {
    injectEmojiSizingStyles();
    const firstStyle = document.getElementById(
      'rcx-custom-emoji-intrinsic-sizing'
    );

    injectEmojiSizingStyles();
    const styles = document.querySelectorAll(
      '#rcx-custom-emoji-intrinsic-sizing'
    );

    expect(styles.length).toBe(1);
    expect(styles[0]).toBe(firstStyle);
  });

  it('preserves following bottom state during programmatic scrolls or layout expansions', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });

    // Start at bottom
    container.scrollTop = 600;
    setFollowingBottom(container, true);

    // Layout expansion increases scrollHeight so distance becomes 100 > 10
    Object.defineProperty(container, 'scrollHeight', {
      value: 1100,
      configurable: true,
    });

    // Programmatic/layout scroll event fires WITHOUT user input
    handleScroll({ target: container } as unknown as Event);

    // Must NOT be cleared to false!
    expect(getFollowingBottom(container)).toBe(true);
  });

  it('clears following bottom state only on user-initiated scroll away from bottom', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });

    // Start at bottom
    container.scrollTop = 600;
    setFollowingBottom(container, true);

    // User spins mouse wheel / touches scrollbar to scroll up
    markUserInitiatedScroll();
    container.scrollTop = 200; // distance = 400 > 10

    handleScroll({ target: container } as unknown as Event);

    // Now it should be marked false!
    expect(getFollowingBottom(container)).toBe(false);

    // User scrolls back to bottom (distance = 0 <= 10)
    container.scrollTop = 600;
    handleScroll({ target: container } as unknown as Event);

    // Should be restored to true!
    expect(getFollowingBottom(container)).toBe(true);
  });

  it('re-pins scroll to bottom when custom emoji finishes loading while following bottom', () => {
    const container = document.createElement('div');
    container.setAttribute('data-qa', 'message-list');

    Object.defineProperty(container, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });
    container.scrollTop = 600;
    setFollowingBottom(container, true);

    const message = document.createElement('div');
    message.className = 'rcx-message';

    const emojiImg = document.createElement('img');
    emojiImg.className = 'rcx-message__emoji rcx-message__emoji--big';
    emojiImg.setAttribute('src', '/emoji-custom/test.gif');

    message.appendChild(emojiImg);
    container.appendChild(message);
    document.body.appendChild(container);

    // Post-load layout expansion
    Object.defineProperty(container, 'scrollHeight', {
      value: 1050,
      configurable: true,
    });

    handleImageLoad({ target: emojiImg } as unknown as Event);

    expect(container.scrollTop).toBe(650);
  });

  it('corrects bottom scroll even when expansion exceeds 80 pixels (regression test)', () => {
    const container = document.createElement('div');
    container.setAttribute('data-qa', 'message-list');

    Object.defineProperty(container, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });
    container.scrollTop = 600;
    setFollowingBottom(container, true);

    const message = document.createElement('div');
    message.className = 'rcx-message';

    const emojiImg = document.createElement('img');
    emojiImg.className = 'rcx-message__emoji rcx-message__emoji--big';
    emojiImg.setAttribute('src', '/emoji-custom/large.gif');
    Object.defineProperty(emojiImg, 'offsetHeight', {
      value: 120,
      configurable: true,
    });

    message.appendChild(emojiImg);
    container.appendChild(message);
    document.body.appendChild(container);

    // Expansion by 120px (> 80px)
    Object.defineProperty(container, 'scrollHeight', {
      value: 1120,
      configurable: true,
    });

    handleImageLoad({ target: emojiImg } as unknown as Event);

    expect(container.scrollTop).toBe(720);
    expect(getFollowingBottom(container)).toBe(true);
  });

  it('does not scroll when user is scrolled up into message history', () => {
    const container = document.createElement('div');
    container.className = 'messages-box';

    Object.defineProperty(container, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 1500,
      configurable: true,
    });
    container.scrollTop = 200;
    setFollowingBottom(container, false);

    const message = document.createElement('div');
    message.setAttribute('data-qa', 'message');

    const emojiImg = document.createElement('img');
    emojiImg.className = 'rcx-message__emoji';
    emojiImg.setAttribute('src', '/emoji-custom/wave.png');

    message.appendChild(emojiImg);
    container.appendChild(message);
    document.body.appendChild(container);

    handleImageLoad({ target: emojiImg } as unknown as Event);

    // Reading position must be preserved!
    expect(container.scrollTop).toBe(200);
  });

  it('ignores non-image targets and images outside messages', () => {
    const container = document.createElement('div');
    container.setAttribute('data-qa', 'message-list');
    Object.defineProperty(container, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });
    container.scrollTop = 600;

    const avatar = document.createElement('div');
    avatar.className = 'rcx-avatar';
    container.appendChild(avatar);
    document.body.appendChild(container);

    handleImageLoad({ target: avatar } as unknown as Event);
    expect(container.scrollTop).toBe(600);

    const outsideImg = document.createElement('img');
    outsideImg.setAttribute('src', '/header-logo.png');
    document.body.appendChild(outsideImg);

    handleImageLoad({ target: outsideImg } as unknown as Event);
    expect(container.scrollTop).toBe(600);
  });

  it('finds scrollable parent using computed style overflow-y', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientHeight', {
      value: 300,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 800,
      configurable: true,
    });
    container.scrollTop = 500;
    setFollowingBottom(container, true);

    jest.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      if (el === container) {
        return { overflowY: 'auto' } as CSSStyleDeclaration;
      }
      return { overflowY: 'visible' } as CSSStyleDeclaration;
    });

    const message = document.createElement('div');
    message.className = 'rcx-message';

    const emojiImg = document.createElement('img');
    emojiImg.className = 'rcx-message__emoji';

    message.appendChild(emojiImg);
    container.appendChild(message);
    document.body.appendChild(container);

    Object.defineProperty(container, 'scrollHeight', {
      value: 850,
      configurable: true,
    });

    handleImageLoad({ target: emojiImg } as unknown as Event);

    expect(container.scrollTop).toBe(550);
  });

  it('re-pins scroll to bottom via handleResize when custom emoji span with background-image or custom size resizes while following bottom', () => {
    const container = document.createElement('div');
    container.setAttribute('data-qa', 'message-list');
    Object.defineProperty(container, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });
    container.scrollTop = 600;
    setFollowingBottom(container, true);

    const message = document.createElement('div');
    message.className = 'rcx-message';

    // Standalone custom emoji rendered as span with background-image and custom 4rem size
    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'rcx-message__emoji--big';
    emojiSpan.style.backgroundImage = 'url(/emoji-custom/cool.png)';
    emojiSpan.style.width = '4rem';
    emojiSpan.style.height = '4rem';

    message.appendChild(emojiSpan);
    container.appendChild(message);
    document.body.appendChild(container);

    // Layout expansion occurs from 4rem rendering
    Object.defineProperty(container, 'scrollHeight', {
      value: 1100,
      configurable: true,
    });

    handleResize([{ target: emojiSpan } as unknown as ResizeObserverEntry]);

    expect(container.scrollTop).toBe(700);
    expect(getFollowingBottom(container)).toBe(true);
  });

  it('pinContainerToBottom scrolls container to bottom when following', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientHeight', {
      value: 300,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 900,
      configurable: true,
    });
    container.scrollTop = 500;
    setFollowingBottom(container, true);

    pinContainerToBottom(container);

    expect(container.scrollTop).toBe(600);
    expect(getFollowingBottom(container)).toBe(true);
  });

  it('handleResize preserves reading position when user is scrolled up in history', () => {
    const container = document.createElement('div');
    container.setAttribute('data-qa', 'message-list');
    Object.defineProperty(container, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 1500,
      configurable: true,
    });
    container.scrollTop = 250;
    setFollowingBottom(container, false);

    const message = document.createElement('div');
    message.className = 'rcx-message';

    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'rcx-message__emoji--big';

    message.appendChild(emojiSpan);
    container.appendChild(message);
    document.body.appendChild(container);

    Object.defineProperty(container, 'scrollHeight', {
      value: 1600,
      configurable: true,
    });

    handleResize([{ target: emojiSpan } as unknown as ResizeObserverEntry]);

    // Must NOT scroll to bottom; reading position preserved
    expect(container.scrollTop).toBe(250);
    expect(getFollowingBottom(container)).toBe(false);
  });

  it('handleResize safely ignores elements without a scrollable parent', () => {
    const orphanEmoji = document.createElement('span');
    orphanEmoji.className = 'rcx-message__emoji--big';

    expect(() => {
      handleResize([{ target: orphanEmoji } as unknown as ResizeObserverEntry]);
    }).not.toThrow();
  });

  it('attaches ResizeObserver and MutationObserver when supported, and disconnects on cleanup', () => {
    const observeMock = jest.fn();
    const disconnectMock = jest.fn();

    class MockResizeObserver {
      observe = observeMock;

      disconnect = disconnectMock;

      unobserve = jest.fn();
    }

    const mutationObserveMock = jest.fn();
    const mutationDisconnectMock = jest.fn();

    class MockMutationObserver {
      observe = mutationObserveMock;

      disconnect = mutationDisconnectMock;

      takeRecords = jest.fn();
    }

    const originalResizeObserver = global.ResizeObserver;
    const originalMutationObserver = global.MutationObserver;

    (global as unknown as { ResizeObserver: unknown }).ResizeObserver =
      MockResizeObserver;
    (global as unknown as { MutationObserver: unknown }).MutationObserver =
      MockMutationObserver;

    try {
      const existingMsg = document.createElement('div');
      existingMsg.className = 'rcx-message';
      document.body.appendChild(existingMsg);

      const cleanup = listenToMessageScrollEvents();

      expect(observeMock).toHaveBeenCalledWith(existingMsg);
      expect(mutationObserveMock).toHaveBeenCalledWith(
        document.body,
        expect.objectContaining({ childList: true, subtree: true })
      );

      cleanup();

      expect(disconnectMock).toHaveBeenCalled();
      expect(mutationDisconnectMock).toHaveBeenCalled();
    } finally {
      (global as unknown as { ResizeObserver: unknown }).ResizeObserver =
        originalResizeObserver;
      (global as unknown as { MutationObserver: unknown }).MutationObserver =
        originalMutationObserver;
    }
  });
});
