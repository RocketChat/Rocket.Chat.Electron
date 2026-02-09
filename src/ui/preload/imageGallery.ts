export const setupImageGalleryZoom = (): void => {
  let lastZoomTime = 0;
  const ZOOM_COOLDOWN = 200; // more = less zoom speed

  window.addEventListener(
    'wheel',
    (event) => {
      const target = event.target as HTMLElement;
      const zoomContainer = target.closest('.swiper-zoom-container');

      if (!zoomContainer) {
        return;
      }

      const gallery = zoomContainer.closest('.image-gallery');
      if (!gallery) {
        return;
      }

      const now = Date.now();
      if (now - lastZoomTime < ZOOM_COOLDOWN) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const zoomInBtn = gallery.querySelector(
        'button[name="zoom-in"]'
      ) as HTMLButtonElement;
      const zoomOutBtn = gallery.querySelector(
        'button[name="zoom-out"]'
      ) as HTMLButtonElement;

      if (!zoomInBtn || !zoomOutBtn) {
        return;
      }

      let handled = false;

      if (event.deltaY < 0) {
        if (!zoomInBtn.disabled) {
          zoomInBtn.click();
          handled = true;
        }
      } else if (event.deltaY > 0) {
        if (!zoomOutBtn.disabled) {
          zoomOutBtn.click();
          handled = true;
        }
      }

      if (handled) {
        lastZoomTime = now;
        event.preventDefault();
        event.stopPropagation();
      }
    },
    { passive: false, capture: true }
  );
};
