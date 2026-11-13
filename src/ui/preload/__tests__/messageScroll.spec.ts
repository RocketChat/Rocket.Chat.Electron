/**
 * @jest-environment jsdom
 */
import {
  handleImageLoad,
  handleScroll,
  injectEmojiSizingStyles,
  listenToMessageScrollEvents,
  markUserInitiatedScroll,
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
});
