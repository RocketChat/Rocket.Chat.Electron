const elements = [];

const commit = (element) => {
	elements.unshift(element);

	element.hookIndex = 0;

	const previouslyRendered = element.rendered;
	element.rendered = element.render(element.props);

	if (previouslyRendered && element.rendered) {
		element.rendered.root = previouslyRendered.root;
		element.rendered.hooks = previouslyRendered.hooks;
		commit(element.rendered);
	} else if (!previouslyRendered && element.rendered) {
		element.rendered.mount(element.root);
	} else if (previouslyRendered && !element.rendered) {
		previouslyRendered.unmount();
	}

	element.hooks.filter(({ fn }) => !!fn).forEach((hook) => {
		const { fn, deps, prevDeps, cleanUp } = hook;

		const depsChanged = !Array.isArray(deps)
				|| !Array.isArray(prevDeps)
				|| deps.some((_, i) => deps[i] !== prevDeps[i]);

		if (!depsChanged) {
			return;
		}

		if (typeof cleanUp === 'function') {
			cleanUp();
		}
		hook.cleanUp = fn();
	});

	elements.shift();
};

export const createElement = (render, initialProps = {}) => {
	const element = {
		render,
		props: { ...initialProps },
		root: null,
		rendered: null,
		hooks: [],
		hookIndex: 0,
		mount: (root) => {
			if (element.root) {
				element.unmount();
			}

			element.root = root;
			commit(element);
		},
		update: (newProps = {}) => {
			element.props = { ...element.props, ...newProps };
			commit(element);
		},
		unmount: () => {
			if (!element.root) {
				return;
			}

			if (element.rendered) {
				element.rendered.unmount();
			}

			element.hooks.filter(({ cleanUp }) => typeof cleanUp === 'function').forEach(({ cleanUp }) => cleanUp());
			element.root = null;
		},
	};

	return element;
};

export const cloneElement = ({ render, props }, additionalProps = {}) =>
	createElement(render, { ...props, ...additionalProps });

const getCurrentElement = () => elements[0];

const getCurrentHook = () => {
	const element = getCurrentElement();
	return element.hooks[element.hookIndex];
};

const setCurrentHook = (hook) => {
	const element = getCurrentElement();
	element.hooks[element.hookIndex] = hook;
	++element.hookIndex;
};

export const useRoot = () => getCurrentElement().root;

export const useRef = (initialValue) => {
	let hook = getCurrentHook();

	if (!hook) {
		hook = { current: initialValue };
	}

	setCurrentHook(hook);

	return hook;
};

export const useEffect = (fn, deps) => {
	let hook = getCurrentHook();

	if (hook) {
		[hook.fn, hook.deps, hook.prevDeps] = [fn, deps, hook.deps];
	} else {
		hook = { fn, deps };
	}

	setCurrentHook(hook);
};

export const useState = (initialValue) => {
	const element = getCurrentElement();
	let hook = getCurrentHook();

	if (!hook) {
		hook = [
			typeof initialValue === 'function' ? initialValue() : initialValue,
			(newValue) => {
				hook[0] = typeof newValue === 'function' ? newValue(hook[0]) : newValue;
				clearTimeout(element.renderTimer);
				element.renderTimer = setTimeout(() => element.update(), 0);
			},
		];
	}

	setCurrentHook(hook);

	return hook;
};
