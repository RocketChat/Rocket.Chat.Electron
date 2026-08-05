import { useMergedRefs } from '@rocket.chat/fuselage-hooks';
import type { ReactElement, ReactNode } from 'react';
import { useLayoutEffect, useRef, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import flattenChildren from 'react-keyed-flatten-children';

type ReparentingContainerProps = {
  children?: ReactNode;
};

const joinKeys = (keys: string[]): string => JSON.stringify(keys);

const splitKeys = (joinedKeys: string): string[] =>
  joinedKeys === '' ? [] : JSON.parse(joinedKeys);

export const ReparentingContainer = forwardRef<
  HTMLDivElement,
  ReparentingContainerProps
>(function ReparentingContainer({ children, ...props }, ref) {
  const innerRef = useRef<HTMLDivElement>(null);

  const keyedChildren = (
    flattenChildren(children) as ReactElement<any>[]
  ).filter((child): child is ReactElement<any> & { key: string } =>
    Boolean(child.key)
  );

  const prevKeysRef = useRef<string[]>([]);
  const prevKeys = prevKeysRef.current;
  const keys = keyedChildren.map((child) => child.key);

  const childrenAdded = keyedChildren.filter(
    (child) => !prevKeys.includes(child.key)
  );
  const childrenKept = keyedChildren.filter((child) =>
    prevKeys.includes(child.key)
  );

  const keysJoined = joinKeys(keys);
  const addedKeysJoined = joinKeys(childrenAdded.map((child) => child.key));
  const removedKeysJoined = joinKeys(
    prevKeys.filter((key) => !keys.includes(key))
  );

  useLayoutEffect(() => {
    prevKeysRef.current = splitKeys(keysJoined);
  }, [keysJoined]);

  const nodesRef = useRef(new Map<string, Element>());

  const portals = [
    ...childrenKept.map((child) => {
      const element = nodesRef.current.get(child.key);
      return element ? createPortal(child, element, String(child.key)) : null;
    }),
    ...childrenAdded.map((child) => {
      const node = document.createElement('div');
      nodesRef.current.set(child.key, node);
      return createPortal(child, node, String(child.key));
    }),
  ];

  useLayoutEffect(() => {
    if (!innerRef.current) {
      return;
    }

    for (const key of splitKeys(addedKeysJoined)) {
      const node = nodesRef.current.get(key);

      if (!node) {
        continue;
      }

      for (const { name, value } of Array.from(innerRef.current.attributes)) {
        node.setAttribute(name, value);
      }
      node.toggleAttribute('data-container', true);
      innerRef.current.parentElement?.insertBefore(node, innerRef.current);
    }
  }, [addedKeysJoined]);

  useLayoutEffect(() => {
    const removedKeys = splitKeys(removedKeysJoined);

    if (removedKeys.length === 0) {
      return;
    }

    setTimeout(() => {
      for (const key of removedKeys) {
        nodesRef.current.get(key)?.remove();
        nodesRef.current.delete(key);
      }
    }, 1000);
  }, [removedKeysJoined]);

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
