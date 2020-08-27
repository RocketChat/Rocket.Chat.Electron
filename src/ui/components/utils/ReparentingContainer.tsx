import { useMergedRefs } from '@rocket.chat/fuselage-hooks';
import React, { useLayoutEffect, useRef, forwardRef, ReactElement, ReactText, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import flattenChildren from 'react-keyed-flatten-children';

type ReparentingContainerProps = {
  children?: ReactNode;
};

export const ReparentingContainer = forwardRef<HTMLDivElement, ReparentingContainerProps>(function ReparentingContainer({ children, ...props }, ref) {
  const innerRef = useRef<HTMLDivElement>();

  const childrenArray = flattenChildren(children) as ReactElement[];

  const prevChildrenArrayRef = useRef<ReactElement[]>([]);
  useLayoutEffect(() => {
    prevChildrenArrayRef.current = childrenArray;
  }, [childrenArray]);

  const prevKeys = prevChildrenArrayRef.current.map((child) => child.key);
  const keys = childrenArray.map((child) => child.key);

  const childrenAdded = childrenArray.filter((child) => !prevKeys.includes(child.key));
  const childrenKept = childrenArray.filter((child) => prevKeys.includes(child.key));
  const childrenRemoved = prevChildrenArrayRef.current.filter((child) => !keys.includes(child.key));

  const nodesRef = useRef(new Map<ReactText, Element>());

  const portals = [
    ...childrenKept.map((child) => createPortal(child, nodesRef.current.get(child.key), String(child.key))),
    ...childrenAdded.map((child) => {
      const node = document.createElement('div');
      nodesRef.current.set(child.key, node);
      return createPortal(child, node, String(child.key));
    }),
  ];

  useLayoutEffect(() => {
    childrenAdded.forEach((child) => {
      const node = nodesRef.current.get(child.key);
      for (const { name, value } of Array.from(innerRef.current.attributes)) {
        node.setAttribute(name, value);
      }
      node.toggleAttribute('data-container', true);
      innerRef.current.parentElement.insertBefore(node, innerRef.current);
    });
  }, [childrenAdded]);

  useLayoutEffect(() => {
    setTimeout(() => {
      childrenRemoved.forEach((child) => {
        nodesRef.current.get(child.key).remove();
        nodesRef.current.delete(child.key);
      });
    }, 1000);
  }, [childrenRemoved]);

  useLayoutEffect(() => () => {
    setTimeout(() => {
      nodesRef.current.forEach((node) => {
        node.remove();
      });
      nodesRef.current.clear();
    }, 1000);
  }, []);

  const mergedRef = useMergedRefs(ref, innerRef);

  return <>
    <div ref={mergedRef} {...props} />
    {portals}
  </>;
});
