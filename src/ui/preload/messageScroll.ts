export const BOTTOM_SCROLL_THRESHOLD_PX = 80;

const EMOJI_STYLE_ID = 'rcx-custom-emoji-intrinsic-sizing';

const getScrollableParent = (element: HTMLElement): HTMLElement | null => {
  let current: HTMLElement | null = element.parentElement;

  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    const isMessageList =
      current.hasAttribute('data-qa') &&
      current.getAttribute('data-qa')?.includes('message-list');
    const isMessagesBox = current.classList.contains('messages-box');

    if (isMessageList || isMessagesBox) {
      return current;
    }

    try {
      const style = window.getComputedStyle?.(current);
      if (
        style &&
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        current.scrollHeight > current.clientHeight
      ) {
        return current;
      }
    } catch {
      // Fallback if computed style is unavailable in the environment
      if (current.scrollHeight > current.clientHeight) {
        return current;
      }
    }

    current = current.parentElement;
  }

  return null;
};

const isNearBottom = (
  container: HTMLElement,
  threshold = BOTTOM_SCROLL_THRESHOLD_PX
): boolean => {
  const distanceToBottom =
    container.scrollHeight - container.scrollTop - container.clientHeight;
  return distanceToBottom <= threshold;
};

export const injectEmojiSizingStyles = (): void => {
  if (typeof document === 'undefined') {
    return;
  }

  if (document.getElementById(EMOJI_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = EMOJI_STYLE_ID;
  style.textContent = `
    .rcx-message__emoji,
    .rcx-message__emoji--big,
    img.rcx-message__emoji,
    .rcx-message img[src*="/emoji-custom/"],
    .rcx-message img[src*="emoji"] {
      aspect-ratio: 1 / 1;
      display: inline-block;
      contain-intrinsic-size: 1.5em 1.5em;
    }
    .rcx-message__emoji--big,
    img.rcx-message__emoji--big {
      contain-intrinsic-size: 2.75em 2.75em;
    }
  `;

  const target = document.head || document.documentElement;
  target?.appendChild(style);
};

export const handleImageLoad = (event: Event): void => {
  const { target } = event;
  if (!(target instanceof HTMLElement) || target.tagName !== 'IMG') {
    return;
  }

  const isCustomEmoji =
    target.classList.contains('rcx-message__emoji') ||
    target.classList.contains('rcx-message__emoji--big') ||
    target.getAttribute('src')?.includes('emoji');

  const isInsideMessage =
    Boolean(target.closest?.('.rcx-message, [data-qa="message"]')) ||
    isCustomEmoji;

  if (!isInsideMessage) {
    return;
  }

  const scrollContainer = getScrollableParent(target);
  if (!scrollContainer) {
    return;
  }

  if (isNearBottom(scrollContainer)) {
    scrollContainer.scrollTop =
      scrollContainer.scrollHeight - scrollContainer.clientHeight;
  }
};

export const listenToMessageScrollEvents = (): (() => void) => {
  injectEmojiSizingStyles();

  document.addEventListener('load', handleImageLoad, true);

  return () => {
    document.removeEventListener('load', handleImageLoad, true);
    document.getElementById(EMOJI_STYLE_ID)?.remove();
  };
};
