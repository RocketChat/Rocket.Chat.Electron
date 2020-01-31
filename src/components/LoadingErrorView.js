import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

export function LoadingErrorView({
	counting,
	reloading,
	visible,
	onReload,
}) {
	const { t } = useTranslation();

	const [root] = useState(() => {
		const root = document.createElement('div');
		document.body.append(root);
		return root;
	});

	const [counter, setCounter] = useState(60);

	useEffect(() => {
		if (!counting) {
			return;
		}

		setCounter(60);

		const reloadCounterStepSize = 1;
		const timer = setInterval(() => {
			setCounter((counter) => {
				counter -= reloadCounterStepSize;

				if (counter <= 0) {
					onReload && onReload();
					return 60;
				}

				return counter;
			});
		}, reloadCounterStepSize * 1000);

		return () => {
			clearInterval(timer);
		};
	}, [counting]);

	const handleReloadButtonClick = () => {
		onReload && onReload();
	};

	root.classList.add('webview');
	root.classList.add('loading-error-view');
	root.classList.toggle('active', visible);
	while (root.firstChild) {
		root.firstChild.remove();
	}
	root.append(document.importNode(document.querySelector('.loading-error-template').content, true));

	root.querySelector('.title').innerText = t('loadingError.announcement');

	root.querySelector('.subtitle').innerText = t('loadingError.title');

	root.querySelector('.reload-button').innerText = `${ t('loadingError.reload') } (${ counter })`;
	root.querySelector('.reload-button').classList.toggle('hidden', reloading);
	root.querySelector('.reload-button').onclick = handleReloadButtonClick;

	root.querySelector('.reloading-server').classList.toggle('hidden', !reloading);

	return null;
}
