export const AT_BOTTOM_SLACK_PX = 10;
export const USER_SCROLL_TIMEOUT_MS = 300;

const EMOJI_STYLE_ID = 'rcx-custom-emoji-intrinsic-sizing';

const followingBottomState = new WeakMap<HTMLElement, boolean>();

let isUserInitiatedScroll = false;
let userScrollTimer: ReturnType<typeof setTimeout> | undefined;

export const markUserInitiatedScroll = (): void => {
  isUserInitiatedScroll = true;
  if (userScrollTimer) {
    clearTimeout(userScrollTimer);
  }
  userScrollTimer = setTimeout(() => {
    isUserInitiatedScroll = false;
    userScrollTimer = undefined;
  }, USER_SCROLL_TIMEOUT_MS);
};

export const resetUserInitiatedScroll = (): void => {
  isUserInitiatedScroll = false;
  if (userScrollTimer) {
    clearTimeout(userScrollTimer);
    userScrollTimer = undefined;
  }
};

export const setFollowingBottom = (
  container: HTMLElement,
  isFollowing: boolean
): void => {
  followingBottomState.set(container, isFollowing);
};

export const getFollowingBottom = (
  container: HTMLElement
): boolean | undefined => followingBottomState.get(container);

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

export const handleScroll = (event: Event): void => {
  const { target } = event;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const distance = target.scrollHeight - target.scrollTop - target.clientHeight;

  if (distance <= AT_BOTTOM_SLACK_PX) {
    // Reaching the bottom (either by user scroll, jump-to-bottom click, or initial mount)
    // always establishes the following-bottom state.
    followingBottomState.set(target, true);
  } else if (isUserInitiatedScroll) {
    // Only user-initiated actions (wheel, touch, keys) can disable bottom-following.
    // Programmatic scrolls or layout expansions before image loads do not overwrite the state.
    followingBottomState.set(target, false);
  }
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
    img.rcx-message__emoji,
    .rcx-message img[src*="/emoji-custom/"],
    .rcx-message img[src*="emoji"] {
      width: 1.5em;
      height: 1.5em;
      aspect-ratio: 1 / 1;
      display: inline-block;
      object-fit: contain;
      vertical-align: middle;
      contain: size layout;
      contain-intrinsic-size: 1.5em 1.5em;
    }
    .rcx-message__emoji--big,
    img.rcx-message__emoji--big {
      width: 2.75em;
      height: 2.75em;
      aspect-ratio: 1 / 1;
      contain: size layout;
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

  const distance =
    scrollContainer.scrollHeight -
    scrollContainer.scrollTop -
    scrollContainer.clientHeight;

  // Use recorded following state if present; otherwise check if currently at bottom.
  const isFollowing =
    followingBottomState.get(scrollContainer) ?? distance <= AT_BOTTOM_SLACK_PX;

  if (isFollowing) {
    scrollContainer.scrollTop =
      scrollContainer.scrollHeight - scrollContainer.clientHeight;
    followingBottomState.set(scrollContainer, true);
  }
};

export const listenToMessageScrollEvents = (): (() => void) => {
  injectEmojiSizingStyles();

  const handleWheel = (): void => markUserInitiatedScroll();
  const handleTouch = (): void => markUserInitiatedScroll();
  const handlePointerDown = (): void => markUserInitiatedScroll();
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (
      [
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' ',
      ].includes(event.key)
    ) {
      markUserInitiatedScroll();
    }
  };

  document.addEventListener('load', handleImageLoad, true);
  document.addEventListener('scroll', handleScroll, true);
  document.addEventListener('wheel', handleWheel, {
    passive: true,
    capture: true,
  });
  document.addEventListener('touchmove', handleTouch, {
    passive: true,
    capture: true,
  });
  document.addEventListener('pointerdown', handlePointerDown, {
    passive: true,
    capture: true,
  });
  document.addEventListener('keydown', handleKeyDown, true);

  return () => {
    document.removeEventListener('load', handleImageLoad, true);
    document.removeEventListener('scroll', handleScroll, true);
    document.removeEventListener('wheel', handleWheel, true);
    document.removeEventListener('touchmove', handleTouch, true);
    document.removeEventListener('pointerdown', handlePointerDown, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    document.getElementById(EMOJI_STYLE_ID)?.remove();
    resetUserInitiatedScroll();
  };
};
