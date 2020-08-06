export const whenReady = (): Promise<void> => new Promise((resolve) => {
	if (document.readyState !== 'loading') {
		resolve();
		return;
	}

	const handleReadyStateChange = (): void => {
		if (document.readyState === 'loading') {
			return;
		}

		document.removeEventListener('readystatechange', handleReadyStateChange);
		resolve();
	};

	document.addEventListener('readystatechange', handleReadyStateChange);
});
