import { MutableRefObject, useRef } from 'react';

export const useInitRef = <T>(
  init: () => NonNullable<T>
): MutableRefObject<NonNullable<T>> => {
  const ref = useRef<NonNullable<T>>();
  if (ref.current === undefined) {
    ref.current = init();
  }

  return ref as MutableRefObject<NonNullable<T>>;
};
