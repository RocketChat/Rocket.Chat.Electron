export const whenReady = (): Promise<void> =>
  new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
      return;
    }

    const handleReadyStateChange = (): void => {
      if (document.readyState !== 'complete') {
        return;
      }

      document.removeEventListener('readystatechange', handleReadyStateChange);
      resolve();
    };

    document.addEventListener('readystatechange', handleReadyStateChange);
  });
