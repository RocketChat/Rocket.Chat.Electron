import { Children, cloneElement, createRef, useLayoutEffect, useRef, useState } from 'react';

const isEachElementTheSame = (a, b) => {
	if (a.length !== b.length) {
		return false;
	}

	return Array.from({ length: a.length }).every((_, i) => Object.is(a[i], b[i]));
};

const toArray = (elements) => [].concat(...Children.toArray(elements).map((element) => {
	if (!element.type.render) {
		return toArray(element.props.children);
	}

	return element;
}));

export const useElementsRefValues = (elements) => {
	elements = toArray(elements);

	const [values, setValues] = useState([]);
	const refs = useRef(Array.from({ length: elements.length }, () => createRef()));
	refs.current = Array.from({ length: elements.length }, (_, i) => refs.current[i]);
	const clonedElements = elements.map((element, i) => !!element && cloneElement(element, { key: i, ref: refs.current[i] }));

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useLayoutEffect(() => {
		setValues((values) => {
			const newValues = refs.current.map((ref) => ref.current);
			return isEachElementTheSame(values, newValues) ? values : newValues;
		});
	});

	return [values, clonedElements];
};
