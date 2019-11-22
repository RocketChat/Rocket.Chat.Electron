import { createElement } from './reactiveUi.js';

const dialogs = {};

export const createDialog = async ({ name, component, createProps }) => {
	if (dialogs[name]) {
		return;
	}

	const element = createElement(component, await createProps());

	element.mount(document.querySelector(`.${ name }`));

	element.root.showModal();

	element.root.onclose = () => {
		element.root.close();
		element.unmount();
		delete dialogs[name];
	};

	element.root.onclick = ({ clientX, clientY }) => {
		const { left, top, width, height } = element.root.getBoundingClientRect();
		const isInDialog = top <= clientY && clientY <= top + height && left <= clientX && clientX <= left + width;
		if (!isInDialog) {
			element.root.close();
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
