/**
 * @jest-environment jsdom
 */
import {
  handleImageLoad,
  handleScroll,
  injectEmojiSizingStyles,
  listenToMessageScrollEvents,
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
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('registers load and scroll listeners and injects sizing styles on initialize', () => {
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

  it('tracks following bottom state on user scroll', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });

    // Scrolled to bottom: 1000 - 600 - 400 = 0 <= 10
    container.scrollTop = 600;
    handleScroll({ target: container } as unknown as Event);
    expect(getFollowingBottom(container)).toBe(true);

    // Scrolled away into history: 1000 - 200 - 400 = 400 > 10
    container.scrollTop = 200;
    handleScroll({ target: container } as unknown as Event);
    expect(getFollowingBottom(container)).toBe(false);
  });

  it('re-pins scroll to bottom when custom emoji finishes loading while near bottom', () => {
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

    // Simulate post-load expansion: scrollHeight increases by 50 to 1050
    Object.defineProperty(container, 'scrollHeight', {
      value: 1050,
      configurable: true,
    });

    handleImageLoad({ target: emojiImg } as unknown as Event);

    // Scroll should be pinned to the new bottom (1050 - 400 = 650)
    expect(container.scrollTop).toBe(650);
  });

  it('corrects bottom scroll even when expansion exceeds 80 pixels (regression test)', () => {
    const container = document.createElement('div');
    container.setAttribute('data-qa', 'message-list');

    // Container was at the bottom: clientHeight 400, scrollHeight 1000, scrollTop 600 (distance = 0)
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

    // Image loading causes container height to increase by 120px (> 80px threshold)
    Object.defineProperty(container, 'scrollHeight', {
      value: 1120,
      configurable: true,
    });

    handleImageLoad({ target: emojiImg } as unknown as Event);

    // Must re-pin to new bottom (1120 - 400 = 720) despite distance being 120px
    expect(container.scrollTop).toBe(720);
    expect(getFollowingBottom(container)).toBe(true);
  });

  it('does not scroll when user is scrolled up into message history', () => {
    const container = document.createElement('div');
    container.className = 'messages-box';

    // User is far from bottom
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
    container.scrollTop = 580;

    const avatar = document.createElement('div');
    avatar.className = 'rcx-avatar';
    container.appendChild(avatar);
    document.body.appendChild(container);

    // Non-image element
    handleImageLoad({ target: avatar } as unknown as Event);
    expect(container.scrollTop).toBe(580);

    // Image not part of a message or emoji
    const outsideImg = document.createElement('img');
    outsideImg.setAttribute('src', '/header-logo.png');
    document.body.appendChild(outsideImg);

    handleImageLoad({ target: outsideImg } as unknown as Event);
    expect(container.scrollTop).toBe(580);
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
