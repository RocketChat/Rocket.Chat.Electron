import { cloneElement, useLayoutEffect, useRef, useState } from 'react';

export const useElementRefValue = (element) => {
	const [value, setValue] = useState(null);
	const ref = useRef();
	const clonedElement = !!element && cloneElement(element, { ref });

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useLayoutEffect(() => {
		setValue((value) => {
			const newValue = ref.current;
			return Object.is(value, newValue) ? value : newValue;
		});
	});

	return [value, clonedElement];
};
