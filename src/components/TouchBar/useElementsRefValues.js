import { Children, cloneElement, createRef, useLayoutEffect, useRef, useState } from 'react';

const isEachElementTheSame = (a, b) => {
	if (a.length !== b.length) {
		return false;
	}

	return Array.from({ length: a.length }).every((_, i) => Object.is(a[i], b[i]));
};

export const useElementsRefValues = (elements) => {
	const [values, setValues] = useState([]);
	const refs = useRef(Array.from({ length: Children.count(elements) }, () => createRef()));
	refs.current = Array.from({ length: Children.count(elements) }, (_, i) => refs.current[i]);
	const clonedElements = Children.map(elements, (element, i) => !!element && cloneElement(element, { ref: refs.current[i] }));

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useLayoutEffect(() => {
		setValues((values) => {
			const newValues = refs.current.map((ref) => ref.current);
			return isEachElementTheSame(values, newValues) ? values : newValues;
		});
	});

	return [values, clonedElements];
};
