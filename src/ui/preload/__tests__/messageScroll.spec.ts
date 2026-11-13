/**
 * @jest-environment jsdom
 */
import {
  handleImageLoad,
  injectEmojiSizingStyles,
  listenToMessageScrollEvents,
} from '../messageScroll';

describe('ui/preload/messageScroll', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('registers load listener and injects sizing styles on initialize', () => {
    const cleanup = listenToMessageScrollEvents();

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'load',
      expect.any(Function),
      true
    );

    const styleEl = document.getElementById(
      'rcx-custom-emoji-intrinsic-sizing'
    );
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('contain-intrinsic-size');
    expect(styleEl?.textContent).toContain('aspect-ratio');

    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'load',
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

  it('re-pins scroll to bottom when custom emoji finishes loading while near bottom', () => {
    const container = document.createElement('div');
    container.setAttribute('data-qa', 'message-list');

    // Simulate scroll container dimensions:
    // clientHeight = 400, scrollHeight = 1000.
    // If scrollTop = 580, distance to bottom is 1000 - 580 - 400 = 20 <= 80
    Object.defineProperty(container, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });
    container.scrollTop = 580;

    const message = document.createElement('div');
    message.className = 'rcx-message';

    const emojiImg = document.createElement('img');
    emojiImg.className = 'rcx-message__emoji rcx-message__emoji--big';
    emojiImg.setAttribute('src', '/emoji-custom/test.gif');

    message.appendChild(emojiImg);
    container.appendChild(message);
    document.body.appendChild(container);

    // Image load event fires
    handleImageLoad({ target: emojiImg } as unknown as Event);

    // Scroll should be pinned to the new bottom (1000 - 400 = 600)
    expect(container.scrollTop).toBe(600);
  });

  it('does not scroll when user is scrolled up into message history', () => {
    const container = document.createElement('div');
    container.className = 'messages-box';

    // User is far from bottom:
    // clientHeight = 400, scrollHeight = 1500, scrollTop = 200
    // distanceToBottom = 1500 - 200 - 400 = 900 >> 80
    Object.defineProperty(container, 'clientHeight', {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(container, 'scrollHeight', {
      value: 1500,
      configurable: true,
    });
    container.scrollTop = 200;

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
    container.scrollTop = 480;

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

    handleImageLoad({ target: emojiImg } as unknown as Event);

    // Should find container via computed style and pin to bottom: 800 - 300 = 500
    expect(container.scrollTop).toBe(500);
  });
});
