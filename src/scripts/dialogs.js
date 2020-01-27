import { createElement } from './reactiveUi.js';

const dialogs = {};

export const createDialog = async ({ name, component, createProps }) => {
	if (dialogs[name]) {
		return;
	}

	const root = document.querySelector(`.${ name }`);

	const element = createElement(component, { ...await createProps(), root });

	element.mount(root);

	root.showModal();

	root.onclose = () => {
		root.close();
		element.unmount();
		delete dialogs[name];
	};

	root.onclick = ({ clientX, clientY }) => {
		const { left, top, width, height } = root.getBoundingClientRect();
		const isInDialog = top <= clientY && clientY <= top + height && left <= clientX && clientX <= left + width;
		if (!isInDialog) {
			root.close();
		}
	};

	dialogs[name] = element;
};

export const destroyDialog = (name) => {
	if (!dialogs[name]) {
		return;
	}

	dialogs[name].root.close();
};
