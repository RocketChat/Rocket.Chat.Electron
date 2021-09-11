import { useMergedRefs } from '@rocket.chat/fuselage-hooks';
import React, {
  useLayoutEffect,
  useRef,
  forwardRef,
  ReactElement,
  ReactNode,
  Key,
} from 'react';
import { createPortal } from 'react-dom';
import flattenChildren from 'react-keyed-flatten-children';

type ReparentingContainerProps = {
  children?: ReactNode;
};

export const ReparentingContainer = forwardRef<
  HTMLDivElement,
  ReparentingContainerProps
>(function ReparentingContainer({ children, ...props }, ref) {
  const innerRef = useRef<HTMLDivElement>(null);

  const childrenArray = flattenChildren(children) as ReactElement[];

  const prevChildrenArrayRef = useRef<ReactElement[]>([]);
  useLayoutEffect(() => {
    prevChildrenArrayRef.current = childrenArray;
  }, [childrenArray]);

  const prevKeys = prevChildrenArrayRef.current.map((child) => child.key);
  const keys = childrenArray.map((child) => child.key);

  const childrenAdded = childrenArray.filter(
    (child) => !prevKeys.includes(child.key)
  );
  const childrenKept = childrenArray.filter((child) =>
    prevKeys.includes(child.key)
  );
  const childrenRemoved = prevChildrenArrayRef.current.filter(
    (child) => !keys.includes(child.key)
  );

  const nodesRef = useRef(new Map<Key, Element>());

  const portals = [
    ...childrenKept.map((child) => {
      const element = child.key ? nodesRef.current.get(child.key) : undefined;
      return element ? createPortal(child, element, String(child.key)) : null;
    }),
    ...childrenAdded.map((child) => {
      if (!child.key) {
        return null;
      }

      const node = document.createElement('div');
      nodesRef.current.set(child.key, node);
      return createPortal(child, node, String(child.key));
    }),
  ];

  useLayoutEffect(() => {
    if (!innerRef.current) {
      return;
    }

    for (const child of childrenAdded) {
      if (!child.key) {
        continue;
      }

      const node = nodesRef.current.get(child.key);

      if (!node) {
        continue;
      }

      for (const { name, value } of Array.from(innerRef.current.attributes)) {
        node.setAttribute(name, value);
      }
      node.toggleAttribute('data-container', true);
      innerRef.current.parentElement?.insertBefore(node, innerRef.current);
    }
  }, [childrenAdded]);

  useLayoutEffect(() => {
    setTimeout(() => {
      for (const child of childrenRemoved) {
        if (!child.key) {
          continue;
        }

        nodesRef.current.get(child.key)?.remove();
        nodesRef.current.delete(child.key);
      }
    }, 1000);
  }, [childrenRemoved]);

  useLayoutEffect(
    () => () => {
      setTimeout(() => {
        nodesRef.current.forEach((node) => {
          node.remove();
        });
        nodesRef.current.clear();
      }, 1000);
    },
    []
  );

  const mergedRef = useMergedRefs(ref, innerRef);

  return (
    <>
      <div ref={mergedRef} {...props} />
      {portals}
    </>
  );
});
