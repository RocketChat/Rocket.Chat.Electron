import type { Server } from '../common/types/Server';

export const resolveStyle = async (
  backgroundUrl: string | undefined
): Promise<Server['style']> => {
  const element = document.createElement('div');
  element.classList.add('sidebar');
  element.style.backgroundColor = 'var(--sidebar-background)';
  element.style.color = 'var(--sidebar-item-text-color)';
  element.style.display = 'none';
  element.style.backgroundImage = backgroundUrl
    ? `url(${JSON.stringify(backgroundUrl)})`
    : 'none';

  document.body.appendChild(element);
  const { background, color } = window.getComputedStyle(element);

  if (typeof backgroundUrl === 'string') {
    await new Promise<void>((resolve, reject) => {
      const image = document.createElement('img');

      image.src = backgroundUrl;

      image.addEventListener(
        'load',
        () => {
          resolve();
        },
        {
          passive: true,
          once: true,
        }
      );

      image.addEventListener(
        'error',
        (event) => {
          reject(event.error);
        },
        { passive: true, once: true }
      );
    });
  }

  document.body.removeChild(element);

  return {
    background,
    color,
  };
};
